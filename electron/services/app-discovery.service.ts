import { desktopCapturer } from 'electron';
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
      // 1. Get desktop capturer sources which gives native OS window names, icons & thumbnails
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

      // 2. Get process-level running window info from native platform adapter
      const adapterWindows = await this.adapter.getRunningWindows();
      const resultMap = new Map<string, RunningWindowInfo>();

      // Integrate desktopCapturer sources (which are guaranteed to be capturable)
      for (const source of capturerSources) {
        // Skip our own floating windows from becoming capture sources of themselves
        if (source.name.includes('Floating Monitor')) continue;

        const iconUrl = source.appIcon ? source.appIcon.toDataURL() : undefined;
        const thumbUrl = source.thumbnail ? source.thumbnail.toDataURL() : undefined;

        resultMap.set(source.id, {
          id: source.id,
          sourceId: source.id,
          title: source.name,
          appName: source.name.split(' - ').pop() || source.name,
          processId: 0,
          iconDataUrl: iconUrl,
          thumbnailDataUrl: thumbUrl,
          isMinimized: false,
        });
      }

      // Merge native adapter windows
      for (const win of adapterWindows) {
        // Check if an existing capturer source matches the window title
        let matched = false;
        for (const [key, existing] of resultMap.entries()) {
          if (existing.title.toLowerCase().includes(win.title.toLowerCase()) || win.title.toLowerCase().includes(existing.title.toLowerCase())) {
            existing.processId = win.processId;
            existing.executablePath = win.executablePath;
            existing.handle = win.handle;
            matched = true;
            break;
          }
        }

        if (!matched && !resultMap.has(win.sourceId)) {
          resultMap.set(win.id, win);
        }
      }

      return Array.from(resultMap.values());
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
