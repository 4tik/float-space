import { FloatingWindowConfig, Workspace, MonitorGroup } from '../types/floating-monitor';
import { InstalledApplication, RunningWindowInfo, DisplayMode } from '../types/application';
import { PhysicalDisplay, SnapPosition } from '../types/display';
import { AppSettings, Profile } from '../types/settings';

export const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export interface DatabaseMetadataItem {
  id: string;
  filename: string;
  filepath: string;
  timestamp: string;
  reason: string;
  sizeBytes: number;
  schemaVersion: number;
}

export interface DatabaseInfoResponse {
  status: 'healthy' | 'degraded' | 'error';
  engine: string;
  version: string;
  location: string;
  sizeBytes: number;
  schemaVersion: number;
  lastBackup: string | null;
  backupsCount: number;
  tablesCount: number;
  tableStats: Record<string, number>;
  metadata: {
    created_at: string;
    last_opened: string;
    last_backup: string | null;
    schema_version: number;
    backups: DatabaseMetadataItem[];
  };
}

export interface SystemInfoResponse {
  platform: string;
  arch: string;
  nodeVersion: string;
  electronVersion: string;
  capabilities: {
    platform: string;
    canEmbed: boolean;
    canCapture: boolean;
    requiresPermissions: boolean;
    desktopEnvironment?: string;
    notes: string;
  };
}

