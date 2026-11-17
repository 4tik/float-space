import { InstalledApplication, RunningWindowInfo } from '../../../src/types/application';

export interface PlatformCapabilities {
  platform: 'win32' | 'darwin' | 'linux';
  canEmbed: boolean;
  canCapture: boolean;
  requiresPermissions: boolean;
  desktopEnvironment?: string;
  notes: string;
}

export interface IApplicationAdapter {
  getInstalledApplications(): Promise<InstalledApplication[]>;
  getRunningWindows(): Promise<RunningWindowInfo[]>;
  launchApplication(executablePath: string): Promise<{ success: boolean; pid?: number; error?: string }>;
  focusWindow(windowId: string, processId?: number): Promise<boolean>;
  getCapabilities(): PlatformCapabilities;
}
