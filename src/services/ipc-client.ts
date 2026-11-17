import { FloatingWindowConfig, Workspace, MonitorGroup } from '../types/floating-monitor';
import { InstalledApplication, RunningWindowInfo } from '../types/application';
import { PhysicalDisplay } from '../types/display';

export const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

// Default memory fallback store for standalone browser preview/tests
let fallbackMonitors: FloatingWindowConfig[] = [
  {
    id: 'mon-1',
    title: 'Code Editor (Live)',
    displayMode: 'live-monitor',
    positionX: 80,
    positionY: 100,
    width: 480,
    height: 320,
    opacity: 1.0,
    alwaysOnTop: true,
    isLocked: false,
    isActive: true,
    isMinimized: false,
    isMaximized: false,
    workspaceId: 'ws-dev',
    groupId: 'grp-dev',
    displayId: 0,
    compactToolbar: false,
    hideToolbar: false,
    captureFrameRate: 30,
    captureQuality: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mon-2',
    title: 'Terminal / Server Log',
    displayMode: 'live-monitor',
    positionX: 580,
    positionY: 100,
    width: 440,
    height: 300,
    opacity: 0.95,
    alwaysOnTop: true,
    isLocked: false,
    isActive: true,
    isMinimized: false,
    isMaximized: false,
    workspaceId: 'ws-dev',
    groupId: 'grp-dev',
    displayId: 0,
    compactToolbar: false,
    hideToolbar: false,
    captureFrameRate: 30,
    captureQuality: 'high',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let fallbackWorkspaces: Workspace[] = [
  { id: 'ws-dev', name: 'Development', description: 'VS Code, Terminal, Browser dev tools', sortOrder: 0, createdAt: '', updatedAt: '' },
  { id: 'ws-mon', name: 'Monitoring', description: 'System monitor, Metrics, Database tools', sortOrder: 1, createdAt: '', updatedAt: '' },
  { id: 'ws-comm', name: 'Communication', description: 'Chat, Email, Calendar, Meetings', sortOrder: 2, createdAt: '', updatedAt: '' },
  { id: 'ws-personal', name: 'Personal', description: 'Music, Notes, Web Reference', sortOrder: 3, createdAt: '', updatedAt: '' },
];

let fallbackGroups: MonitorGroup[] = [
  { id: 'grp-dev', workspaceId: 'ws-dev', name: 'Dev Tools', sortOrder: 0, monitorIds: ['mon-1', 'mon-2'], createdAt: '', updatedAt: '' },
  { id: 'grp-mon', workspaceId: 'ws-mon', name: 'Metrics', sortOrder: 0, monitorIds: [], createdAt: '', updatedAt: '' },
];

export const ipcClient = {
  async getWindows(): Promise<FloatingWindowConfig[]> {
    if (isElectron) return await window.electronAPI.getAllWindows();
    return [...fallbackMonitors];
  },

  async createWindow(config: Partial<FloatingWindowConfig> & { title: string }): Promise<FloatingWindowConfig> {
    if (isElectron) return await window.electronAPI.createWindow(config);
    const newMon: FloatingWindowConfig = {
      id: `mon-${Date.now()}`,
      title: config.title,
      displayMode: config.displayMode || 'live-monitor',
      positionX: config.positionX || 120,
      positionY: config.positionY || 120,
      width: config.width || 480,
      height: config.height || 320,
      opacity: config.opacity ?? 1.0,
      alwaysOnTop: config.alwaysOnTop ?? true,
      isLocked: config.isLocked ?? false,
      isActive: true,
      isMinimized: false,
      isMaximized: false,
      workspaceId: config.workspaceId || 'ws-dev',
      groupId: config.groupId,
      displayId: config.displayId || 0,
      compactToolbar: false,
      hideToolbar: false,
      captureFrameRate: 30,
      captureQuality: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fallbackMonitors.push(newMon);
    return newMon;
  },

  async closeWindow(id: string): Promise<boolean> {
    if (isElectron) return await window.electronAPI.closeWindow(id);
    fallbackMonitors = fallbackMonitors.filter(m => m.id !== id);
    return true;
  },

  async minimizeWindow(id: string): Promise<boolean> {
    if (isElectron) return await window.electronAPI.minimizeWindow(id);
    const m = fallbackMonitors.find(x => x.id === id);
    if (m) m.isMinimized = true;
    return true;
  },

  async maximizeWindow(id: string): Promise<boolean> {
    if (isElectron) return await window.electronAPI.maximizeWindow(id);
    const m = fallbackMonitors.find(x => x.id === id);
    if (m) m.isMaximized = !m.isMaximized;
    return true;
  },

  async restoreWindow(id: string): Promise<boolean> {
    if (isElectron) return await window.electronAPI.restoreWindow(id);
    const m = fallbackMonitors.find(x => x.id === id);
    if (m) m.isMinimized = false;
    return true;
  },

  async setBounds(id: string, bounds: any): Promise<boolean> {
    if (isElectron) return await window.electronAPI.setBounds(id, bounds);
    const m = fallbackMonitors.find(x => x.id === id);
    if (m) {
      if (bounds.x !== undefined) m.positionX = bounds.x;
      if (bounds.y !== undefined) m.positionY = bounds.y;
      if (bounds.width !== undefined) m.width = bounds.width;
      if (bounds.height !== undefined) m.height = bounds.height;
    }
    return true;
  },

  async setOpacity(id: string, opacity: number): Promise<boolean> {
    if (isElectron) return await window.electronAPI.setOpacity(id, opacity);
    const m = fallbackMonitors.find(x => x.id === id);
    if (m) m.opacity = opacity;
    return true;
  },

  async setAlwaysOnTop(id: string, alwaysOnTop: boolean): Promise<boolean> {
    if (isElectron) return await window.electronAPI.setAlwaysOnTop(id, alwaysOnTop);
    const m = fallbackMonitors.find(x => x.id === id);
    if (m) m.alwaysOnTop = alwaysOnTop;
    return true;
  },

  async setLocked(id: string, isLocked: boolean): Promise<boolean> {
    if (isElectron) return await window.electronAPI.setLocked(id, isLocked);
    const m = fallbackMonitors.find(x => x.id === id);
    if (m) m.isLocked = isLocked;
    return true;
  },

  async snapWindow(id: string, snap: string, displayId?: number) {
    if (isElectron) return await window.electronAPI.snapWindow(id, snap, displayId);
    return null;
  },

  async autoArrange(workspaceId?: string, displayId?: number) {
    if (isElectron) return await window.electronAPI.autoArrangeWindows(workspaceId, displayId);
    return true;
  },

  async getAllDisplays(): Promise<PhysicalDisplay[]> {
    if (isElectron) return await window.electronAPI.getAllDisplays();
    return [
      {
        id: 1,
        label: 'Built-in Display (1920x1080)',
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1040 },
        scaleFactor: 1,
        isPrimary: true,
        rotation: 0,
      },
    ];
  },

  async getInstalledApplications(): Promise<InstalledApplication[]> {
    if (isElectron) return await window.electronAPI.getInstalledApplications();
    return [
      { id: 'app-vs-code', name: 'Visual Studio Code', executablePath: 'code.exe', platform: 'win32' },
      { id: 'app-terminal', name: 'Terminal / PowerShell', executablePath: 'powershell.exe', platform: 'win32' },
      { id: 'app-chrome', name: 'Google Chrome', executablePath: 'chrome.exe', platform: 'win32' },
      { id: 'app-notepad', name: 'Notepad', executablePath: 'notepad.exe', platform: 'win32' },
      { id: 'app-calc', name: 'Calculator', executablePath: 'calc.exe', platform: 'win32' },
      { id: 'app-taskmgr', name: 'Task Manager', executablePath: 'taskmgr.exe', platform: 'win32' },
    ];
  },

  async getRunningWindows(): Promise<RunningWindowInfo[]> {
    if (isElectron) return await window.electronAPI.getRunningWindows();
    return [
      { id: 'win-101', sourceId: 'window:101:0', title: 'VS Code - float-space', appName: 'Code', processId: 1420 },
      { id: 'win-102', sourceId: 'window:102:0', title: 'Windows PowerShell', appName: 'PowerShell', processId: 5880 },
      { id: 'win-103', sourceId: 'window:103:0', title: 'Google Chrome - Dashboard', appName: 'Chrome', processId: 8124 },
    ];
  },

  async launchApplication(path: string) {
    if (isElectron) return await window.electronAPI.launchApplication(path);
    return { success: true };
  },

  async focusWindow(windowId: string, processId?: number) {
    if (isElectron) return await window.electronAPI.focusWindow(windowId, processId);
    return true;
  },

  async getWorkspaces(): Promise<Workspace[]> {
    if (isElectron) return await window.electronAPI.getWorkspaces();
    return [...fallbackWorkspaces];
  },

  async saveWorkspace(ws: any) {
    if (isElectron) return await window.electronAPI.saveWorkspace(ws);
    const idx = fallbackWorkspaces.findIndex(x => x.id === ws.id);
    if (idx >= 0) fallbackWorkspaces[idx] = ws;
    else fallbackWorkspaces.push(ws);
    return true;
  },

  async deleteWorkspace(id: string) {
    if (isElectron) return await window.electronAPI.deleteWorkspace(id);
    fallbackWorkspaces = fallbackWorkspaces.filter(x => x.id !== id);
    return true;
  },

  async switchWorkspace(id: string) {
    if (isElectron) return await window.electronAPI.switchWorkspace(id);
    return true;
  },

  async getGroups(): Promise<MonitorGroup[]> {
    if (isElectron) return await window.electronAPI.getGroups();
    return [...fallbackGroups];
  },

  async saveGroup(grp: any) {
    if (isElectron) return await window.electronAPI.saveGroup(grp);
    const idx = fallbackGroups.findIndex(x => x.id === grp.id);
    if (idx >= 0) fallbackGroups[idx] = grp;
    else fallbackGroups.push(grp);
    return true;
  },

  async deleteGroup(id: string) {
    if (isElectron) return await window.electronAPI.deleteGroup(id);
    fallbackGroups = fallbackGroups.filter(x => x.id !== id);
    return true;
  },

  async getProfiles() {
    if (isElectron) return await window.electronAPI.getProfiles();
    return [];
  },

  async saveProfile(p: any) {
    if (isElectron) return await window.electronAPI.saveProfile(p);
    return true;
  },

  async applyProfile(id: string) {
    if (isElectron) return await window.electronAPI.applyProfile(id);
    return true;
  },

  async deleteProfile(id: string) {
    if (isElectron) return await window.electronAPI.deleteProfile(id);
    return true;
  },

  async getSettings() {
    if (isElectron) return await window.electronAPI.getSettings();
    return {};
  },

  async saveSettings(settings: any) {
    if (isElectron) return await window.electronAPI.saveSettings(settings);
    return true;
  },

  async getSystemInfo() {
    if (isElectron) return await window.electronAPI.getSystemInfo();
    return {
      platform: 'win32',
      arch: 'x64',
      nodeVersion: '24.21.0',
      electronVersion: '33.2.1',
      capabilities: {
        platform: 'win32',
        canEmbed: true,
        canCapture: true,
        requiresPermissions: false,
        desktopEnvironment: 'Windows Shell (DWM)',
        notes: 'Win32 Window Inspection & desktopCapturer preview available.',
      },
    };
  },

  // FloatDesk Local Database Operations
  async getDatabaseInfo() {
    if (isElectron) return await window.electronAPI.getDatabaseInfo();
    return {
      status: 'healthy',
      engine: 'SQLite 3 (Embedded WASM/sql.js)',
      version: '3.46.0',
      location: 'FloatDesk/database/floatdesk.db',
      sizeBytes: 131072,
      schemaVersion: 1,
      lastBackup: new Date().toISOString(),
      backupsCount: 2,
      tablesCount: 13,
      tableStats: {
        applications: 6,
        floating_monitors: 2,
        workspaces: 4,
        monitor_groups: 4,
        application_settings: 6,
        keyboard_shortcuts: 2,
      },
      metadata: {
        created_at: new Date().toISOString(),
        last_opened: new Date().toISOString(),
        last_backup: new Date().toISOString(),
        schema_version: 1,
        backups: [
          {
            id: 'backup-1',
            filename: 'floatdesk-backup-2026-11-17-pre-migration.db',
            filepath: 'FloatDesk/database/backups/floatdesk-backup-2026-11-17-pre-migration.db',
            timestamp: new Date().toISOString(),
            reason: 'pre-migration',
            sizeBytes: 131072,
            schemaVersion: 1,
          },
        ],
      },
    };
  },

  async createDatabaseBackup(reason?: string) {
    if (isElectron) return await window.electronAPI.createDatabaseBackup(reason);
    return { success: true, path: 'FloatDesk/database/backups/floatdesk-backup-manual.db' };
  },

  async restoreDatabaseBackup(backupPath: string) {
    if (isElectron) return await window.electronAPI.restoreDatabaseBackup(backupPath);
    return { success: true };
  },

  async exportDatabase() {
    if (isElectron) return await window.electronAPI.exportDatabase();
    return { success: true, path: 'floatdesk-export.db' };
  },

  async importDatabase() {
    if (isElectron) return await window.electronAPI.importDatabase();
    return { success: true, path: 'imported.db' };
  },

  async checkDatabaseIntegrity() {
    if (isElectron) return await window.electronAPI.checkDatabaseIntegrity();
    return { healthy: true, issues: [] };
  },

  async resetDatabase() {
    if (isElectron) return await window.electronAPI.resetDatabase();
    return { success: true };
  },

  async openDatabaseDirectory() {
    if (isElectron) return await window.electronAPI.openDatabaseDirectory();
    return true;
  },

  minimizeMain() {
    if (isElectron) window.electronAPI.minimizeMain();
  },
  maximizeMain() {
    if (isElectron) window.electronAPI.maximizeMain();
  },
  closeMain() {
    if (isElectron) window.electronAPI.closeMain();
  },

  onWindowStateChanged(cb: (config: any) => void) {
    if (isElectron) return window.electronAPI.onWindowStateChanged(cb);
    return () => {};
  },
  onDisplayChanged(cb: () => void) {
    if (isElectron) return window.electronAPI.onDisplayChanged(cb);
    return () => {};
  },
};
