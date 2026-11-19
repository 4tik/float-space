import { BrowserWindow, screen, app } from 'electron';
import * as path from 'path';
import { FloatingWindowConfig } from '../../src/types/floating-monitor';
import { DisplayMode } from '../../src/types/application';
import { DatabaseService } from '../database/db';
import { DisplayService } from '../services/display.service';
import { LoggerService } from '../services/logger.service';
import { Win32WindowEmbedder } from '../native/windows/win32-embed';
import { AppDiscoveryService } from '../services/app-discovery.service';
import { IPC_CHANNELS } from '../ipc/channels';

export class FloatingWindowManager {
  private static instance: FloatingWindowManager;
  private windows: Map<string, BrowserWindow> = new Map();
  private configs: Map<string, FloatingWindowConfig> = new Map();
  private webContentsToTarget: Map<number, { sourceId?: string; targetHwnd?: string; title?: string }> = new Map();
  private presentationWatchers: Map<string, NodeJS.Timeout> = new Map();
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

    const targetHwnd =
      inputConfig.targetHwnd ||
      (inputConfig.sourceWindowId?.startsWith('window:')
        ? inputConfig.sourceWindowId.split(':')[1]
        : undefined);

    // Prevent duplicate monitors for the same target application window
    const targetKey = targetHwnd || inputConfig.sourceWindowId;
    if (targetKey) {
      for (const [existingId, existingConfig] of this.configs.entries()) {
        const matchesHwnd = targetHwnd && existingConfig.targetHwnd === targetHwnd;
        const matchesSource = inputConfig.sourceWindowId && existingConfig.sourceWindowId === inputConfig.sourceWindowId;
        if (matchesHwnd || matchesSource) {
          const existingWin = this.windows.get(existingId);
          if (existingWin && !existingWin.isDestroyed()) {
            if (existingWin.isMinimized()) existingWin.restore();
            existingWin.show();
            existingWin.focus();
            this.broadcastStateChange(existingConfig);
            return existingConfig;
          }
        }
      }
    }

