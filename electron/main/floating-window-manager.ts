import { BrowserWindow, screen, app } from 'electron';
import * as path from 'path';
import { FloatingWindowConfig } from '../../src/types/floating-monitor';
import { DatabaseService } from '../database/db';
import { DisplayService } from '../services/display.service';
import { LoggerService } from '../services/logger.service';
import { IPC_CHANNELS } from '../ipc/channels';

export class FloatingWindowManager {
  private static instance: FloatingWindowManager;
  private windows: Map<string, BrowserWindow> = new Map();
  private configs: Map<string, FloatingWindowConfig> = new Map();
  private db = DatabaseService.getInstance();
  private displayService = DisplayService.getInstance();
  private logger = LoggerService.getInstance();
  private mainWindow: BrowserWindow | null = null;
  private preloadPath: string;

  private constructor() {
    this.preloadPath = path.join(__dirname, '../preload/index.js');
  }

  public static getInstance(): FloatingWindowManager {
    if (!FloatingWindowManager.instance) {
      FloatingWindowManager.instance = new FloatingWindowManager();
    }
    return FloatingWindowManager.instance;
  }

  public setMainWindow(win: BrowserWindow) {
    this.mainWindow = win;
  }

  public async restoreSession(): Promise<void> {
    try {
      const activeConfigs = this.db.floatingMonitors.getAllActive();
      this.logger.info('FloatingWindowManager', `Restoring ${activeConfigs.length} floating windows from SQLite database`);
      for (const config of activeConfigs) {
        await this.createWindow(config, false);
      }
    } catch (err) {
      this.logger.error('FloatingWindowManager', 'Failed to restore session from SQLite', err);
    }
  }

