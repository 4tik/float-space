import { app, BrowserWindow, ipcMain, screen } from 'electron';
import * as path from 'path';
import { DatabaseService } from '../database/db';
import { FloatingWindowManager } from './floating-window-manager';
import { registerIpcHandlers } from '../ipc/handlers';
import { ShortcutManager } from './shortcuts';
import { createSystemTray } from './tray';
import { LoggerService } from '../services/logger.service';
import { IPC_CHANNELS } from '../ipc/channels';

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
    logger.info('Main', 'Electron app ready, starting Floating Monitor');

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
    title: 'Floating Monitor',
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