    const config: FloatingWindowConfig = {
      id,
      applicationId: inputConfig.applicationId,
      sourceWindowId: inputConfig.sourceWindowId,
      targetHwnd,
      processId: inputConfig.processId,
      title: inputConfig.title || 'Extended Monitor',
      displayMode: inputConfig.displayMode || (process.platform === 'win32' ? 'embedded' : 'live-monitor'),
      isInteractive: true,
      interactionMessage: undefined,
      positionX: inputConfig.positionX ?? 100 + (this.windows.size * 30),
      positionY: inputConfig.positionY ?? 100 + (this.windows.size * 30),
      width: Math.max(inputConfig.width || 640, 240),
      height: Math.max(inputConfig.height || 480, 160),
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

    // Validate and synchronize target application window handle before attaching
    if (config.targetHwnd && process.platform === 'win32') {
      let validation = await Win32WindowEmbedder.getInstance().validateWindow(
        config.targetHwnd,
        config.processId
      );

      // If the HWND is stale or invalid, attempt to find the current valid window for the SAME application
      if (!validation.valid) {
        this.logger.warn(
          'FloatingWindowManager',
          `Window handle ${config.targetHwnd} not valid (${validation.reason}). Searching for current window...`
        );
        const currentWin = await Win32WindowEmbedder.getInstance().findCurrentWindowForApplication({
          processId: config.processId,
          executablePath: config.executablePath,
          appName: config.appName,
          title: config.title,
        });

        if (currentWin && currentWin.handle) {
          this.logger.info(
            'FloatingWindowManager',
            `Found active window for application: HWND=${currentWin.handle}, PID=${currentWin.processId}, Title="${currentWin.title}"`
          );
          config.targetHwnd = currentWin.handle;
          config.processId = currentWin.processId;
          config.title = currentWin.title;
          config.sourceWindowId = currentWin.sourceId;
          validation = await Win32WindowEmbedder.getInstance().validateWindow(
            config.targetHwnd,
            config.processId
          );
        }
      }

      if (!validation.valid) {
        const appLabel = config.appName || config.title || 'selected application';
        throw new Error(
          `The window for "${appLabel}" was closed or is no longer available. Please select the application again.`
        );
      }

      await Win32WindowEmbedder.getInstance().focusWindow(config.targetHwnd).catch(() => { });
    }

    // Create Electron BrowserWindow for Extended Floating Monitor
    let win: BrowserWindow | null = null;
    let webContentsId = 0;
    try {
      win = new BrowserWindow({
        x: config.positionX,
        y: config.positionY,
        width: config.width,
        height: config.height,
        minWidth: 240,
        minHeight: 160,
        frame: false,
        transparent: false,
        backgroundColor: '#FFFFFF',
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
          backgroundThrottling: false,
        },
      });

      win.setOpacity(config.opacity);
      webContentsId = win.webContents.id;
      this.webContentsToTarget.set(webContentsId, {
        sourceId: config.sourceWindowId,
        targetHwnd: config.targetHwnd,
        title: config.title,
      });

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

      // Perform native window embedding if requested and supported
      if (config.targetHwnd && config.displayMode === 'embedded') {
        if (process.platform === 'win32') {
          const rawBuffer = win.getNativeWindowHandle();
          const containerHwnd =
            rawBuffer.length === 8
              ? rawBuffer.readBigUInt64LE(0).toString()
              : rawBuffer.readUInt32LE(0).toString();

          const embedRes = await Win32WindowEmbedder.getInstance().embed(config.targetHwnd, containerHwnd, {
            width: config.width,
            height: config.height,
            titlebarHeight: 32,
            processId: config.processId,
            title: config.title,
          });

          if (!embedRes.embedded) {
            throw new Error(embedRes.message || 'Window embedding failed.');
          }

          config.isInteractive = true;
          if (embedRes.resolvedHwnd) {
            config.targetHwnd = embedRes.resolvedHwnd;
          }
          config.interactionMessage =
            'Native Application Window Active: Full mouse clicks, typing, and controls';

          // If target application is PowerPoint, activate dynamic slide show window tracker
          if (
            config.appName?.toLowerCase().includes('powerpoint') ||
            config.title?.toLowerCase().includes('powerpoint') ||
            config.executablePath?.toLowerCase().includes('powerpnt')
          ) {
            this.startPresentationWatcher(id, config);
          }
        } else {
          // macOS / Linux
          config.displayMode = 'live-monitor';
          config.isInteractive = false;
        }
      }
    } catch (err: any) {
      if (win && !win.isDestroyed()) {
        try { win.destroy(); } catch { }
      }
      this.windows.delete(id);
      this.configs.delete(id);
      throw err;
    }

    // Event listeners
    win.on('focus', () => {
      if (config.displayMode === 'embedded' && config.targetHwnd && process.platform === 'win32') {
        Win32WindowEmbedder.getInstance().focusWindow(config.targetHwnd).catch(() => { });
      }
    });

    win.on('moved', () => {
      const bounds = win.getBounds();
      config.positionX = bounds.x;
      config.positionY = bounds.y;
      if (config.displayMode === 'embedded' && config.targetHwnd && process.platform === 'win32') {
        Win32WindowEmbedder.getInstance().syncBounds(config.targetHwnd, {
          width: bounds.width,
          height: bounds.height,
          titlebarHeight: 32,
        });
      }
      this.updateConfig(config);
      this.broadcastStateChange(config);
    });

    win.on('will-resize', (_e, newBounds) => {
      if (config.displayMode === 'embedded' && config.targetHwnd && process.platform === 'win32') {
        Win32WindowEmbedder.getInstance().syncBounds(config.targetHwnd, {
          width: newBounds.width,
          height: newBounds.height,
          titlebarHeight: 32,
        }).catch(() => { });
      }
    });

    win.on('resize', () => {
      const bounds = win.getBounds();
      config.width = bounds.width;
      config.height = bounds.height;
      if (config.displayMode === 'embedded' && config.targetHwnd && process.platform === 'win32') {
        Win32WindowEmbedder.getInstance().syncBounds(config.targetHwnd, {
          width: bounds.width,
          height: bounds.height,
          titlebarHeight: 32,
        });
      }
      this.updateConfig(config);
      this.broadcastStateChange(config);
    });

