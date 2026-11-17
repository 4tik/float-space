import { exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { IApplicationAdapter, PlatformCapabilities } from '../interfaces/application-adapter.interface';
import { InstalledApplication, RunningWindowInfo } from '../../../src/types/application';

const execAsync = promisify(exec);

export class MacOSApplicationAdapter implements IApplicationAdapter {
  public getCapabilities(): PlatformCapabilities {
    return {
      platform: 'darwin',
      canEmbed: false, // macOS security model strictly isolates WindowServer surfaces across sandboxed bundles
      canCapture: true,
      requiresPermissions: true,
      desktopEnvironment: 'Aqua / WindowServer',
      notes: 'Requires macOS Screen Recording and Accessibility permissions. Uses ScreenCaptureKit / desktopCapturer. Direct window reparenting is prohibited by macOS sandbox architecture.',
    };
  }

  public async getInstalledApplications(): Promise<InstalledApplication[]> {
    const apps: InstalledApplication[] = [];
    const searchDirs = ['/Applications', '/System/Applications', path.join(process.env.HOME || '', 'Applications')];

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          if (item.endsWith('.app')) {
            const appName = item.replace('.app', '');
            apps.push({
              id: `mac-${appName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              name: appName,
              executablePath: path.join(dir, item),
              platform: 'darwin',
            });
          }
        }
      } catch (err) {
        console.error(`Error reading ${dir}:`, err);
      }
    }

    return apps.sort((a, b) => a.name.localeCompare(b.name));
  }

  public async getRunningWindows(): Promise<RunningWindowInfo[]> {
    // On macOS, AppleScript can query System Events for process names and window titles
    const script = `
      osascript -e '
        tell application "System Events"
          set appList to every process whose background only is false
          set winList to {}
          repeat with p in appList
            set pName to name of p
            set pId to unix id of p
            try
              repeat with w in windows of p
                set wTitle to name of w
                if wTitle is not missing value and wTitle is not "" then
                  copy (pName & "|||" & pId & "|||" & wTitle) to end of winList
                end if
              end repeat
            end try
          end repeat
          return winList
        end tell
      '
    `;

    try {
      const { stdout } = await execAsync(script);
      const lines = stdout.split(',').map(s => s.trim()).filter(Boolean);
      return lines.map((line, idx) => {
        const [appName, pId, wTitle] = line.split('|||');
        const processId = parseInt(pId, 10) || 0;
        return {
          id: `mac-win-${processId}-${idx}`,
          sourceId: `window:${processId}:0`,
          title: wTitle || appName,
          appName: appName || 'Application',
          processId,
        };
      });
    } catch {
      return [];
    }
  }

  public async launchApplication(executablePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      spawn('open', ['-a', executablePath], { detached: true, stdio: 'ignore' }).unref();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async focusWindow(windowId: string, processId?: number): Promise<boolean> {
    try {
      if (processId) {
        await execAsync(`osascript -e 'tell application "System Events" to set frontmost of (first process whose unix id is ${processId}) to true'`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}
