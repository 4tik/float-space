import { desktopCapturer, BrowserWindow } from 'electron';
import { IApplicationAdapter, PlatformCapabilities } from '../native/interfaces/application-adapter.interface';
import { WindowsApplicationAdapter } from '../native/windows/windows-adapter';
import { MacOSApplicationAdapter } from '../native/macos/macos-adapter';
import { LinuxApplicationAdapter } from '../native/linux/linux-adapter';
import { Win32WindowEmbedder } from '../native/windows/win32-embed';
import { InstalledApplication, RunningWindowInfo } from '../../src/types/application';
import { LoggerService } from './logger.service';

export class AppDiscoveryService {
  private static instance: AppDiscoveryService;
  private adapter: IApplicationAdapter;
  private logger = LoggerService.getInstance();

  private constructor() {
    switch (process.platform) {
      case 'win32':
        this.adapter = new WindowsApplicationAdapter();
        break;
      case 'darwin':
        this.adapter = new MacOSApplicationAdapter();
        break;
      case 'linux':
      default:
        this.adapter = new LinuxApplicationAdapter();
        break;
    }
    this.logger.info('AppDiscoveryService', `Initialized adapter for platform: ${process.platform}`);
  }

  public static getInstance(): AppDiscoveryService {
    if (!AppDiscoveryService.instance) {
      AppDiscoveryService.instance = new AppDiscoveryService();
    }
    return AppDiscoveryService.instance;
  }

  public getCapabilities(): PlatformCapabilities {
    return this.adapter.getCapabilities();
  }

  public async getInstalledApplications(): Promise<InstalledApplication[]> {
    try {
      return await this.adapter.getInstalledApplications();
    } catch (err: any) {
      this.logger.error('AppDiscoveryService', 'Failed to retrieve installed applications', err);
      return [];
    }
  }

