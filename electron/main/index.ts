import { app, BrowserWindow, ipcMain, screen, session, desktopCapturer, webContents } from 'electron';
import * as path from 'path';
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
        if (targetInfo?.sourceId) {
          chosen = sources.find((s) => s.id === targetInfo!.sourceId);
        }
        if (!chosen && targetInfo?.targetHwnd) {
          chosen = sources.find((s) => s.id.split(':')[1] === targetInfo!.targetHwnd);
        }
        if (!chosen && targetInfo?.title) {
          const lower = targetInfo.title.toLowerCase().trim();
          chosen = sources.find((s) => {
            const sName = s.name.toLowerCase().trim();
            return sName === lower || sName.includes(lower) || lower.includes(sName);
          });
        }
        // Strictly verify that chosen is a WINDOW source, NEVER screen
        if (chosen && chosen.id.startsWith('window:')) {
          callback({ video: chosen });
        } else {
          // If no specific match, find the first available window (never a screen)
          const firstWindow = sources.find((s) => s.id.startsWith('window:'));
          if (firstWindow) {
            callback({ video: firstWindow });
          } else {
            callback({});
          }
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

  app.on('will-quit', () => {
    if (process.platform === 'win32') {
      Win32WindowEmbedder.getInstance().detachAll();
    }
    ShortcutManager.getInstance().unregisterAll();
    DatabaseService.getInstance().saveToDisk();
  });
}

function createMainWindow(): void {
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  const preloadPath = path.join(__dirname, '../preload/index.js');

  mainWindow = new BrowserWindow({
    width: 1040,
    height: 700,
    minWidth: 800,
    minHeight: 560,
    frame: false,
    transparent: true,
    hasShadow: true,
    backgroundColor: '#00000000',
    title: 'Float-Space',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
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
