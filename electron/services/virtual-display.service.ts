import { screen, desktopCapturer } from 'electron';
import { execFile } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { Win32WindowEmbedder } from '../native/windows/win32-embed';
import { LoggerService } from './logger.service';

const execFileAsync = promisify(execFile);

export type VirtualDisplayState =
  | 'not_created'
  | 'creating'
  | 'ready'
  | 'disconnected'
  | 'failed';

export interface VirtualDisplayStatus {
  state: VirtualDisplayState;
  hasExtendedDisplay: boolean;
  displayId?: number;
  label?: string;
  bounds?: { x: number; y: number; width: number; height: number };
  resolution?: string;
  refreshRate?: number;
  appsCount: number;
  message: string;
}

export interface AppOnVirtualDisplay {
  hwnd: string;
  title: string;
  appName: string;
  processId?: number;
  origBounds: { x: number; y: number; width: number; height: number };
  movedAt: string;
}

export class VirtualDisplayService {
  private static instance: VirtualDisplayService;
  private logger = LoggerService.getInstance();
  private movedWindows: Map<string, AppOnVirtualDisplay> = new Map();
  private targetResolution: { width: number; height: number } = { width: 1920, height: 1080 };
  private isCreating = false;
  private scriptPath: string;

  private constructor() {
    this.scriptPath = this.resolveScriptPath();
    this.logger.info('VirtualDisplayService', `Initialized Virtual Extended Monitor Subsystem (script: ${this.scriptPath})`);
  }

  private resolveScriptPath(): string {
    const candidates = [
      path.join(__dirname, '../native/windows/virtual-display/virtual-display-manager.ps1'),
      path.join(__dirname.replace('app.asar', 'app.asar.unpacked'), '../native/windows/virtual-display/virtual-display-manager.ps1'),
      path.join(process.cwd(), 'electron/native/windows/virtual-display/virtual-display-manager.ps1'),
      path.join(process.cwd(), 'dist/electron/native/windows/virtual-display/virtual-display-manager.ps1'),
      path.join(process.resourcesPath || '', 'app.asar.unpacked/dist/electron/native/windows/virtual-display/virtual-display-manager.ps1'),
    ];

    for (const p of candidates) {
      try {
        if (require('fs').existsSync(p)) {
          return p;
        }
      } catch {}
    }
    return candidates[0];
  }

  public static getInstance(): VirtualDisplayService {
    if (!VirtualDisplayService.instance) {
      VirtualDisplayService.instance = new VirtualDisplayService();
    }
    return VirtualDisplayService.instance;
  }

  public getTargetResolution(): { width: number; height: number } {
    return { ...this.targetResolution };
  }

