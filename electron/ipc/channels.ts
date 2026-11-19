export const IPC_CHANNELS = {
  // Floating Window Management
  WINDOW_CREATE: 'floating-window:create',
  WINDOW_CLOSE: 'floating-window:close',
  WINDOW_MINIMIZE: 'floating-window:minimize',
  WINDOW_MAXIMIZE: 'floating-window:maximize',
  WINDOW_RESTORE: 'floating-window:restore',
  WINDOW_SET_BOUNDS: 'floating-window:set-bounds',
  WINDOW_SET_OPACITY: 'floating-window:set-opacity',
  WINDOW_SET_ALWAYS_ON_TOP: 'floating-window:set-always-on-top',
  WINDOW_SET_LOCKED: 'floating-window:set-locked',
  WINDOW_SET_DISPLAY_MODE: 'floating-window:set-display-mode',
  WINDOW_GET_ALL: 'floating-window:get-all',
  WINDOW_HIDE_ALL: 'floating-window:hide-all',
  WINDOW_SHOW_ALL: 'floating-window:show-all',
  WINDOW_FOCUS_SOURCE: 'floating-window:focus-source',
  WINDOW_FORWARD_INPUT: 'floating-window:forward-input',
  WINDOW_DETACH: 'floating-window:detach',
  WINDOW_DUPLICATE: 'floating-window:duplicate',
  WINDOW_PRESENTATION_CONTROL: 'floating-window:presentation-control',
  WINDOW_STATE_CHANGED: 'floating-window:state-changed',
  WINDOW_BOUNDS_CHANGED: 'floating-window:bounds-changed',

  // Snapping & Display Layouts
  WINDOW_SNAP: 'floating-window:snap',
  WINDOW_AUTO_ARRANGE: 'floating-window:auto-arrange',
  DISPLAY_GET_ALL: 'display:get-all',
  DISPLAY_CHANGED: 'display:changed',

  // Application Discovery & Launcher
  APP_GET_INSTALLED: 'app:get-installed',
  APP_GET_RUNNING_WINDOWS: 'app:get-running-windows',
  APP_LAUNCH: 'app:launch',
  APP_FOCUS: 'app:focus',
  APP_GET_SOURCES: 'app:get-sources',

  // Workspaces & Groups
  WORKSPACE_GET_ALL: 'workspace:get-all',
  WORKSPACE_SAVE: 'workspace:save',
  WORKSPACE_DELETE: 'workspace:delete',
  WORKSPACE_SWITCH: 'workspace:switch',
  GROUP_GET_ALL: 'group:get-all',
  GROUP_SAVE: 'group:save',
  GROUP_DELETE: 'group:delete',

  // Layouts
  LAYOUT_GET_ALL: 'layout:get-all',
  LAYOUT_SAVE: 'layout:save',
  LAYOUT_DELETE: 'layout:delete',

  // Profiles & Presets
  PROFILE_GET_ALL: 'profile:get-all',
  PROFILE_SAVE: 'profile:save',
  PROFILE_APPLY: 'profile:apply',
  PROFILE_DELETE: 'profile:delete',

  // Settings & System
  SETTINGS_GET: 'settings:get',
  SETTINGS_SAVE: 'settings:save',
  SYSTEM_INFO: 'system:info',
  SYSTEM_MINIMIZE_MAIN: 'system:minimize-main',
  SYSTEM_MAXIMIZE_MAIN: 'system:maximize-main',
  SYSTEM_CLOSE_MAIN: 'system:close-main',

  // Database Management (FloatDesk Local Architecture)
  DB_GET_INFO: 'database:get-info',
  DB_CREATE_BACKUP: 'database:create-backup',
  DB_RESTORE_BACKUP: 'database:restore-backup',
  DB_EXPORT: 'database:export',
  DB_IMPORT: 'database:import',
  DB_CHECK_INTEGRITY: 'database:check-integrity',
  DB_RESET: 'database:reset',
  DB_OPEN_DIRECTORY: 'database:open-directory',

  // Native & Permissions
  PERMISSION_CHECK: 'permission:check',
  PERMISSION_REQUEST: 'permission:request',
  NATIVE_EMBED_SUPPORTED: 'native:embed-supported',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
