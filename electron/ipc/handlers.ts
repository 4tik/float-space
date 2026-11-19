import { ipcMain, shell, dialog } from 'electron';
import { IPC_CHANNELS } from './channels';
import { FloatingWindowManager } from '../main/floating-window-manager';
import { AppDiscoveryService } from '../services/app-discovery.service';
import { DisplayService } from '../services/display.service';
import { DatabaseService } from '../database/db';
import { SnapPosition } from '../../src/types/display';
import { LoggerService } from '../services/logger.service';
import { Win32WindowEmbedder } from '../native/windows/win32-embed';
import { VirtualDisplayService } from '../services/virtual-display.service';

export function registerIpcHandlers(): void {
  const windowManager = FloatingWindowManager.getInstance();
  const appDiscovery = AppDiscoveryService.getInstance();
  const displayService = DisplayService.getInstance();
  const db = DatabaseService.getInstance();
  const logger = LoggerService.getInstance();

  // Floating Windows
  ipcMain.handle(IPC_CHANNELS.WINDOW_CREATE, async (_, config) => {
    logger.info('IPC', `WINDOW_CREATE requested for: ${config?.title}`);
    return await windowManager.createWindow(config, true);
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_GET_ALL, () => {
    return windowManager.getAllConfigs();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, (_, id: string) => {
    windowManager.close(id);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, (_, id: string) => {
    windowManager.minimize(id);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, (_, id: string) => {
    windowManager.maximize(id);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_RESTORE, (_, id: string) => {
    windowManager.restore(id);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_SET_BOUNDS, (_, { id, bounds }) => {
    windowManager.setBounds(id, bounds);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_SET_OPACITY, (_, { id, opacity }) => {
    windowManager.setOpacity(id, opacity);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_SET_ALWAYS_ON_TOP, (_, { id, alwaysOnTop }) => {
    windowManager.setAlwaysOnTop(id, alwaysOnTop);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_SET_LOCKED, (_, { id, isLocked }) => {
    windowManager.setLocked(id, isLocked);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_SET_DISPLAY_MODE, async (_, { id, mode }) => {
    return await windowManager.setDisplayMode(id, mode);
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_DETACH, async (_, id: string) => {
    return await windowManager.detach(id);
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_FORWARD_INPUT, async (_, { targetHwnd, event }) => {
    if (!targetHwnd || targetHwnd === '0') return false;
    return await Win32WindowEmbedder.getInstance().forwardInput(targetHwnd, event);
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_HIDE_ALL, () => {
    windowManager.hideAll();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_SHOW_ALL, () => {
    windowManager.showAll();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_SNAP, (_, { id, snap, displayId }: { id: string; snap: SnapPosition; displayId?: number }) => {
    const snapBounds = displayService.calculateSnapBounds(snap, displayId);
    windowManager.setBounds(id, snapBounds);
    return snapBounds;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_AUTO_ARRANGE, (_, { workspaceId, displayId }) => {
    windowManager.autoArrange(workspaceId, displayId);
    return true;
  });

  // Displays
  ipcMain.handle(IPC_CHANNELS.DISPLAY_GET_ALL, () => {
    const displays = displayService.getAllDisplays();
    db.displays.saveAll(displays);
    db.saveToDisk();
    return displays;
  });

  // Virtual Extended Monitor Subsystem
  const virtualDisplayService = VirtualDisplayService.getInstance();

  ipcMain.handle(IPC_CHANNELS.VIRTUAL_DISPLAY_GET_STATUS, async () => {
    return await virtualDisplayService.getStatus();
  });

  ipcMain.handle(IPC_CHANNELS.VIRTUAL_DISPLAY_CREATE, async (_, { width, height }: { width?: number; height?: number } = {}) => {
    return await virtualDisplayService.createVirtualDisplay(width, height);
  });

  ipcMain.handle(IPC_CHANNELS.VIRTUAL_DISPLAY_ENABLE, async () => {
    return await virtualDisplayService.enableVirtualDisplay();
  });

  ipcMain.handle(IPC_CHANNELS.VIRTUAL_DISPLAY_DISABLE, async () => {
    return await virtualDisplayService.disableVirtualDisplay();
  });

  ipcMain.handle(IPC_CHANNELS.VIRTUAL_DISPLAY_SET_RESOLUTION, async (_, { width, height }: { width: number; height: number }) => {
    return await virtualDisplayService.setTargetResolution(width, height);
  });

  ipcMain.handle(IPC_CHANNELS.VIRTUAL_DISPLAY_MOVE_APP, async (_, { hwnd, title, appName, processId, maximize }) => {
    return await virtualDisplayService.moveAppToVirtual(hwnd, { title, appName, processId, maximize });
  });

  ipcMain.handle(IPC_CHANNELS.VIRTUAL_DISPLAY_RETURN_APP, async (_, hwnd: string) => {
    return await virtualDisplayService.returnAppToPrimary(hwnd);
  });

  ipcMain.handle(IPC_CHANNELS.VIRTUAL_DISPLAY_GET_APPS, () => {
    return virtualDisplayService.getAppsOnVirtual();
  });

  ipcMain.handle(IPC_CHANNELS.VIRTUAL_DISPLAY_GET_SOURCE_ID, async () => {
    return await virtualDisplayService.getVirtualDisplaySourceId();
  });

  ipcMain.handle(IPC_CHANNELS.VIRTUAL_DISPLAY_LAUNCH, async () => {
    const sourceId = await virtualDisplayService.getVirtualDisplaySourceId();
    return await windowManager.createWindow({
      title: 'Virtual Extended Display (Display 2)',
      displayMode: 'virtual-display',
      sourceWindowId: sourceId || undefined,
      width: 720,
      height: 440,
      alwaysOnTop: true,
      opacity: 1.0,
    }, true);
  });

  ipcMain.handle(IPC_CHANNELS.VIRTUAL_DISPLAY_FORWARD_INPUT, async (_, event) => {
    return await virtualDisplayService.forwardVirtualInput(event);
  });

  // Applications
  ipcMain.handle(IPC_CHANNELS.APP_GET_INSTALLED, async () => {
    const apps = await appDiscovery.getInstalledApplications();
    for (const app of apps) {
      db.applications.upsert(app);
    }
    db.saveToDisk();
    return apps;
  });

  ipcMain.handle(IPC_CHANNELS.APP_GET_RUNNING_WINDOWS, async () => {
    return await appDiscovery.getRunningWindows();
  });

  ipcMain.handle(IPC_CHANNELS.APP_LAUNCH, async (_, executablePath: string) => {
    return await appDiscovery.launchApplication(executablePath);
  });

  ipcMain.handle(IPC_CHANNELS.APP_FOCUS, async (_, { windowId, processId }: { windowId: string; processId?: number }) => {
    return await appDiscovery.focusWindow(windowId, processId);
  });

  // Workspaces
  ipcMain.handle(IPC_CHANNELS.WORKSPACE_GET_ALL, () => {
    return db.workspaces.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_SAVE, (_, ws) => {
    db.workspaces.upsert(ws);
    db.saveToDisk();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_DELETE, (_, id: string) => {
    db.workspaces.delete(id);
    db.saveToDisk();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_SWITCH, (_, workspaceId: string) => {
    windowManager.filterByWorkspace(workspaceId);
    return true;
  });

  // Groups
  ipcMain.handle(IPC_CHANNELS.GROUP_GET_ALL, () => {
    return db.workspaces.getGroups();
  });

  ipcMain.handle(IPC_CHANNELS.GROUP_SAVE, (_, grp) => {
    db.workspaces.upsertGroup(grp);
    db.saveToDisk();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.GROUP_DELETE, (_, id: string) => {
    db.workspaces.deleteGroup(id);
    db.saveToDisk();
    return true;
  });

  // Layouts
  ipcMain.handle(IPC_CHANNELS.LAYOUT_GET_ALL, () => {
    return db.layouts.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.LAYOUT_SAVE, (_, layout) => {
    db.layouts.upsert(layout);
    db.saveToDisk();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.LAYOUT_DELETE, (_, id: string) => {
    db.layouts.delete(id);
    db.saveToDisk();
    return true;
  });

  // Profiles
  ipcMain.handle(IPC_CHANNELS.PROFILE_GET_ALL, () => {
    return db.profiles.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_SAVE, (_, profile) => {
    db.profiles.upsert(profile);
    db.saveToDisk();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_APPLY, async (_, profileId: string) => {
    const monitors = db.profiles.getMonitorsForProfile(profileId);
    for (const conf of monitors) {
      try {
        await windowManager.createWindow(conf, true);
      } catch (err) {
        logger.error('IPC', 'Failed to apply profile window', err);
      }
    }
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_DELETE, (_, id: string) => {
    db.profiles.delete(id);
    db.saveToDisk();
    return true;
  });

  // Settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return db.settings.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE, (_, settings: Record<string, any>) => {
    db.settings.setMany(settings);
    db.saveToDisk();
    return true;
  });

  // Database Management (FloatDesk Local Database Architecture)
  ipcMain.handle(IPC_CHANNELS.DB_GET_INFO, () => {
    return db.getDatabaseInfo();
  });

  ipcMain.handle(IPC_CHANNELS.DB_CREATE_BACKUP, (_, reason?: string) => {
    const backupFile = db.createBackup(reason || 'manual');
    return { success: !!backupFile, path: backupFile };
  });

  ipcMain.handle(IPC_CHANNELS.DB_RESTORE_BACKUP, async (_, backupPath: string) => {
    try {
      const res = await db.restoreBackup(backupPath);
      return { success: res };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_EXPORT, async () => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export FloatDesk Database',
      defaultPath: `floatdesk-export-${Date.now()}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }],
    });
    if (filePath) {
      db.exportDatabase(filePath);
      return { success: true, path: filePath };
    }
    return { success: false };
  });

  ipcMain.handle(IPC_CHANNELS.DB_IMPORT, async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import FloatDesk Database',
      filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }],
      properties: ['openFile'],
    });
    if (filePaths && filePaths.length > 0) {
      try {
        const success = await db.importDatabase(filePaths[0]);
        return { success, path: filePaths[0] };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return { success: false };
  });

  ipcMain.handle(IPC_CHANNELS.DB_CHECK_INTEGRITY, () => {
    return db.checkIntegrity();
  });

  ipcMain.handle(IPC_CHANNELS.DB_RESET, async () => {
    try {
      await db.resetDatabase();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_OPEN_DIRECTORY, () => {
    shell.openPath(db.getDatabaseDir());
    return true;
  });

  // System & Platform
  ipcMain.handle(IPC_CHANNELS.SYSTEM_INFO, () => {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron,
      capabilities: appDiscovery.getCapabilities(),
    };
  });
}
