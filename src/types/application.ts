export type PlatformType = 'win32' | 'darwin' | 'linux';

export type DisplayMode = 'live-monitor' | 'embedded' | 'launcher';

export interface InstalledApplication {
  id: string;
  name: string;
  executablePath: string;
  iconPath?: string;
  iconDataUrl?: string;
  platform: PlatformType;
  version?: string;
  description?: string;
  lastUsedAt?: string | null;
  isRunning?: boolean;
}

export interface RunningWindowInfo {
  id: string;
  sourceId: string; // desktopCapturer source ID (e.g. "window:12345:0")
  title: string;
  appName: string;
  executablePath?: string;
  processId: number;
  handle?: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  iconDataUrl?: string;
  thumbnailDataUrl?: string;
  isMinimized?: boolean;
}