  public async createWindow(
    inputConfig: Partial<FloatingWindowConfig> & { title: string },
    persist: boolean = true
  ): Promise<FloatingWindowConfig> {
    const id = inputConfig.id || `monitor-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const config: FloatingWindowConfig = {
      id,
      applicationId: inputConfig.applicationId,
      sourceWindowId: inputConfig.sourceWindowId,
      title: inputConfig.title || 'Floating Monitor',
      displayMode: inputConfig.displayMode || 'live-monitor',
      positionX: inputConfig.positionX ?? 100 + (this.windows.size * 30),
      positionY: inputConfig.positionY ?? 100 + (this.windows.size * 30),
      width: Math.max(inputConfig.width || 480, 240),
      height: Math.max(inputConfig.height || 320, 160),
      opacity: inputConfig.opacity ?? 1.0,
      alwaysOnTop: inputConfig.alwaysOnTop ?? true,
      isLocked: inputConfig.isLocked ?? false,
      isActive: true,
      isMinimized: false,
      isMaximized: false,
      workspaceId: inputConfig.workspaceId || 'ws-dev',
      groupId: inputConfig.groupId,
      displayId: inputConfig.displayId ?? 0,
      compactToolbar: inputConfig.compactToolbar ?? false,
      hideToolbar: inputConfig.hideToolbar ?? false,
      captureFrameRate: inputConfig.captureFrameRate ?? 30,
      captureQuality: inputConfig.captureQuality ?? 'medium',
      createdAt: inputConfig.createdAt || now,
      updatedAt: now,
    };

    // Bounds checking
    const clamped = this.displayService.clampToBounds(
      { x: config.positionX, y: config.positionY, width: config.width, height: config.height },
      config.displayId
    );
    config.positionX = clamped.x;
    config.positionY = clamped.y;
    config.width = clamped.width;
    config.height = clamped.height;

    // Create Electron BrowserWindow
    const win = new BrowserWindow({
      x: config.positionX,
      y: config.positionY,
      width: config.width,
      height: config.height,
      minWidth: 240,
      minHeight: 160,
      frame: false,
      transparent: true,
      hasShadow: true,
      alwaysOnTop: config.alwaysOnTop,
      movable: !config.isLocked,
      resizable: !config.isLocked,
      skipTaskbar: false,
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    win.setOpacity(config.opacity);

    // Load renderer with windowId
    const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      win.loadURL(`${process.env.VITE_DEV_SERVER_URL}?windowId=${id}&mode=monitor`);
    } else {
      const rendererPath = path.join(__dirname, '../../renderer/index.html');
      win.loadFile(rendererPath, {
        query: { windowId: id, mode: 'monitor' },
      });
    }

    // Event listeners
    win.on('moved', () => {
      const bounds = win.getBounds();
      config.positionX = bounds.x;
      config.positionY = bounds.y;
      this.updateConfig(config);
      this.broadcastStateChange(config);
    });

    win.on('resized', () => {
      const bounds = win.getBounds();
      config.width = bounds.width;
      config.height = bounds.height;
      this.updateConfig(config);
      this.broadcastStateChange(config);
    });

    win.on('minimize', () => {
      config.isMinimized = true;
      this.updateConfig(config);
      this.broadcastStateChange(config);
    });

    win.on('restore', () => {
      config.isMinimized = false;
      this.updateConfig(config);
      this.broadcastStateChange(config);
    });

    win.on('closed', () => {
      this.windows.delete(id);
      this.configs.delete(id);
      if (persist) {
        this.db.floatingMonitors.setInactive(id);
        this.db.saveToDisk();
      }
      this.broadcastStateChange({ ...config, isActive: false });
    });

    this.windows.set(id, win);
    this.configs.set(id, config);

    if (persist) {
      this.db.floatingMonitors.upsert(config);
      this.db.saveToDisk();
    }

    this.broadcastStateChange(config);
    return config;
  }

  public getWindow(id: string): BrowserWindow | undefined {
    return this.windows.get(id);
  }

  public getConfig(id: string): FloatingWindowConfig | undefined {
    return this.configs.get(id);
  }

  public getAllConfigs(): FloatingWindowConfig[] {
    return Array.from(this.configs.values());
  }

  public setOpacity(id: string, opacity: number): void {
    const win = this.windows.get(id);
    const config = this.configs.get(id);
    if (win && config) {
      const clamped = Math.max(0.1, Math.min(1.0, opacity));
      win.setOpacity(clamped);
      config.opacity = clamped;
      this.updateConfig(config);
      this.broadcastStateChange(config);
    }
  }

  public setAlwaysOnTop(id: string, alwaysOnTop: boolean): void {
    const win = this.windows.get(id);
    const config = this.configs.get(id);
    if (win && config) {
      win.setAlwaysOnTop(alwaysOnTop, 'floating');
      config.alwaysOnTop = alwaysOnTop;
      this.updateConfig(config);
      this.broadcastStateChange(config);
    }
  }

  public setLocked(id: string, isLocked: boolean): void {
    const win = this.windows.get(id);
    const config = this.configs.get(id);
    if (win && config) {
      win.setMovable(!isLocked);
      win.setResizable(!isLocked);
      config.isLocked = isLocked;
      this.updateConfig(config);
      this.broadcastStateChange(config);
    }
  }

  public setBounds(id: string, bounds: { x?: number; y?: number; width?: number; height?: number }): void {
    const win = this.windows.get(id);
    const config = this.configs.get(id);
    if (win && config) {
      const current = win.getBounds();
      const updated = {
        x: bounds.x ?? current.x,
        y: bounds.y ?? current.y,
        width: Math.max(bounds.width ?? current.width, 240),
        height: Math.max(bounds.height ?? current.height, 160),
      };
      const clamped = this.displayService.clampToBounds(updated, config.displayId);
      win.setBounds(clamped);
      config.positionX = clamped.x;
      config.positionY = clamped.y;
      config.width = clamped.width;
      config.height = clamped.height;
      this.updateConfig(config);
      this.broadcastStateChange(config);
    }
  }

  public minimize(id: string): void {
    const win = this.windows.get(id);
    if (win && !win.isDestroyed()) {
      win.minimize();
    }
  }

  public maximize(id: string): void {
    const win = this.windows.get(id);
    const config = this.configs.get(id);
    if (win && config && !win.isDestroyed()) {
      if (win.isMaximized()) {
        win.unmaximize();
        config.isMaximized = false;
      } else {
        win.maximize();
        config.isMaximized = true;
      }
      this.updateConfig(config);
      this.broadcastStateChange(config);
    }
  }

  public restore(id: string): void {
    const win = this.windows.get(id);
    if (win && !win.isDestroyed()) {
      win.restore();
      win.show();
      win.focus();
    }
  }

  public close(id: string): void {
    const win = this.windows.get(id);
    if (win && !win.isDestroyed()) {
      win.close();
    }
  }

  public hideAll(): void {
    for (const win of this.windows.values()) {
      if (!win.isDestroyed()) win.hide();
    }
  }

  public showAll(): void {
    for (const win of this.windows.values()) {
      if (!win.isDestroyed()) {
        win.show();
        win.restore();
      }
    }
  }

  public filterByWorkspace(workspaceId: string): void {
    for (const [id, config] of this.configs.entries()) {
      const win = this.windows.get(id);
      if (!win || win.isDestroyed()) continue;

      if (config.workspaceId === workspaceId) {
        win.show();
      } else {
        win.hide();
      }
    }
  }

  public filterByGroup(groupId?: string): void {
    for (const [id, config] of this.configs.entries()) {
      const win = this.windows.get(id);
      if (!win || win.isDestroyed()) continue;

      if (!groupId || config.groupId === groupId) {
        win.show();
      } else {
        win.hide();
      }
    }
  }

  public autoArrange(workspaceId?: string, displayId?: number): void {
    const activeConfigs = Array.from(this.configs.values()).filter(
      (c) => (!workspaceId || c.workspaceId === workspaceId) && c.isActive
    );

    const count = activeConfigs.length;
    if (count === 0) return;

    const grid = this.displayService.autoArrangeGrid(count, displayId);
    for (let i = 0; i < count; i++) {
      const conf = activeConfigs[i];
      const bounds = grid[i];
      this.setBounds(conf.id, bounds);
    }
  }

  private updateConfig(config: FloatingWindowConfig): void {
    config.updatedAt = new Date().toISOString();
    this.configs.set(config.id, config);
    this.db.floatingMonitors.upsert(config);
    this.db.saveToDisk();
  }

  private broadcastStateChange(
    config: FloatingWindowConfig | (Partial<FloatingWindowConfig> & { id: string; isActive: boolean })
  ): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.WINDOW_STATE_CHANGED, config);
    }
    for (const [, win] of this.windows.entries()) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.WINDOW_STATE_CHANGED, config);
      }
    }
  }
}