  public async getRunningWindows(): Promise<RunningWindowInfo[]> {
    try {
      // 1. Identify all BrowserWindow native handles and PID belonging to Float-Space
      const floatSpaceHwnds = new Set<string>();
      const currentPid = process.pid;

      try {
        const allBrowserWindows = BrowserWindow.getAllWindows();
        for (const win of allBrowserWindows) {
          if (!win.isDestroyed()) {
            try {
              const rawHandle = win.getNativeWindowHandle();
              // Support 32-bit and 64-bit integer representations
              const hwnd32 = rawHandle.readUInt32LE(0).toString();
              const hwnd64 = rawHandle.readBigUInt64LE(0).toString();
              floatSpaceHwnds.add(hwnd32);
              floatSpaceHwnds.add(hwnd64);
            } catch {}
          }
        }
      } catch (err) {
        this.logger.warn('AppDiscoveryService', 'Failed to query Electron BrowserWindow handles', err);
      }

      // 2. Fetch desktopCapturer sources (provides native window title, real app icon & thumbnail)
      let capturerSources: Electron.DesktopCapturerSource[] = [];
      try {
        capturerSources = await desktopCapturer.getSources({
          types: ['window'],
          thumbnailSize: { width: 320, height: 180 },
          fetchWindowIcons: true,
        });
      } catch (e) {
        this.logger.warn('AppDiscoveryService', 'desktopCapturer not available or failed', e);
      }

      // Map indexed by unique HWND (or sourceId if HWND is unavailable)
      const resultMap = new Map<string, RunningWindowInfo>();

      // System / utility window titles to ignore
      const systemTitles = new Set([
        'program manager',
        'default ime',
        'msctfime ui',
        'windows input experience',
        'settings',
        'nvidia geforce overlay',
        'task host window',
      ]);

      // Integrate desktopCapturer sources with exact native process verification
      for (const source of capturerSources) {
        const title = source.name ? source.name.trim() : '';
        if (!title) continue;

        const lowerTitle = title.toLowerCase();
        if (systemTitles.has(lowerTitle)) continue;

        // Extract HWND from source ID format: "window:<hwnd>:0"
        const idParts = source.id.split(':');
        const hwnd = idParts.length >= 2 ? idParts[1] : '';

        // Exclude all windows belonging to Float-Space
        if (hwnd && floatSpaceHwnds.has(hwnd)) continue;
        if (lowerTitle === 'float-space' || lowerTitle.startsWith('float-space') || lowerTitle.includes('floating monitor')) continue;

        let appName = 'Application';
        if (title.includes(' - ')) {
          appName = title.split(' - ').pop()?.trim() || 'Application';
        }

        let processId = 0;
        let executablePath: string | undefined;

        // On Windows, query exact PID and process name using native Win32 GetWindowThreadProcessId
        if (process.platform === 'win32' && hwnd) {
          try {
            const pInfo = await Win32WindowEmbedder.getInstance().getWindowProcessInfo(hwnd);
            if (pInfo.success && pInfo.processId) {
              if (pInfo.processId === currentPid) continue;
              processId = pInfo.processId;
              if (pInfo.processName) {
                appName = pInfo.processName;
              }
              if (pInfo.executablePath) {
                executablePath = pInfo.executablePath;
              }
            }
          } catch {}
        }

        const iconUrl = source.appIcon ? source.appIcon.toDataURL() : undefined;
        const thumbUrl = source.thumbnail ? source.thumbnail.toDataURL() : undefined;

        const key = hwnd || source.id;
        resultMap.set(key, {
          id: `win-${key}`,
          sourceId: source.id,
          title,
          appName,
          processId,
          executablePath,
          handle: hwnd || undefined,
          iconDataUrl: iconUrl,
          thumbnailDataUrl: thumbUrl,
          isMinimized: false,
        });
      }

      // 3. Fetch native OS process-level running window info (for fallback/enrichment)
      const adapterWindows = await this.adapter.getRunningWindows();

      // Merge native platform adapter windows
      for (const win of adapterWindows) {
        if (win.processId === currentPid) continue;
        const lowerTitle = win.title.toLowerCase().trim();
        if (lowerTitle === 'float-space' || lowerTitle.startsWith('float-space') || lowerTitle.includes('floating monitor')) continue;
        if (systemTitles.has(lowerTitle)) continue;

        // Match against existing capturable windows by HWND or by Process ID
        let matchedKey: string | null = null;
        if (win.handle && resultMap.has(win.handle)) {
          matchedKey = win.handle;
        } else if (resultMap.has(win.sourceId)) {
          matchedKey = win.sourceId;
        } else {
          for (const [k, existing] of resultMap.entries()) {
            const pidMatches = win.processId && existing.processId && win.processId === existing.processId;
            const titleMatches =
              existing.title.toLowerCase() === lowerTitle ||
              (existing.title.length > 5 && lowerTitle.includes(existing.title.toLowerCase())) ||
              (lowerTitle.length > 5 && existing.title.toLowerCase().includes(lowerTitle));

            if (pidMatches || titleMatches) {
              matchedKey = k;
              break;
            }
          }
        }

        if (matchedKey) {
          // Enrich existing capturable window metadata without overwriting valid sourceId or HWND
          const existing = resultMap.get(matchedKey)!;
          existing.processId = existing.processId || win.processId;
          existing.executablePath = existing.executablePath || win.executablePath;
          if (win.appName && win.appName !== 'Application') {
            existing.appName = win.appName;
          }
        } else {
          // Truly unique window not captured by desktopCapturer (e.g. minimized)
          // Validate native handle before adding
          if (process.platform === 'win32' && win.handle) {
            const valid = await Win32WindowEmbedder.getInstance().validateWindow(win.handle, win.processId);
            if (!valid.valid) continue;
          }
          resultMap.set(win.handle || win.sourceId, win);
        }
      }

      // Exclude any window that belongs to Float-Space process ID
      const results: RunningWindowInfo[] = [];
      for (const win of resultMap.values()) {
        if (win.processId === currentPid) continue;
        if (win.handle && floatSpaceHwnds.has(win.handle)) continue;
        results.push(win);
      }

      return results.sort((a, b) => a.title.localeCompare(b.title));
    } catch (err: any) {
      this.logger.error('AppDiscoveryService', 'Failed to retrieve running windows', err);
      return [];
    }
  }

  public async launchApplication(executablePath: string) {
    this.logger.info('AppDiscoveryService', `Launching application: ${executablePath}`);
    return await this.adapter.launchApplication(executablePath);
  }

  public async focusWindow(windowId: string, processId?: number): Promise<boolean> {
    this.logger.info('AppDiscoveryService', `Focusing window: ${windowId}, pid: ${processId}`);
    return await this.adapter.focusWindow(windowId, processId);
  }
}