export const ipcClient = {
  async getWindows(): Promise<FloatingWindowConfig[]> {
    if (isElectron) return await window.electronAPI.getAllWindows();
    return [];
  },

  async createWindow(config: Partial<FloatingWindowConfig> & { title: string }): Promise<FloatingWindowConfig> {
    if (isElectron) return await window.electronAPI.createWindow(config);
    return {
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
  },

  async closeWindow(id: string): Promise<boolean> {
    if (isElectron) return await window.electronAPI.closeWindow(id);
    return true;
  },

  async minimizeWindow(id: string): Promise<boolean> {
    if (isElectron) return await window.electronAPI.minimizeWindow(id);
    return true;
  },

  async maximizeWindow(id: string): Promise<boolean> {
    if (isElectron) return await window.electronAPI.maximizeWindow(id);
    return true;
  },

  async restoreWindow(id: string): Promise<boolean> {
    if (isElectron) return await window.electronAPI.restoreWindow(id);
    return true;
  },

  async setBounds(id: string, bounds: { x?: number; y?: number; width?: number; height?: number }): Promise<boolean> {
    if (isElectron) return await window.electronAPI.setBounds(id, bounds);
    return true;
  },

  async setOpacity(id: string, opacity: number): Promise<boolean> {
    if (isElectron) return await window.electronAPI.setOpacity(id, opacity);
    return true;
  },

  async setAlwaysOnTop(id: string, alwaysOnTop: boolean): Promise<boolean> {
    if (isElectron) return await window.electronAPI.setAlwaysOnTop(id, alwaysOnTop);
    return true;
  },

  async setLocked(id: string, isLocked: boolean): Promise<boolean> {
    if (isElectron) return await window.electronAPI.setLocked(id, isLocked);
    return true;
  },

  async setDisplayMode(id: string, mode: DisplayMode): Promise<FloatingWindowConfig | undefined> {
    if (isElectron) return await window.electronAPI.setDisplayMode(id, mode);
    return undefined;
  },

  async detachWindow(id: string): Promise<boolean> {
    if (isElectron) return await window.electronAPI.detachWindow(id);
    return true;
  },

  async hideAllWindows(): Promise<boolean> {
    if (isElectron) return await window.electronAPI.hideAllWindows();
    return true;
  },

  async showAllWindows(): Promise<boolean> {
    if (isElectron) return await window.electronAPI.showAllWindows();
    return true;
  },

  async snapWindow(id: string, snap: SnapPosition, displayId?: number): Promise<{ x: number; y: number; width: number; height: number } | null> {
    if (isElectron) return await window.electronAPI.snapWindow(id, snap, displayId);
    return null;
  },

  async autoArrange(workspaceId?: string, displayId?: number): Promise<boolean> {
    if (isElectron) return await window.electronAPI.autoArrangeWindows(workspaceId, displayId);
    return true;
  },

  async getAllDisplays(): Promise<PhysicalDisplay[]> {
    if (isElectron) return await window.electronAPI.getAllDisplays();
    return [];
  },

  async getInstalledApplications(): Promise<InstalledApplication[]> {
    if (isElectron) return await window.electronAPI.getInstalledApplications();
    return [];
  },

  async getRunningWindows(): Promise<RunningWindowInfo[]> {
    if (isElectron) return await window.electronAPI.getRunningWindows();
    return [];
  },

  async launchApplication(path: string): Promise<{ success: boolean; pid?: number; error?: string }> {
    if (isElectron) return await window.electronAPI.launchApplication(path);
    return { success: true };
  },

  async focusWindow(windowId: string, processId?: number): Promise<boolean> {
    if (isElectron) return await window.electronAPI.focusWindow(windowId, processId);
    return true;
  },

  async getWorkspaces(): Promise<Workspace[]> {
    if (isElectron) return await window.electronAPI.getWorkspaces();
    return [];
  },

  async saveWorkspace(ws: Partial<Workspace> & { id: string; name: string }): Promise<boolean> {
    if (isElectron) return await window.electronAPI.saveWorkspace(ws);
    return true;
  },

  async deleteWorkspace(id: string): Promise<boolean> {
    if (isElectron) return await window.electronAPI.deleteWorkspace(id);
    return true;
  },

  async switchWorkspace(id: string): Promise<boolean> {
    if (isElectron) return await window.electronAPI.switchWorkspace(id);
    return true;
  },

  async getGroups(): Promise<MonitorGroup[]> {
    if (isElectron) return await window.electronAPI.getGroups();
    return [];
  },

  async saveGroup(grp: Partial<MonitorGroup> & { id: string; workspaceId: string; name: string }): Promise<boolean> {
    if (isElectron) return await window.electronAPI.saveGroup(grp);
    return true;
  },

  async deleteGroup(id: string): Promise<boolean> {
    if (isElectron) return await window.electronAPI.deleteGroup(id);
    return true;
  },

  async getProfiles(): Promise<Profile[]> {
    if (isElectron) return await window.electronAPI.getProfiles();
    return [];
  },

  async saveProfile(p: { id: string; name: string; description?: string; monitors: any[] }): Promise<boolean> {
    if (isElectron) return await window.electronAPI.saveProfile(p);
    return true;
  },

  async applyProfile(id: string): Promise<boolean> {
    if (isElectron) return await window.electronAPI.applyProfile(id);
    return true;
  },

  async deleteProfile(id: string): Promise<boolean> {
    if (isElectron) return await window.electronAPI.deleteProfile(id);
    return true;
  },

  async getSettings(): Promise<Record<string, string>> {
    if (isElectron) return await window.electronAPI.getSettings();
    return {};
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<boolean> {
    if (isElectron) return await window.electronAPI.saveSettings(settings);
    return true;
  },

  async getSystemInfo(): Promise<SystemInfoResponse> {
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
  async getDatabaseInfo(): Promise<DatabaseInfoResponse> {
    if (isElectron) return await window.electronAPI.getDatabaseInfo();
    return {
      status: 'healthy',
      engine: 'SQLite 3 (Embedded WASM/sql.js)',
      version: '3.46.0',
      location: 'FloatDesk/database/floatdesk.db',
      sizeBytes: 0,
      schemaVersion: 1,
      lastBackup: null,
      backupsCount: 0,
      tablesCount: 13,
      tableStats: {},
      metadata: {
        created_at: new Date().toISOString(),
        last_opened: new Date().toISOString(),
        last_backup: null,
        schema_version: 1,
        backups: [],
      },
    };
  },

  async createDatabaseBackup(reason?: string): Promise<{ success: boolean; path?: string | null }> {
    if (isElectron) return await window.electronAPI.createDatabaseBackup(reason);
    return { success: true };
  },

  async restoreDatabaseBackup(backupPath: string): Promise<{ success: boolean; error?: string }> {
    if (isElectron) return await window.electronAPI.restoreDatabaseBackup(backupPath);
    return { success: true };
  },

  async exportDatabase(): Promise<{ success: boolean; path?: string }> {
    if (isElectron) return await window.electronAPI.exportDatabase();
    return { success: true };
  },

  async importDatabase(): Promise<{ success: boolean; path?: string; error?: string }> {
    if (isElectron) return await window.electronAPI.importDatabase();
    return { success: true };
  },

  async checkDatabaseIntegrity(): Promise<{ healthy: boolean; issues: string[] }> {
    if (isElectron) return await window.electronAPI.checkDatabaseIntegrity();
    return { healthy: true, issues: [] };
  },

  async resetDatabase(): Promise<{ success: boolean; error?: string }> {
    if (isElectron) return await window.electronAPI.resetDatabase();
    return { success: true };
  },

  async openDatabaseDirectory(): Promise<boolean> {
    if (isElectron) return await window.electronAPI.openDatabaseDirectory();
    return true;
  },

  minimizeMain(): void {
    if (isElectron) window.electronAPI.minimizeMain();
  },
  maximizeMain(): void {
    if (isElectron) window.electronAPI.maximizeMain();
  },
  closeMain(): void {
    if (isElectron) window.electronAPI.closeMain();
  },

  onWindowStateChanged(cb: (config: FloatingWindowConfig) => void): () => void {
    if (isElectron) return window.electronAPI.onWindowStateChanged(cb);
    return () => {};
  },
  onDisplayChanged(cb: () => void): () => void {
    if (isElectron) return window.electronAPI.onDisplayChanged(cb);
    return () => {};
  },
};