  public async setTargetResolution(width: number, height: number): Promise<VirtualDisplayStatus> {
    this.targetResolution = { width, height };
    this.logger.info('VirtualDisplayService', `Target resolution set to ${width}x${height}`);

    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        this.scriptPath,
        '-Action',
        'set_resolution',
        '-Width',
        String(width),
        '-Height',
        String(height),
      ]);
    } catch {}

    return await this.getStatus();
  }

  public async getStatus(): Promise<VirtualDisplayStatus> {
    if (this.isCreating) {
      return {
        state: 'creating',
        hasExtendedDisplay: false,
        resolution: `${this.targetResolution.width}x${this.targetResolution.height}`,
        appsCount: this.movedWindows.size,
        message: 'Creating virtual display...',
      };
    }

    try {
      const displays = screen.getAllDisplays();
      const primary = screen.getPrimaryDisplay();
      const secondary = displays.find((d) => d.id !== primary.id);

      // Truthful check: Is Display 2 active and recognized by Windows?
      if (secondary) {
        return {
          state: 'ready',
          hasExtendedDisplay: true,
          displayId: secondary.id,
          label: `Display ${displays.indexOf(secondary) + 1} (${secondary.size.width}x${secondary.size.height})`,
          bounds: secondary.bounds,
          resolution: `${secondary.size.width}x${secondary.size.height}`,
          refreshRate: 60,
          appsCount: this.movedWindows.size,
          message: 'Virtual display ready',
        };
      }

      // Check hardware/driver state via PowerShell manager script
      let psState: VirtualDisplayState = 'not_created';
      try {
        const { stdout } = await execFileAsync('powershell.exe', [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          this.scriptPath,
          '-Action',
          'status',
        ]);
        if (stdout && stdout.trim()) {
          const parsed = JSON.parse(stdout.trim());
          if (parsed.state) psState = parsed.state;
        }
      } catch {}

      const msgMap: Record<VirtualDisplayState, string> = {
        ready: 'Virtual display ready',
        not_created: 'Virtual display not created',
        creating: 'Creating virtual display...',
        disconnected: 'Display disconnected',
        failed: 'Display initialization failed',
      };

      return {
        state: psState,
        hasExtendedDisplay: false,
        resolution: `${this.targetResolution.width}x${this.targetResolution.height}`,
        appsCount: this.movedWindows.size,
        message: msgMap[psState] || 'Virtual display not created',
      };
    } catch (err: any) {
      return {
        state: 'failed',
        hasExtendedDisplay: false,
        appsCount: 0,
        message: 'Display initialization failed: ' + err.message,
      };
    }
  }

  public async createVirtualDisplay(width?: number, height?: number): Promise<VirtualDisplayStatus> {
    const targetW = width || this.targetResolution.width;
    const targetH = height || this.targetResolution.height;
    this.targetResolution = { width: targetW, height: targetH };
    this.isCreating = true;

    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        this.scriptPath,
        '-Action',
        'create',
        '-Width',
        String(targetW),
        '-Height',
        String(targetH),
      ]);
    } catch (err) {
      this.logger.error('VirtualDisplayService', 'Failed to execute create action', err);
    } finally {
      this.isCreating = false;
    }

    return await this.getStatus();
  }

  public async enableVirtualDisplay(): Promise<VirtualDisplayStatus> {
    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        this.scriptPath,
        '-Action',
        'enable',
      ]);
    } catch {}

    return await this.getStatus();
  }

  public async disableVirtualDisplay(): Promise<VirtualDisplayStatus> {
    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        this.scriptPath,
        '-Action',
        'disable',
      ]);
    } catch {}

    return await this.getStatus();
  }

  public async getVirtualDisplaySourceId(): Promise<string | null> {
    try {
      const displays = screen.getAllDisplays();
      const primary = screen.getPrimaryDisplay();
      const secondaryIndex = displays.findIndex((d) => d.id !== primary.id);

      const sources = await desktopCapturer.getSources({ types: ['screen'] });
      if (secondaryIndex >= 0 && sources.length > 1) {
        const match = sources.find(
          (s) => s.id === `screen:${secondaryIndex}:0` || s.name.toLowerCase().includes('screen 2')
        );
        if (match) return match.id;
        return sources[1].id;
      }

      return sources[0]?.id || null;
    } catch (err) {
      this.logger.warn('VirtualDisplayService', 'Failed to acquire screen capturer source ID', err);
      return null;
    }
  }

  public async moveAppToVirtual(
    hwnd: string,
    appInfo?: { title?: string; appName?: string; processId?: number; maximize?: boolean }
  ): Promise<{ success: boolean; message: string }> {
    if (!hwnd || hwnd === '0') {
      return { success: false, message: 'Invalid target window handle' };
    }

    try {
      const status = await this.getStatus();
      if (!status.hasExtendedDisplay || !status.bounds) {
        return {
          success: false,
          message: 'Virtual Display is not active. Please click "Create Virtual Display" first.',
        };
      }

      const targetBounds = status.bounds;
      const count = this.movedWindows.size;
      let appX = targetBounds.x;
      let appY = targetBounds.y;
      let appW = targetBounds.width;
      let appH = targetBounds.height;

      if (!appInfo?.maximize) {
        if (count === 0) {
          appW = Math.round(targetBounds.width * 0.9);
          appH = Math.round(targetBounds.height * 0.9);
          appX = targetBounds.x + Math.round((targetBounds.width - appW) / 2);
          appY = targetBounds.y + Math.round((targetBounds.height - appH) / 2);
        } else if (count === 1) {
          appW = Math.round(targetBounds.width * 0.48);
          appH = Math.round(targetBounds.height * 0.88);
          appX = targetBounds.x + Math.round(targetBounds.width * 0.5);
          appY = targetBounds.y + Math.round((targetBounds.height - appH) / 2);
        } else {
          const offset = ((count - 1) * 40) % 200;
          appW = Math.round(targetBounds.width * 0.65);
          appH = Math.round(targetBounds.height * 0.65);
          appX = targetBounds.x + 60 + offset;
          appY = targetBounds.y + 60 + offset;
        }
      }

      const res = await Win32WindowEmbedder.getInstance().moveWindowToDisplay(hwnd, {
        x: appX,
        y: appY,
        width: appW,
        height: appH,
        maximize: appInfo?.maximize,
      });

      if (res.success) {
        const origBounds = res.origBounds || { x: 100, y: 100, width: 800, height: 600 };
        this.movedWindows.set(hwnd, {
          hwnd,
          title: appInfo?.title || 'Application',
          appName: appInfo?.appName || 'Application',
          processId: appInfo?.processId,
          origBounds,
          movedAt: new Date().toISOString(),
        });

        this.logger.info(
          'VirtualDisplayService',
          `Successfully moved "${appInfo?.title || hwnd}" to virtual display`
        );
        return {
          success: true,
          message: `Moved "${appInfo?.appName || 'Application'}" to Virtual Display.`,
        };
      }

      return { success: false, message: 'Could not reposition target application window.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to move window' };
    }
  }

  public async returnAppToPrimary(hwnd: string): Promise<{ success: boolean; message: string }> {
    const tracked = this.movedWindows.get(hwnd);
    const bounds = tracked?.origBounds || { x: 120, y: 120, width: 960, height: 640 };

    try {
      const ok = await Win32WindowEmbedder.getInstance().returnWindowFromDisplay(hwnd, bounds);
      if (ok) {
        this.movedWindows.delete(hwnd);
        return {
          success: true,
          message: `Returned "${tracked?.appName || 'Application'}" to Desktop.`,
        };
      }
      return { success: false, message: 'Could not restore window to desktop.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to return window' };
    }
  }

  public getAppsOnVirtual(): AppOnVirtualDisplay[] {
    return Array.from(this.movedWindows.values());
  }

  public async forwardVirtualInput(event: {
    normX: number;
    normY: number;
    inputType: 'click' | 'mouse_down' | 'mouse_up' | 'double_click' | 'context_menu' | 'wheel' | 'move' | 'char' | 'key';
    deltaX?: number;
    deltaY?: number;
    charCode?: number;
    keyCode?: number;
  }): Promise<boolean> {
    const status = await this.getStatus();
    const bounds = status.bounds || {
      x: 1920,
      y: 0,
      width: this.targetResolution.width,
      height: this.targetResolution.height,
    };

    const screenX = bounds.x + Math.round(event.normX * bounds.width);
    const screenY = bounds.y + Math.round(event.normY * bounds.height);

    return await Win32WindowEmbedder.getInstance().injectVirtualScreenInput({
      screenX,
      screenY,
      inputType: event.inputType,
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      charCode: event.charCode,
      keyCode: event.keyCode,
    });
  }
}
