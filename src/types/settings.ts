export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  // General
  startOnStartup: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
  restorePreviousSession: boolean;
  
  // Floating Monitors defaults
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  defaultOpacity: number;
  defaultAlwaysOnTop: boolean;
  compactToolbar: boolean;
  hideToolbarOnInactive: boolean;

  // Appearance
  theme: ThemeMode;
  accentColor: string;
  enableAnimations: boolean;

  // Performance
  captureFrameRate: number; // 15, 30, 60
  previewQuality: 'low' | 'medium' | 'high';
  pauseInactivePreviews: boolean;

  // Shortcuts
  shortcutToggleAll: string;
  shortcutMissionControl: string;
  shortcutCreateMonitor: string;
  shortcutNextWorkspace: string;
  shortcutPrevWorkspace: string;
}

export interface Profile {
  id: string;
  name: string;
  description?: string;
  monitors: any[];
  createdAt: string;
  updatedAt: string;
}
