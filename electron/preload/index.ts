import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';

export const electronAPI = {
  // Floating Windows
  createWindow: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CREATE, config),
  getAllWindows: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_GET_ALL),
  closeWindow: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE, id),
  minimizeWindow: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE, id),
  maximizeWindow: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE, id),
  restoreWindow: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_RESTORE, id),
  setBounds: (id: string, bounds: any) => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SET_BOUNDS, { id, bounds }),
  setOpacity: (id: string, opacity: number) => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SET_OPACITY, { id, opacity }),
  setAlwaysOnTop: (id: string, alwaysOnTop: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SET_ALWAYS_ON_TOP, { id, alwaysOnTop }),
  setLocked: (id: string, isLocked: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SET_LOCKED, { id, isLocked }),
  hideAllWindows: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_HIDE_ALL),
  showAllWindows: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SHOW_ALL),
  snapWindow: (id: string, snap: string, displayId?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SNAP, { id, snap, displayId }),
  autoArrangeWindows: (workspaceId?: string, displayId?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_AUTO_ARRANGE, { workspaceId, displayId }),

  // Displays
  getAllDisplays: () => ipcRenderer.invoke(IPC_CHANNELS.DISPLAY_GET_ALL),

  // Applications
  getInstalledApplications: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_INSTALLED),
  getRunningWindows: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_RUNNING_WINDOWS),
  launchApplication: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_LAUNCH, path),
  focusWindow: (windowId: string, processId?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_FOCUS, { windowId, processId }),

  // Workspaces & Groups
  getWorkspaces: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_GET_ALL),
  saveWorkspace: (ws: any) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SAVE, ws),
  deleteWorkspace: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_DELETE, id),
  switchWorkspace: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SWITCH, id),
  getGroups: () => ipcRenderer.invoke(IPC_CHANNELS.GROUP_GET_ALL),
  saveGroup: (grp: any) => ipcRenderer.invoke(IPC_CHANNELS.GROUP_SAVE, grp),
  deleteGroup: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.GROUP_DELETE, id),

  // Layouts
  getLayouts: () => ipcRenderer.invoke(IPC_CHANNELS.LAYOUT_GET_ALL),
  saveLayout: (layout: any) => ipcRenderer.invoke(IPC_CHANNELS.LAYOUT_SAVE, layout),
  deleteLayout: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.LAYOUT_DELETE, id),

  // Profiles
  getProfiles: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET_ALL),
  saveProfile: (p: any) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_SAVE, p),
  applyProfile: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_APPLY, id),
  deleteProfile: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_DELETE, id),

  // Settings & System
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  saveSettings: (s: any) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, s),
  getSystemInfo: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_INFO),

  // Database Management (FloatDesk Mandatory Local SQLite Architecture)
  getDatabaseInfo: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_INFO),
  createDatabaseBackup: (reason?: string) => ipcRenderer.invoke(IPC_CHANNELS.DB_CREATE_BACKUP, reason),
  restoreDatabaseBackup: (backupPath: string) => ipcRenderer.invoke(IPC_CHANNELS.DB_RESTORE_BACKUP, backupPath),
  exportDatabase: () => ipcRenderer.invoke(IPC_CHANNELS.DB_EXPORT),
  importDatabase: () => ipcRenderer.invoke(IPC_CHANNELS.DB_IMPORT),
  checkDatabaseIntegrity: () => ipcRenderer.invoke(IPC_CHANNELS.DB_CHECK_INTEGRITY),
  resetDatabase: () => ipcRenderer.invoke(IPC_CHANNELS.DB_RESET),
  openDatabaseDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.DB_OPEN_DIRECTORY),

  // Main Controller Window actions
  minimizeMain: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_MINIMIZE_MAIN),
  maximizeMain: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_MAXIMIZE_MAIN),
  closeMain: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_CLOSE_MAIN),

  // Events listener
  onWindowStateChanged: (callback: (config: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.WINDOW_STATE_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_STATE_CHANGED, handler);
  },
  onDisplayChanged: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.DISPLAY_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DISPLAY_CHANGED, handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
