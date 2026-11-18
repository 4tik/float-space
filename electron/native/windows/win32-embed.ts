import { exec, spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { promisify } from 'util';
import { LoggerService } from '../../services/logger.service';
import { WIN32_BRIDGE_SCRIPT } from './win32-bridge-source';

function getElectronApp(): any {
  try {
    return require('electron')?.app;
  } catch {
    return null;
  }
}

const execAsync = promisify(exec);

export interface Win32EmbedResult {
  supported: boolean;
  embedded: boolean;
  message: string;
  originalStyle?: number;
}

interface TrackedWindow {
  targetHwnd: string;
  containerHwnd: string;
  originalStyle?: number;
}

export class Win32WindowEmbedder {
  private static instance: Win32WindowEmbedder;
  private logger = LoggerService.getInstance();
  private embeddedWindows: Map<string, TrackedWindow> = new Map();
  private scriptPath: string | null = null;

  // Persistent daemon process for zero-latency (<1ms) Win32 automation & input forwarding
  private daemonProcess: ChildProcess | null = null;
  private daemonReader: readline.Interface | null = null;
  private pendingRequests: Array<{ resolve: (val: any) => void; reject: (err: any) => void }> = [];
  private isDaemonReady = false;

  private constructor() {
    this.ensureScript();
    if (Win32WindowEmbedder.isSupported()) {
      this.initDaemon();
    }
  }

  public static getInstance(): Win32WindowEmbedder {
    if (!Win32WindowEmbedder.instance) {
      Win32WindowEmbedder.instance = new Win32WindowEmbedder();
    }
    return Win32WindowEmbedder.instance;
  }

  public static isSupported(): boolean {
    return process.platform === 'win32';
  }

  private ensureScript(): string {
    if (this.scriptPath && fs.existsSync(this.scriptPath)) {
      return this.scriptPath;
    }

    const candidatePaths = [
      path.join(__dirname, 'scripts', 'win32-bridge.ps1'),
      path.join(__dirname, 'win32-bridge.ps1'),
      path.join(process.cwd(), 'electron', 'native', 'windows', 'scripts', 'win32-bridge.ps1'),
      path.join(process.cwd(), 'dist', 'electron', 'native', 'windows', 'scripts', 'win32-bridge.ps1'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        this.scriptPath = p;
        return this.scriptPath;
      }
    }

    try {
      const electronApp = getElectronApp();
      const userData = electronApp?.getPath ? electronApp.getPath('userData') : process.cwd();
      const targetDir = path.join(userData, 'scripts');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const targetFile = path.join(targetDir, 'win32-bridge.ps1');
      fs.writeFileSync(targetFile, WIN32_BRIDGE_SCRIPT, 'utf8');
      this.scriptPath = targetFile;
      return this.scriptPath;
    } catch (err) {
      this.logger.error('Win32WindowEmbedder', 'Failed to resolve win32-bridge.ps1', err);
      return candidatePaths[0];
    }
  }

  private initDaemon(): void {
    const script = this.ensureScript();
    if (!fs.existsSync(script)) return;

    try {
      this.daemonProcess = spawn(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-Daemon'],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
        }
      );

      if (!this.daemonProcess.stdout || !this.daemonProcess.stdin) return;

      this.daemonReader = readline.createInterface({
        input: this.daemonProcess.stdout,
        terminal: false,
      });

      this.daemonReader.on('line', (line: string) => {
        const trimmed = line.trim();
        if (trimmed === 'READY') {
          this.isDaemonReady = true;
          this.logger.info('Win32WindowEmbedder', 'Persistent Win32 Bridge daemon initialized and ready');
          return;
        }

        const pending = this.pendingRequests.shift();
        if (pending) {
          try {
            const data = JSON.parse(trimmed);
            pending.resolve(data);
          } catch {
            pending.resolve({ success: false, raw: trimmed });
          }
        }
      });

      this.daemonProcess.on('exit', () => {
        this.isDaemonReady = false;
        this.daemonProcess = null;
        this.daemonReader = null;
        // Reject any pending promises
        while (this.pendingRequests.length > 0) {
          this.pendingRequests.shift()?.resolve({ success: false, error: 'Daemon process exited' });
        }
      });

      this.daemonProcess.on('error', (err) => {
        this.logger.error('Win32WindowEmbedder', 'Bridge daemon error', err);
      });
    } catch (err) {
      this.logger.error('Win32WindowEmbedder', 'Failed to spawn Win32 daemon', err);
    }
  }

  private async executeCommand(payload: any): Promise<any> {
    if (this.daemonProcess && this.isDaemonReady && this.daemonProcess.stdin && !this.daemonProcess.killed) {
      return new Promise((resolve, reject) => {
        this.pendingRequests.push({ resolve, reject });
        try {
          this.daemonProcess!.stdin!.write(JSON.stringify(payload) + '\n');
        } catch (e) {
          this.pendingRequests.pop();
          reject(e);
        }
      });
    }

    // Fallback: one-shot execution if daemon isn't ready
    const script = this.ensureScript();
    const args: string[] = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', `"${script}"`];
    for (const [k, v] of Object.entries(payload)) {
      const capKey = k.charAt(0).toUpperCase() + k.slice(1);
      args.push(`-${capKey} "${v}"`);
    }

    try {
      const { stdout } = await execAsync(`powershell ${args.join(' ')}`);
      return JSON.parse(stdout.trim());
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public static canEmbedWindow(processId: number, windowHandle?: string): { canEmbed: boolean; reason: string } {
    if (!Win32WindowEmbedder.isSupported()) {
      return {
        canEmbed: false,
        reason: 'Native window embedding is only supported on Windows Win32.',
      };
    }

    if (!windowHandle || windowHandle === '0') {
      return {
        canEmbed: false,
        reason: 'Target application does not have a valid top-level Win32 window handle.',
      };
    }

    return {
      canEmbed: true,
      reason: 'Win32 top-level application window supports interactive embedding.',
    };
  }

  public canEmbedWindow(processId: number, windowHandle?: string): { canEmbed: boolean; reason: string } {
    return Win32WindowEmbedder.canEmbedWindow(processId, windowHandle);
  }

  public async embed(
    targetHwnd: string,
    containerHwnd: string,
    bounds: { width: number; height: number; titlebarHeight?: number }
  ): Promise<Win32EmbedResult> {
    if (!Win32WindowEmbedder.isSupported()) {
      return { supported: false, embedded: false, message: 'Only supported on Windows.' };
    }

    const titlebar = bounds.titlebarHeight ?? 32;
    const contentWidth = Math.max(bounds.width, 100);
    const contentHeight = Math.max(bounds.height - titlebar, 50);

    try {
      const res = await this.executeCommand({
        action: 'embed',
        targetHwnd,
        parentHwnd: containerHwnd,
        x: 0,
        y: titlebar,
        width: contentWidth,
        height: contentHeight,
      });

      if (res && res.success) {
        this.embeddedWindows.set(targetHwnd, {
          targetHwnd,
          containerHwnd,
          originalStyle: res.originalStyle,
        });

        return {
          supported: true,
          embedded: true,
          message: 'Target application window embedded into floating monitor.',
          originalStyle: res.originalStyle,
        };
      }

      return {
        supported: true,
        embedded: false,
        message: res?.error || 'Native embedding unsuccessful. Falling back to live interactive mirror.',
      };
    } catch (err: any) {
      return {
        supported: true,
        embedded: false,
        message: err.message || 'Execution error during embedding.',
      };
    }
  }

  public async syncBounds(
    targetHwnd: string,
    bounds: { width: number; height: number; titlebarHeight?: number }
  ): Promise<boolean> {
    if (!Win32WindowEmbedder.isSupported() || !targetHwnd || targetHwnd === '0') return false;

    const titlebar = bounds.titlebarHeight ?? 32;
    const contentWidth = Math.max(bounds.width, 100);
    const contentHeight = Math.max(bounds.height - titlebar, 50);

    const res = await this.executeCommand({
      action: 'sync',
      targetHwnd,
      x: 0,
      y: titlebar,
      width: contentWidth,
      height: contentHeight,
    });

    return !!res?.success;
  }

  public async detach(targetHwnd: string): Promise<boolean> {
    if (!Win32WindowEmbedder.isSupported() || !targetHwnd || targetHwnd === '0') return false;

    const tracked = this.embeddedWindows.get(targetHwnd);
    const res = await this.executeCommand({
      action: 'detach',
      targetHwnd,
      originalStyle: tracked?.originalStyle ?? 0,
    });

    this.embeddedWindows.delete(targetHwnd);
    return !!res?.success;
  }

  public async detachAll(): Promise<void> {
    const hwnds = Array.from(this.embeddedWindows.keys());
    for (const hwnd of hwnds) {
      await this.detach(hwnd);
    }
    if (this.daemonProcess) {
      try {
        this.daemonProcess.stdin?.end();
        this.daemonProcess.kill();
      } catch {}
      this.daemonProcess = null;
      this.isDaemonReady = false;
    }
  }

  public async focusWindow(targetHwnd: string): Promise<boolean> {
    if (!Win32WindowEmbedder.isSupported() || !targetHwnd || targetHwnd === '0') return false;

    const res = await this.executeCommand({
      action: 'focus',
      targetHwnd,
    });

    return !!res?.success;
  }

  public async getWindowProcessInfo(
    targetHwnd: string
  ): Promise<{ success: boolean; processId?: number; processName?: string; executablePath?: string }> {
    if (!Win32WindowEmbedder.isSupported() || !targetHwnd || targetHwnd === '0') {
      return { success: false };
    }

    const res = await this.executeCommand({
      action: 'get_process',
      targetHwnd,
    });

    return res || { success: false };
  }

  public async validateWindow(
    targetHwnd: string,
    expectedPid?: number
  ): Promise<{ valid: boolean; reason?: string; actualPid?: number }> {
    if (!Win32WindowEmbedder.isSupported() || !targetHwnd || targetHwnd === '0') {
      return { valid: false, reason: 'Invalid native window handle' };
    }

    const res = await this.executeCommand({
      action: 'validate',
      targetHwnd,
      expectedPid,
    });

    if (!res || !res.exists) {
      return { valid: false, reason: 'Target native window no longer exists or was closed' };
    }

    if (expectedPid && expectedPid > 0 && !res.pidMatch) {
      return {
        valid: false,
        reason: `Window PID mismatch (expected ${expectedPid}, but window belongs to ${res.actualPid})`,
        actualPid: res.actualPid,
      };
    }

    return { valid: true, actualPid: res.actualPid };
  }

  public async forwardInput(
    targetHwnd: string,
    event: {
      type: 'click' | 'mouse_down' | 'mouse_up' | 'double_click' | 'context_menu' | 'wheel' | 'move' | 'char' | 'key';
      normX?: number;
      normY?: number;
      deltaX?: number;
      deltaY?: number;
      charCode?: number;
      keyCode?: number;
    }
  ): Promise<boolean> {
    if (!Win32WindowEmbedder.isSupported() || !targetHwnd || targetHwnd === '0') return false;

    const normX = typeof event.normX === 'number' ? event.normX : 0.5;
    const normY = typeof event.normY === 'number' ? event.normY : 0.5;
    const deltaX = Math.round(event.deltaX ?? 0);
    const deltaY = Math.round(event.deltaY ?? 0);
    const charCode = event.charCode ?? 0;
    const keyCode = event.keyCode ?? 0;

    const res = await this.executeCommand({
      action: 'input',
      targetHwnd,
      inputType: event.type,
      normX,
      normY,
      deltaX,
      deltaY,
      charCode,
      keyCode,
    });

    return !!res?.success;
  }
}
