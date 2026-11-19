import { app, BrowserWindow, ipcMain, screen, session, desktopCapturer, webContents } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseService } from '../database/db';
import { FloatingWindowManager } from './floating-window-manager';
import { registerIpcHandlers } from '../ipc/handlers';
import { ShortcutManager } from './shortcuts';
import { createSystemTray } from './tray';
import { Win32WindowEmbedder } from '../native/windows/win32-embed';
import { LoggerService } from '../services/logger.service';
import { IPC_CHANNELS } from '../ipc/channels';

// Allow getDisplayMedia without user gesture in floating monitors
app.commandLine.appendSwitch('disable-features', 'DisplayMediaRequiresUserAction');

const logger = LoggerService.getInstance();
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    logger.info('Main', 'Electron app ready, starting Float-Space');

    // Show sleek native splash screen during startup initialization
    createSplashWindow();

    // Grant screen capture and media permissions for desktopCapturer
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(true);
    });
    session.defaultSession.setPermissionCheckHandler(() => true);
    session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
      try {
        let senderWebContents: Electron.WebContents | undefined;
        if (request.frame) {
          try {
            senderWebContents = (webContents as any).fromFrame?.(request.frame);
          } catch {}
        }
        if (!senderWebContents && request.frame) {
          const allWins = BrowserWindow.getAllWindows();
          const found = allWins.find((w) => {
            try {
              return w.webContents.mainFrame === request.frame;
            } catch {
              return false;
            }
          });
          if (found) senderWebContents = found.webContents;
        }

        // Extract windowId from query params in frame URL
        let windowId: string | undefined;
        const frameUrl = request.frame?.url || '';
        const match = frameUrl.match(/windowId=([^&]+)/);
        if (match) {
          windowId = decodeURIComponent(match[1]);
        }

        let targetInfo: { sourceId?: string; targetHwnd?: string; title?: string } | undefined;
        if (windowId) {
          const cfg = FloatingWindowManager.getInstance().getConfig(windowId);
          if (cfg) {
            targetInfo = {
              sourceId: cfg.sourceWindowId,
              targetHwnd: cfg.targetHwnd,
              title: cfg.title,
            };
          }
        }
        if (!targetInfo && senderWebContents) {
          targetInfo = FloatingWindowManager.getInstance().getTargetForWebContents(senderWebContents.id);
        }

        // Restore target application if minimized so DWM renders frames
        if (targetInfo?.targetHwnd && process.platform === 'win32') {
          await Win32WindowEmbedder.getInstance().focusWindow(targetInfo.targetHwnd).catch(() => {});
        }

        // STRICTLY query ONLY 'window' sources - NEVER 'screen'
        const sources = await desktopCapturer.getSources({ types: ['window'], fetchWindowIcons: true });

        let chosen: Electron.DesktopCapturerSource | undefined;
        // 1. Match by exact sourceId
        if (targetInfo?.sourceId) {
          chosen = sources.find((s) => s.id === targetInfo!.sourceId);
        }
        // 2. Match by exact HWND
        if (!chosen && targetInfo?.targetHwnd) {
          chosen = sources.find((s) => s.id.split(':')[1] === targetInfo!.targetHwnd);
        }
        // 3. Match by process ID & application ownership
        if (!chosen && (targetInfo?.targetHwnd || targetInfo?.title) && process.platform === 'win32') {
          for (const s of sources) {
            const sHwnd = s.id.split(':')[1];
            if (sHwnd) {
              const pInfo = await Win32WindowEmbedder.getInstance().getWindowProcessInfo(sHwnd);
              if (pInfo.success && pInfo.processName) {
                const targetTitleLower = (targetInfo.title || '').toLowerCase();
                const pNameLower = pInfo.processName.toLowerCase();
                // If process is PowerPoint, Notepad, Chrome, etc. matching title/process
                if (
                  targetTitleLower.includes(pNameLower) ||
                  (pNameLower.includes('powerpnt') && (targetTitleLower.includes('powerpoint') || targetTitleLower.includes('.ppt')))
                ) {
                  chosen = s;
                  break;
                }
              }
            }
          }
        }
        // 4. Match by tokenized title similarity
        if (!chosen && targetInfo?.title) {
          const cleanTokens = targetInfo.title
            .toLowerCase()
            .replace(/[_\-\.\[\]\(\)\+]/g, ' ')
            .split(/\s+/)
            .filter((t) => t.length > 2 && t !== 'last' && t !== 'saved' && t !== 'application');

          let bestScore = 0;
          let bestSource: Electron.DesktopCapturerSource | undefined;

          for (const s of sources) {
            const sLower = s.name.toLowerCase();
            let score = 0;
            for (const token of cleanTokens) {
              if (sLower.includes(token)) score++;
            }
            if (score > bestScore && score >= 1) {
              bestScore = score;
              bestSource = s;
            }
          }
          if (bestSource) chosen = bestSource;
        }

        // Strictly verify that chosen is the validated application window
        if (chosen && chosen.id.startsWith('window:')) {
          callback({ video: chosen });
        } else {
          // Validation failed or window unavailable: DO NOT return an unrelated window!
          callback({});
        }
      } catch (err) {
        callback({});
      }
    });

    // 1. Initialize SQLite Database
    const db = DatabaseService.getInstance();
    await db.initialize();

    // 2. Register IPC Handlers
    registerIpcHandlers();

    // 3. Create Main Dashboard Window
    createMainWindow();

    // 4. Register Shortcuts and Tray
    if (mainWindow) {
      ShortcutManager.getInstance().registerDefaults(mainWindow);
      createSystemTray(mainWindow);
      FloatingWindowManager.getInstance().setMainWindow(mainWindow);
    }

    // 5. Restore previous session if enabled in settings
    const settingRestore = db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'restorePreviousSession'");
    if (!settingRestore || settingRestore.value === 'true' || settingRestore.value === '1') {
      await FloatingWindowManager.getInstance().restoreSession();
    }

    // 6. Monitor display changes
    screen.on('display-added', () => broadcastDisplayChange());
    screen.on('display-removed', () => broadcastDisplayChange());
    screen.on('display-metrics-changed', () => broadcastDisplayChange());
  });

  app.on('window-all-closed', () => {
    // Keep running in tray on macOS/Windows if floating windows exist
    const hasMonitors = FloatingWindowManager.getInstance().getAllConfigs().some(c => c.isActive);
    if (!hasMonitors && process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (mainWindow === null) {
      createMainWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('before-quit', () => {
    if (process.platform === 'win32') {
      Win32WindowEmbedder.getInstance().detachAll();
    }
  });

  app.on('will-quit', () => {
    if (process.platform === 'win32') {
      Win32WindowEmbedder.getInstance().detachAll();
    }
    ShortcutManager.getInstance().unregisterAll();
    DatabaseService.getInstance().saveToDisk();
  });
}

function createSplashWindow(): void {
  const iconPath = path.join(__dirname, '../../build/icon.png');
  splashWindow = new BrowserWindow({
    width: 380,
    height: 280,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    show: true,
    transparent: true,
    backgroundColor: '#00000000',
    title: 'Float-Space',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const splashCandidates = [
    path.join(__dirname, 'splash.html'),
    path.join(__dirname, '../../electron/main/splash.html'),
  ];
  for (const p of splashCandidates) {
    if (fs.existsSync(p)) {
      splashWindow.loadFile(p);
      break;
    }
  }
}

function createMainWindow(): void {
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  const preloadPath = path.join(__dirname, '../preload/index.js');
  const iconPath = path.join(__dirname, '../../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1040,
    height: 700,
    minWidth: 800,
    minHeight: 560,
    frame: false,
    show: false,
    transparent: false,
    hasShadow: true,
    backgroundColor: '#F8F9FA',
    title: 'Float-Space',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const startTime = Date.now();
  mainWindow.once('ready-to-show', () => {
    const elapsed = Date.now() - startTime;
    const minSplashDuration = 800; // Smooth splash transition
    const remaining = Math.max(0, minSplashDuration - elapsed);

    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.destroy();
        splashWindow = null;
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, remaining);
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const rendererPath = path.join(__dirname, '../../renderer/index.html');
    mainWindow.loadFile(rendererPath);
  }

  // Window control IPC handlers
  ipcMain.handle(IPC_CHANNELS.SYSTEM_MINIMIZE_MAIN, () => {
    mainWindow?.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_MAXIMIZE_MAIN, () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_CLOSE_MAIN, () => {
    mainWindow?.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function broadcastDisplayChange(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_CHANNELS.DISPLAY_CHANGED);
  }
}
