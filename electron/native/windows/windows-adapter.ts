import { exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { IApplicationAdapter, PlatformCapabilities } from '../interfaces/application-adapter.interface';
import { InstalledApplication, RunningWindowInfo } from '../../../src/types/application';

const execAsync = promisify(exec);

export class WindowsApplicationAdapter implements IApplicationAdapter {
  public getCapabilities(): PlatformCapabilities {
    return {
      platform: 'win32',
      canEmbed: true,
      canCapture: true,
      requiresPermissions: false,
      desktopEnvironment: 'Windows Shell (DWM)',
      notes: 'Direct Win32 Window Handle inspection and desktopCapturer preview available. Deep reparenting (SetParent) supported with boundary isolation.',
    };
  }

  public async getInstalledApplications(): Promise<InstalledApplication[]> {
    const apps: InstalledApplication[] = [];
    const seenNames = new Set<string>();

    const searchDirs = [
      path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    ];

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      this.scanDirectoryForShortcuts(dir, apps, seenNames);
    }

    // Add standard Windows utilities if not found
    const commonApps = [
      { name: 'Notepad', exec: 'notepad.exe' },
      { name: 'Calculator', exec: 'calc.exe' },
      { name: 'File Explorer', exec: 'explorer.exe' },
      { name: 'Command Prompt', exec: 'cmd.exe' },
      { name: 'PowerShell', exec: 'powershell.exe' },
      { name: 'Task Manager', exec: 'taskmgr.exe' },
    ];

    for (const app of commonApps) {
      if (!seenNames.has(app.name.toLowerCase())) {
        apps.push({
          id: `win-${app.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: app.name,
          executablePath: app.exec,
          platform: 'win32',
        });
        seenNames.add(app.name.toLowerCase());
      }
    }

    return apps.sort((a, b) => a.name.localeCompare(b.name));
  }

  private scanDirectoryForShortcuts(
    dir: string,
    apps: InstalledApplication[],
    seenNames: Set<string>,
    depth = 0
  ): void {
    if (depth > 4) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          this.scanDirectoryForShortcuts(fullPath, apps, seenNames, depth + 1);
        } else if (entry.isFile() && (entry.name.endsWith('.lnk') || entry.name.endsWith('.exe'))) {
          const appName = entry.name.replace(/\.(lnk|exe)$/i, '');
          const lower = appName.toLowerCase();
          if (
            !seenNames.has(lower) &&
            !lower.includes('uninstall') &&
            !lower.includes('help') &&
            !lower.includes('readme')
          ) {
            seenNames.add(lower);
            apps.push({
              id: `win-${lower.replace(/[^a-z0-9]/g, '-')}`,
              name: appName,
              executablePath: fullPath,
              platform: 'win32',
            });
          }
        }
      }
    } catch (err) {
      // Ignore read errors for restricted folders
    }
  }

  public async getRunningWindows(): Promise<RunningWindowInfo[]> {
    const currentPid = process.pid;
    const psScript = `
      Get-Process | Where-Object {
        $_.MainWindowTitle -and
        $_.MainWindowHandle -ne 0 -and
        $_.Id -ne ${currentPid} -and
        $_.ProcessName -notmatch '^(TextInputHost|ShellExperienceHost|dwm|csrss|smss|lsass|SystemSettings|SearchApp|StartMenuExperienceHost|LockApp)$'
      } | Where-Object {
        $_.MainWindowTitle.Trim() -ne '' -and
        $_.MainWindowTitle -ne 'Program Manager' -and
        $_.MainWindowTitle -ne 'Float-Space' -and
        $_.MainWindowTitle -notlike 'Floating Monitor*'
      } | Select-Object Id, ProcessName, MainWindowTitle, MainWindowHandle, Path |
      ConvertTo-Json -Compress
    `;

    try {
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`);
      if (!stdout || stdout.trim() === '') return [];

      let rawData: any;
      try {
        rawData = JSON.parse(stdout.trim());
      } catch {
        return [];
      }

      const list = Array.isArray(rawData) ? rawData : [rawData];
      return list.map((item: any) => ({
        id: `win-${item.MainWindowHandle}`,
        sourceId: `window:${item.MainWindowHandle}:0`,
        title: item.MainWindowTitle || item.ProcessName,
        appName: item.ProcessName || 'Application',
        executablePath: item.Path || undefined,
        processId: item.Id,
        handle: String(item.MainWindowHandle),
        isMinimized: false,
      }));
    } catch (err) {
      console.error('Failed to get running windows on Windows:', err);
      return [];
    }
  }

  public async launchApplication(
    executablePath: string
  ): Promise<{ success: boolean; pid?: number; error?: string }> {
    try {
      const child = spawn(executablePath, [], {
        detached: true,
        stdio: 'ignore',
        shell: true,
      });
      child.unref();
      return { success: true, pid: child.pid };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to launch application' };
    }
  }

  public async focusWindow(windowId: string, processId?: number): Promise<boolean> {
    if (!processId) {
      const pidMatch = windowId.match(/\d+/);
      if (pidMatch) processId = parseInt(pidMatch[0], 10);
    }

    if (!processId) return false;

    try {
      const psScript = `
        $wshell = New-Object -ComObject Wscript.Shell
        $wshell.AppActivate(${processId})
      `;
      await execAsync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`);
      return true;
    } catch (err) {
      console.error('Failed to focus window:', err);
      return false;
    }
  }
}
