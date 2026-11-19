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
      const currentPid = process.pid;

      if (process.platform === 'win32') {
        try {
          const win32Windows = await Win32WindowEmbedder.getInstance().getRunningWindows(currentPid);
          if (win32Windows && win32Windows.length > 0) {
            // Also collect current Electron BrowserWindow handles to ensure Float-Space windows are excluded
            const floatSpaceHwnds = new Set<string>();
            try {
              const allBrowserWindows = BrowserWindow.getAllWindows();
              for (const win of allBrowserWindows) {
                if (!win.isDestroyed()) {
                  const rawHandle = win.getNativeWindowHandle();
                  floatSpaceHwnds.add(rawHandle.readUInt32LE(0).toString());
                  floatSpaceHwnds.add(rawHandle.readBigUInt64LE(0).toString());
                }
              }
            } catch {}

            return win32Windows
              .filter((w) => {
                if (w.processId === currentPid) return false;
                if (w.handle && floatSpaceHwnds.has(w.handle)) return false;
                const lower = w.title.toLowerCase();
                if (lower === 'float-space' || lower.startsWith('float-space') || lower.includes('floating monitor')) return false;
                return true;
              })
              .sort((a, b) => a.title.localeCompare(b.title));
          }
        } catch (err) {
          this.logger.error('AppDiscoveryService', 'Win32 bridge native window enumeration failed', err);
        }
      }

      // Fallback for macOS/Linux or if bridge is unavailable
      const adapterWindows = await this.adapter.getRunningWindows();
      return adapterWindows
        .filter((w) => {
          if (w.processId === currentPid) return false;
          const lower = w.title.toLowerCase();
          if (lower === 'float-space' || lower.startsWith('float-space') || lower.includes('floating monitor')) return false;
          return true;
        })
        .sort((a, b) => a.title.localeCompare(b.title));
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
