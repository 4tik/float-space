import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { LoggerService } from '../../services/logger.service';

function getElectronApp(): any {
  try {
    // Dynamic require so non-Electron test environments (like Vitest) do not throw
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

  private constructor() {
    this.ensureScript();
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

  /**
   * Ensures the PowerShell Win32 bridge script exists on disk.
   */
  private ensureScript(): string {
    if (this.scriptPath && fs.existsSync(this.scriptPath)) {
      return this.scriptPath;
    }

    // Try relative project script first
    const localPath = path.join(__dirname, 'scripts', 'win32-bridge.ps1');
    if (fs.existsSync(localPath)) {
      this.scriptPath = localPath;
      return this.scriptPath;
    }

    // Otherwise write to app user data directory
    try {
      const electronApp = getElectronApp();
      const userData = electronApp?.getPath ? electronApp.getPath('userData') : process.cwd();
      const targetDir = path.join(userData, 'scripts');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const targetFile = path.join(targetDir, 'win32-bridge.ps1');
      if (!fs.existsSync(targetFile)) {
        fs.writeFileSync(targetFile, SCRIPT_CONTENT, 'utf8');
      }
      this.scriptPath = targetFile;
      return this.scriptPath;
    } catch (err) {
      this.logger.error('Win32WindowEmbedder', 'Failed to provision win32-bridge.ps1', err);
      return localPath;
    }
  }

  /**
   * Evaluates if a given window can be embedded safely.
   */
  public static canEmbedWindow(processId: number, windowHandle?: string): { canEmbed: boolean; reason: string } {
    if (!Win32WindowEmbedder.isSupported()) {
      return {
        canEmbed: false,
        reason: 'Native window embedding is only supported on Windows Win32. On other platforms, high-performance live visual capture is active as standard.',
      };
    }

    if (!windowHandle || windowHandle === '0') {
      return {
        canEmbed: false,
        reason: 'Target application does not have a top-level Win32 window handle.',
      };
    }

    return {
      canEmbed: true,
      reason: 'Win32 top-level application window supports native interactive embedding (mouse clicks, keyboard typing, scrolling, and focus).',
    };
  }

  public canEmbedWindow(processId: number, windowHandle?: string): { canEmbed: boolean; reason: string } {
    return Win32WindowEmbedder.canEmbedWindow(processId, windowHandle);
  }

  /**
   * Reparents an external window into an Electron container handle.
   */
  public async embed(
    targetHwnd: string,
    containerHwnd: string,
    bounds: { width: number; height: number; titlebarHeight?: number }
  ): Promise<Win32EmbedResult> {
    if (!Win32WindowEmbedder.isSupported()) {
      return {
        supported: false,
        embedded: false,
        message: 'Native embedding is only supported on Windows.',
      };
    }

    const script = this.ensureScript();
    const titlebar = bounds.titlebarHeight ?? 32;
    const contentWidth = Math.max(bounds.width, 100);
    const contentHeight = Math.max(bounds.height - titlebar, 50);

    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${script}" -Action embed -TargetHwnd "${targetHwnd}" -ParentHwnd "${containerHwnd}" -X 0 -Y ${titlebar} -Width ${contentWidth} -Height ${contentHeight}`;

    try {
      this.logger.info('Win32WindowEmbedder', `Embedding target HWND ${targetHwnd} into container ${containerHwnd}`);
      const { stdout } = await execAsync(cmd);
      const res = JSON.parse(stdout.trim());

      if (res.success) {
        this.embeddedWindows.set(targetHwnd, {
          targetHwnd,
          containerHwnd,
          originalStyle: res.originalStyle,
        });

        return {
          supported: true,
          embedded: true,
          message: `Successfully attached target window into floating monitor. Native interaction is live.`,
          originalStyle: res.originalStyle,
        };
      } else {
        return {
          supported: true,
          embedded: false,
          message: res.error || 'Embedding failed. Falling back to live visual preview.',
        };
      }
    } catch (err: any) {
      this.logger.error('Win32WindowEmbedder', `Failed to embed window ${targetHwnd}`, err);
      return {
        supported: true,
        embedded: false,
        message: err.message || 'Execution error during native embedding.',
      };
    }
  }

  /**
   * Synchronizes child window bounds with floating monitor size and position.
   */
  public async syncBounds(
    targetHwnd: string,
    bounds: { width: number; height: number; titlebarHeight?: number }
  ): Promise<boolean> {
    if (!Win32WindowEmbedder.isSupported() || !targetHwnd || targetHwnd === '0') return false;

    const script = this.ensureScript();
    const titlebar = bounds.titlebarHeight ?? 32;
    const contentWidth = Math.max(bounds.width, 100);
    const contentHeight = Math.max(bounds.height - titlebar, 50);

    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${script}" -Action sync -TargetHwnd "${targetHwnd}" -X 0 -Y ${titlebar} -Width ${contentWidth} -Height ${contentHeight}`;

    try {
      await execAsync(cmd);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Restores an embedded window back to the desktop root.
   */
  public async detach(targetHwnd: string): Promise<boolean> {
    if (!Win32WindowEmbedder.isSupported() || !targetHwnd || targetHwnd === '0') return false;

    const tracked = this.embeddedWindows.get(targetHwnd);
    const script = this.ensureScript();
    const origStyleArg = tracked?.originalStyle ? ` -OriginalStyle ${tracked.originalStyle}` : '';
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${script}" -Action detach -TargetHwnd "${targetHwnd}"${origStyleArg}`;

    try {
      this.logger.info('Win32WindowEmbedder', `Detaching target HWND ${targetHwnd} back to desktop`);
      await execAsync(cmd);
      this.embeddedWindows.delete(targetHwnd);
      return true;
    } catch (err) {
      this.logger.error('Win32WindowEmbedder', `Failed to detach window ${targetHwnd}`, err);
      this.embeddedWindows.delete(targetHwnd);
      return false;
    }
  }

  /**
   * Detaches all tracked embedded windows safely before application exit.
   */
  public async detachAll(): Promise<void> {
    const hwnds = Array.from(this.embeddedWindows.keys());
    for (const hwnd of hwnds) {
      await this.detach(hwnd);
    }
  }

  /**
   * Activates and focuses the target window.
   */
  public async focusWindow(targetHwnd: string): Promise<boolean> {
    if (!Win32WindowEmbedder.isSupported() || !targetHwnd || targetHwnd === '0') return false;

    const script = this.ensureScript();
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${script}" -Action focus -TargetHwnd "${targetHwnd}"`;

    try {
      await execAsync(cmd);
      return true;
    } catch (err) {
      return false;
    }
  }
}

const SCRIPT_CONTENT = `# Win32 Bridge for Float-Space
param(
  [Parameter(Mandatory=$true)][string]$Action,
  [Parameter(Mandatory=$false)][string]$TargetHwnd,
  [Parameter(Mandatory=$false)][string]$ParentHwnd,
  [Parameter(Mandatory=$false)][int]$X = 0,
  [Parameter(Mandatory=$false)][int]$Y = 32,
  [Parameter(Mandatory=$false)][int]$Width = 480,
  [Parameter(Mandatory=$false)][int]$Height = 288,
  [Parameter(Mandatory=$false)][long]$OriginalStyle = 0
)

$code = @'
using System;
using System.Runtime.InteropServices;

public class Win32Native {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hWnd);
}
'@

try {
  if (-not ([System.Management.Automation.PSTypeName]'Win32Native').Type) {
    Add-Type -TypeDefinition $code -ErrorAction Stop
  }
} catch {}

$output = @{ success = $false; action = $Action }

try {
  $targetPtr = [IntPtr]::Zero
  if ($TargetHwnd -and $TargetHwnd -ne "0") {
    $targetPtr = [IntPtr][long]$TargetHwnd
  }

  $parentPtr = [IntPtr]::Zero
  if ($ParentHwnd -and $ParentHwnd -ne "0") {
    $parentPtr = [IntPtr][long]$ParentHwnd
  }

  if ($Action -eq "embed") {
    if ($targetPtr -eq [IntPtr]::Zero -or $parentPtr -eq [IntPtr]::Zero) {
      throw "Invalid window handles: Target=$TargetHwnd, Parent=$ParentHwnd"
    }

    if (-not [Win32Native]::IsWindow($targetPtr)) {
      throw "Target window does not exist or has closed."
    }

    $oldStyle = [Win32Native]::GetWindowLong($targetPtr, -16)
    $output["originalStyle"] = $oldStyle

    $newStyle = ($oldStyle -band (-bnot 0x80000000)) -bor 0x40000000 -bor 0x10000000
    [Win32Native]::SetWindowLong($targetPtr, -16, $newStyle) | Out-Null
    [Win32Native]::SetParent($targetPtr, $parentPtr) | Out-Null
    [Win32Native]::MoveWindow($targetPtr, $X, $Y, $Width, $Height, $true) | Out-Null
    [Win32Native]::ShowWindow($targetPtr, 5) | Out-Null
    [Win32Native]::SetForegroundWindow($targetPtr) | Out-Null

    $output["success"] = $true
    $output["message"] = "Embedded target $TargetHwnd into container $ParentHwnd"
  }
  elseif ($Action -eq "sync") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      [Win32Native]::MoveWindow($targetPtr, $X, $Y, $Width, $Height, $true) | Out-Null
      $output["success"] = $true
    }
  }
  elseif ($Action -eq "detach") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      [Win32Native]::SetParent($targetPtr, [IntPtr]::Zero) | Out-Null
      if ($OriginalStyle -ne 0) {
        [Win32Native]::SetWindowLong($targetPtr, -16, [int]$OriginalStyle) | Out-Null
      }
      [Win32Native]::ShowWindow($targetPtr, 9) | Out-Null
      $output["success"] = $true
      $output["message"] = "Detached target $TargetHwnd back to desktop"
    } else {
      $output["success"] = $true
      $output["message"] = "Window already destroyed or invalid"
    }
  }
  elseif ($Action -eq "focus") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      [Win32Native]::SetForegroundWindow($targetPtr) | Out-Null
      [Win32Native]::BringWindowToTop($targetPtr) | Out-Null
      $output["success"] = $true
    }
  }
} catch {
  $output["success"] = $false
  $output["error"] = $_.Exception.Message
}

$output | ConvertTo-Json -Compress
`;