    win.on('resized', () => {
      const bounds = win.getBounds();
      config.width = bounds.width;
      config.height = bounds.height;
      if (config.displayMode === 'embedded' && config.targetHwnd && process.platform === 'win32') {
        Win32WindowEmbedder.getInstance().syncBounds(config.targetHwnd, {
          width: bounds.width,
          height: bounds.height,
          titlebarHeight: 32,
        });
      }
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

    win.on('close', async () => {
      this.stopPresentationWatcher(id);
      if (config.targetHwnd && process.platform === 'win32') {
        try {
          await Win32WindowEmbedder.getInstance().detach(config.targetHwnd);
        } catch { }
      }
      if (config.originalEditorHwnd && process.platform === 'win32') {
        try {
          await Win32WindowEmbedder.getInstance().detach(config.originalEditorHwnd);
        } catch {}
      }
    });

    win.on('closed', () => {
      this.stopPresentationWatcher(id);
      this.webContentsToTarget.delete(webContentsId);
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

  private startPresentationWatcher(id: string, config: FloatingWindowConfig): void {
    if (this.presentationWatchers.has(id)) return;

    const timer = setInterval(async () => {
      const win = this.windows.get(id);
      if (!win || win.isDestroyed()) {
        this.stopPresentationWatcher(id);
        return;
      }

      const currentConfig = this.configs.get(id);
      if (!currentConfig || currentConfig.displayMode !== 'embedded' || !currentConfig.processId) {
        return;
      }

      try {
        const presHwnd = await Win32WindowEmbedder.getInstance().findPresentationWindow(currentConfig.processId);

        // Case A: PowerPoint started Slide Show (new screenClass window created)
        if (presHwnd && presHwnd !== currentConfig.targetHwnd) {
          this.logger.info(
            'FloatingWindowManager',
            `PowerPoint Slide Show window detected: HWND=${presHwnd}. Embedding presentation window into monitor...`
          );

          if (!currentConfig.isPresentationMode) {
            currentConfig.originalEditorHwnd = currentConfig.targetHwnd;
            currentConfig.isPresentationMode = true;
          }

          const rawBuffer = win.getNativeWindowHandle();
          const containerHwnd =
            rawBuffer.length === 8
              ? rawBuffer.readBigUInt64LE(0).toString()
              : rawBuffer.readUInt32LE(0).toString();

          const embedRes = await Win32WindowEmbedder.getInstance().embed(presHwnd, containerHwnd, {
            width: currentConfig.width,
            height: currentConfig.height,
            titlebarHeight: 32,
            processId: currentConfig.processId,
            title: 'PowerPoint Slide Show',
          });

          if (embedRes.embedded) {
            currentConfig.targetHwnd = presHwnd;
            currentConfig.title = 'PowerPoint Slide Show';
            this.updateConfig(currentConfig);
            this.broadcastStateChange(currentConfig);
            await Win32WindowEmbedder.getInstance().focusWindow(presHwnd).catch(() => {});
          }
        }
        // Case B: PowerPoint exited Slide Show, restore original presentation editor window
        else if (currentConfig.isPresentationMode && !presHwnd && currentConfig.originalEditorHwnd) {
          const editorHwnd = currentConfig.originalEditorHwnd;
          this.logger.info(
            'FloatingWindowManager',
            `PowerPoint Slide Show closed. Restoring PowerPoint editor window HWND=${editorHwnd}`
          );

          const rawBuffer = win.getNativeWindowHandle();
          const containerHwnd =
            rawBuffer.length === 8
              ? rawBuffer.readBigUInt64LE(0).toString()
              : rawBuffer.readUInt32LE(0).toString();

          const embedRes = await Win32WindowEmbedder.getInstance().embed(editorHwnd, containerHwnd, {
            width: currentConfig.width,
            height: currentConfig.height,
            titlebarHeight: 32,
            processId: currentConfig.processId,
          });

          if (embedRes.embedded) {
            currentConfig.targetHwnd = editorHwnd;
            currentConfig.originalEditorHwnd = undefined;
            currentConfig.isPresentationMode = false;
            currentConfig.title = currentConfig.appName || 'Microsoft PowerPoint';
            this.updateConfig(currentConfig);
            this.broadcastStateChange(currentConfig);
            await Win32WindowEmbedder.getInstance().focusWindow(editorHwnd).catch(() => {});
          }
        }
      } catch (err) {
        this.logger.warn('FloatingWindowManager', 'Presentation watcher error', err);
      }
    }, 500);

    this.presentationWatchers.set(id, timer);
  }

  private stopPresentationWatcher(id: string): void {
    const timer = this.presentationWatchers.get(id);
    if (timer) {
      clearInterval(timer);
      this.presentationWatchers.delete(id);
    }
  }

  public async sendPresentationControl(id: string, action: 'next' | 'prev' | 'escape' | 'start'): Promise<boolean> {
    const config = this.configs.get(id);
    if (!config?.targetHwnd || process.platform !== 'win32') return false;

    let keyCode = 0x27; // VK_RIGHT default
    if (action === 'prev') keyCode = 0x25; // VK_LEFT
    if (action === 'escape') keyCode = 0x1B; // VK_ESCAPE
    if (action === 'start') keyCode = 0x74; // VK_F5

    try {
      await Win32WindowEmbedder.getInstance().focusWindow(config.targetHwnd);
      await Win32WindowEmbedder.getInstance().forwardInput(config.targetHwnd, {
        type: 'key',
        keyCode,
      });
      return true;
    } catch {
      return false;
    }
  }

  public getConfig(id: string): FloatingWindowConfig | undefined {
    return this.configs.get(id);
  }

  public getTargetForWebContents(webContentsId?: number): { sourceId?: string; targetHwnd?: string; title?: string } | undefined {
    if (!webContentsId) return undefined;
    return this.webContentsToTarget.get(webContentsId);
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

  public async setDisplayMode(id: string, mode: DisplayMode): Promise<FloatingWindowConfig | undefined> {
    const win = this.windows.get(id);
    const config = this.configs.get(id);
    if (!win || !config) return undefined;

    if (mode === 'embedded') {
      if (process.platform === 'win32' && config.targetHwnd) {
        try {
          const rawBuffer = win.getNativeWindowHandle();
          const containerHwnd = rawBuffer.readBigUInt64LE(0).toString();
          const embedRes = await Win32WindowEmbedder.getInstance().embed(config.targetHwnd, containerHwnd, {
            width: config.width,
            height: config.height,
            titlebarHeight: 32,
          });
          if (embedRes.embedded) {
            config.displayMode = 'embedded';
            config.isInteractive = true;
            config.interactionMessage =
              'Native Win32 embedded: Mouse clicks, typing, and scrolling active inside floating monitor';
          } else {
            config.displayMode = 'live-monitor';
            config.isInteractive = false;
            config.interactionMessage = embedRes.message;
          }
        } catch (err: any) {
          config.displayMode = 'live-monitor';
          config.isInteractive = false;
          config.interactionMessage = 'Embedding error: ' + err.message;
        }
      } else {
        config.displayMode = 'live-monitor';
        config.isInteractive = false;
        config.interactionMessage =
          process.platform === 'darwin'
            ? 'macOS WindowServer prevents cross-process window reparenting. High-performance visual capture fallback.'
            : 'Live visual capture fallback.';
      }
    } else {
      // Switching to live-monitor
      if (process.platform === 'win32' && config.targetHwnd) {
        await Win32WindowEmbedder.getInstance().detach(config.targetHwnd);
      }
      config.displayMode = 'live-monitor';
      config.isInteractive = false;
      config.interactionMessage = 'Live visual capture active. Click Focus App to control the source window.';
    }

    this.updateConfig(config);
    this.broadcastStateChange(config);
    return config;
  }

  public async detach(id: string): Promise<boolean> {
    const config = this.configs.get(id);
    if (config?.targetHwnd && process.platform === 'win32') {
      await Win32WindowEmbedder.getInstance().detach(config.targetHwnd);
    }
    return true;
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

  public async close(id: string): Promise<void> {
    const win = this.windows.get(id);
    const config = this.configs.get(id);
    if (config?.targetHwnd && process.platform === 'win32') {
      try {
        await Win32WindowEmbedder.getInstance().detach(config.targetHwnd);
      } catch { }
    }
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
