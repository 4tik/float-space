import { desktopCapturer, BrowserWindow } from 'electron';
import { IApplicationAdapter, PlatformCapabilities } from '../native/interfaces/application-adapter.interface';
import { WindowsApplicationAdapter } from '../native/windows/windows-adapter';
import { MacOSApplicationAdapter } from '../native/macos/macos-adapter';
import { LinuxApplicationAdapter } from '../native/linux/linux-adapter';
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

      // 3. Fetch native OS process-level running window info
      const adapterWindows = await this.adapter.getRunningWindows();

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

      // Integrate desktopCapturer sources
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

        // Clean app name extraction from title
        let appName = 'Application';
        if (title.includes(' - ')) {
          appName = title.split(' - ').pop()?.trim() || 'Application';
        }

        const iconUrl = source.appIcon ? source.appIcon.toDataURL() : undefined;
        const thumbUrl = source.thumbnail ? source.thumbnail.toDataURL() : undefined;

        const key = hwnd || source.id;
        resultMap.set(key, {
          id: `win-${key}`,
          sourceId: source.id,
          title,
          appName,
          processId: 0,
          handle: hwnd || undefined,
          iconDataUrl: iconUrl,
          thumbnailDataUrl: thumbUrl,
          isMinimized: false,
        });
      }

      // Merge native platform adapter windows (adding exact PID, executable path, and handles)
      for (const win of adapterWindows) {
        // Exclude Float-Space process and system windows
        if (win.processId === currentPid) continue;
        const lowerTitle = win.title.toLowerCase().trim();
        if (lowerTitle === 'float-space' || lowerTitle.startsWith('float-space') || lowerTitle.includes('floating monitor')) continue;
        if (systemTitles.has(lowerTitle)) continue;

        const key = win.handle || win.sourceId;

        if (resultMap.has(key)) {
          // Exact HWND match: enrich capturer source with exact PID & executable path
          const existing = resultMap.get(key)!;
          existing.processId = win.processId || existing.processId;
          existing.executablePath = win.executablePath || existing.executablePath;
          existing.handle = win.handle || existing.handle;
          if (win.appName && win.appName !== 'Application') {
            existing.appName = win.appName;
          }
        } else {
          // Check for matching title in case HWND string format differed
          let matchedKey: string | null = null;
          for (const [k, existing] of resultMap.entries()) {
            if (
              existing.title.toLowerCase() === lowerTitle ||
              (existing.title.length > 5 && lowerTitle.includes(existing.title.toLowerCase())) ||
              (lowerTitle.length > 5 && existing.title.toLowerCase().includes(lowerTitle))
            ) {
              matchedKey = k;
              break;
            }
          }

          if (matchedKey) {
            const existing = resultMap.get(matchedKey)!;
            existing.processId = win.processId || existing.processId;
            existing.executablePath = win.executablePath || existing.executablePath;
            existing.handle = win.handle || existing.handle;
            if (win.appName && win.appName !== 'Application') {
              existing.appName = win.appName;
            }
          } else {
            // New window not captured by desktopCapturer
            resultMap.set(key, win);
          }
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
