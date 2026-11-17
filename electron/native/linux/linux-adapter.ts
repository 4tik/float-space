import { exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { IApplicationAdapter, PlatformCapabilities } from '../interfaces/application-adapter.interface';
import { InstalledApplication, RunningWindowInfo } from '../../../src/types/application';

const execAsync = promisify(exec);

export class LinuxApplicationAdapter implements IApplicationAdapter {
  private isWayland(): boolean {
    return !!(process.env.WAYLAND_DISPLAY || (process.env.XDG_SESSION_TYPE && process.env.XDG_SESSION_TYPE.toLowerCase() === 'wayland'));
  }

  public getCapabilities(): PlatformCapabilities {
    const wayland = this.isWayland();
    return {
      platform: 'linux',
      canEmbed: !wayland, // X11 XReparentWindow is supported; Wayland strictly enforces compositor-level surface isolation
      canCapture: true,
      requiresPermissions: wayland,
      desktopEnvironment: process.env.XDG_CURRENT_DESKTOP || (wayland ? 'Wayland Compositor' : 'X11 Desktop'),
      notes: wayland
        ? 'Running under Wayland: PipeWire / XDG Desktop Portal is used for low-latency live capture. Window reparenting is restricted by Wayland protocol security.'
        : 'Running under X11: X11 window enumeration and desktopCapturer active. XReparentWindow is technically available on X11.',
    };
  }

  public async getInstalledApplications(): Promise<InstalledApplication[]> {
    const apps: InstalledApplication[] = [];
    const searchDirs = [
      '/usr/share/applications',
      '/usr/local/share/applications',
      path.join(process.env.HOME || '', '.local', 'share', 'applications'),
    ];

    const seenExecs = new Set<string>();

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (!file.endsWith('.desktop')) continue;
          const fullPath = path.join(dir, file);
          const parsed = this.parseDesktopFile(fullPath);
          if (parsed && !parsed.noDisplay && parsed.exec && !seenExecs.has(parsed.name.toLowerCase())) {
            seenExecs.add(parsed.name.toLowerCase());
            apps.push({
              id: `linux-${file.replace('.desktop', '').toLowerCase()}`,
              name: parsed.name,
              executablePath: parsed.exec,
              iconPath: parsed.icon,
              platform: 'linux',
            });
          }
        }
      } catch (err) {
        console.error(`Error reading ${dir}:`, err);
      }
    }

    return apps.sort((a, b) => a.name.localeCompare(b.name));
  }

  private parseDesktopFile(filePath: string): { name: string; exec: string; icon?: string; noDisplay?: boolean } | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      let name = '';
      let execCmd = '';
      let icon = '';
      let noDisplay = false;
      let inMainSection = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '[Desktop Entry]') {
          inMainSection = true;
          continue;
        } else if (trimmed.startsWith('[') && trimmed !== '[Desktop Entry]') {
          inMainSection = false;
        }

        if (!inMainSection) continue;

        if (trimmed.startsWith('Name=') && !name) {
          name = trimmed.substring(5);
        } else if (trimmed.startsWith('Exec=') && !execCmd) {
          execCmd = trimmed.substring(5).split(/\s+/)[0]; // Remove arguments like %U, %F
        } else if (trimmed.startsWith('Icon=') && !icon) {
          icon = trimmed.substring(5);
        } else if (trimmed.startsWith('NoDisplay=true')) {
          noDisplay = true;
        }
      }

      if (name && execCmd) {
        return { name, exec: execCmd, icon, noDisplay };
      }
    } catch {}
    return null;
  }

  public async getRunningWindows(): Promise<RunningWindowInfo[]> {
    if (this.isWayland()) {
      return [];
    }

    try {
      // Use wmctrl if available on X11
      const { stdout } = await execAsync('wmctrl -l -p');
      const lines = stdout.trim().split('\n');
      return lines.map(line => {
        const parts = line.split(/\s+/);
        const winId = parts[0];
        const pid = parseInt(parts[2], 10) || 0;
        const title = parts.slice(4).join(' ');
        return {
          id: `linux-win-${winId}`,
          sourceId: `window:${winId}:0`,
          title: title || 'Application Window',
          appName: 'Linux App',
          processId: pid,
          handle: winId,
        };
      });
    } catch {
      return [];
    }
  }

  public async launchApplication(executablePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      spawn(executablePath, [], { detached: true, stdio: 'ignore' }).unref();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async focusWindow(windowId: string, processId?: number): Promise<boolean> {
    try {
      const hexId = windowId.replace('linux-win-', '');
      await execAsync(`wmctrl -i -a ${hexId}`);
      return true;
    } catch {
      return false;
    }
  }
}
