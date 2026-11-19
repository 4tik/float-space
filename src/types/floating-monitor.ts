import { DisplayMode } from './application';

export interface FloatingWindowConfig {
  id: string;
  applicationId?: string;
  sourceWindowId?: string; // Target running window ID for capture
  targetHwnd?: string; // Win32 Native HWND for interactive embedding
  processId?: number; // Target process ID
  executablePath?: string; // Target executable path
  appName?: string; // Target application display name
  url?: string; // Web monitor URL (when displayMode === 'web')
  isInteractive?: boolean; // Whether native interactive embedding is active
  interactionMessage?: string; // OS/Platform status explanation
  title: string;
  displayMode: DisplayMode;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  opacity: number; // 0.1 to 1.0
  alwaysOnTop: boolean;
  isLocked: boolean; // Locked prevents dragging and resizing
  isActive: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  workspaceId: string;
  groupId?: string;
  displayId?: number; // Target physical display index or ID
  compactToolbar: boolean;
  hideToolbar: boolean;
  captureFrameRate: number; // e.g. 15, 30, 60
  captureQuality: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export interface MonitorGroup {
  id: string;
  workspaceId: string;
  name: string;
  color?: string;
  sortOrder: number;
  isCollapsed?: boolean;
  monitorIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  monitorCount?: number;
}
