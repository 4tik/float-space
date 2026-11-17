export const CURRENT_SCHEMA_VERSION = 2;

export const INITIAL_SCHEMA_SQL = `
-- Migration version tracking
CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 1. Applications
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  executable_path TEXT,
  icon_path TEXT,
  icon_data_url TEXT,
  platform TEXT NOT NULL,
  version TEXT,
  description TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Monitor Groups
CREATE TABLE IF NOT EXISTS monitor_groups (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_collapsed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- 4. Floating Monitors
CREATE TABLE IF NOT EXISTS floating_monitors (
  id TEXT PRIMARY KEY,
  application_id TEXT,
  source_window_id TEXT,
  title TEXT NOT NULL,
  display_mode TEXT NOT NULL DEFAULT 'live-monitor',
  position_x INTEGER NOT NULL DEFAULT 100,
  position_y INTEGER NOT NULL DEFAULT 100,
  width INTEGER NOT NULL DEFAULT 480,
  height INTEGER NOT NULL DEFAULT 320,
  opacity REAL NOT NULL DEFAULT 1.0,
  always_on_top INTEGER NOT NULL DEFAULT 1,
  is_locked INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_minimized INTEGER NOT NULL DEFAULT 0,
  is_maximized INTEGER NOT NULL DEFAULT 0,
  workspace_id TEXT,
  group_id TEXT,
  display_id INTEGER DEFAULT 0,
  compact_toolbar INTEGER NOT NULL DEFAULT 0,
  hide_toolbar INTEGER NOT NULL DEFAULT 0,
  capture_frame_rate INTEGER NOT NULL DEFAULT 30,
  capture_quality TEXT NOT NULL DEFAULT 'medium',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL,
  FOREIGN KEY (group_id) REFERENCES monitor_groups(id) ON DELETE SET NULL
);

-- 5. Workspace Monitors (Junction & Configuration)
CREATE TABLE IF NOT EXISTS workspace_monitors (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  monitor_id TEXT NOT NULL,
  group_id TEXT,
  display_id INTEGER DEFAULT 0,
  configuration_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (monitor_id) REFERENCES floating_monitors(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES monitor_groups(id) ON DELETE SET NULL
);

-- 6. Layouts
CREATE TABLE IF NOT EXISTS layouts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  layout_type TEXT NOT NULL DEFAULT 'grid',
  display_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. Layout Monitors
CREATE TABLE IF NOT EXISTS layout_monitors (
  id TEXT PRIMARY KEY,
  layout_id TEXT NOT NULL,
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  snap_preset TEXT,
  configuration_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (layout_id) REFERENCES layouts(id) ON DELETE CASCADE
);

-- 8. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. Profile Monitors
CREATE TABLE IF NOT EXISTS profile_monitors (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  application_id TEXT,
  configuration_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
);

-- 10. Application Settings
CREATE TABLE IF NOT EXISTS application_settings (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 11. Keyboard Shortcuts
CREATE TABLE IF NOT EXISTS keyboard_shortcuts (
  id TEXT PRIMARY KEY,
  action_id TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  accelerator TEXT NOT NULL,
  is_global INTEGER NOT NULL DEFAULT 1,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 12. Display Configurations
CREATE TABLE IF NOT EXISTS display_configurations (
  id TEXT PRIMARY KEY,
  display_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  bounds_x INTEGER NOT NULL,
  bounds_y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  scale_factor REAL NOT NULL DEFAULT 1.0,
  is_primary INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 13. Session History
CREATE TABLE IF NOT EXISTS session_history (
  id TEXT PRIMARY KEY,
  session_start TEXT NOT NULL,
  session_end TEXT,
  active_workspace_id TEXT,
  monitors_count INTEGER NOT NULL DEFAULT 0,
  state_snapshot_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_apps_name ON applications(name);
CREATE INDEX IF NOT EXISTS idx_monitors_workspace ON floating_monitors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_monitors_group ON floating_monitors(group_id);
CREATE INDEX IF NOT EXISTS idx_monitors_active ON floating_monitors(is_active);
CREATE INDEX IF NOT EXISTS idx_groups_workspace ON monitor_groups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ws_monitors_ws ON workspace_monitors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_layout_monitors_layout ON layout_monitors(layout_id);
CREATE INDEX IF NOT EXISTS idx_profile_monitors_profile ON profile_monitors(profile_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON application_settings(key);
CREATE INDEX IF NOT EXISTS idx_keyboard_shortcuts_action ON keyboard_shortcuts(action_id);
`;
