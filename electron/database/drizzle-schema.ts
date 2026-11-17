// Drizzle ORM Schema Definitions & Types for FloatDesk Local Database Architecture

export type ColumnType = 'text' | 'integer' | 'real';

export interface ColumnBuilder<T = any> {
  name: string;
  type: ColumnType;
  isPrimaryKey?: boolean;
  isNotNull?: boolean;
  isUnique?: boolean;
  defaultValue?: T;
  references?: () => any;
  primaryKey: () => ColumnBuilder<T>;
  notNull: () => ColumnBuilder<T>;
  unique: () => ColumnBuilder<T>;
  default: (val: T) => ColumnBuilder<T>;
}

function createColumn<T = any>(name: string, type: ColumnType): ColumnBuilder<T> {
  const col: ColumnBuilder<T> = {
    name,
    type,
    primaryKey() {
      this.isPrimaryKey = true;
      return this;
    },
    notNull() {
      this.isNotNull = true;
      return this;
    },
    unique() {
      this.isUnique = true;
      return this;
    },
    default(val: T) {
      this.defaultValue = val;
      return this;
    },
    references(fn?: any) {
      this.references = fn;
      return this;
    },
  };
  return col;
}

export function text(name: string): ColumnBuilder<string> {
  return createColumn<string>(name, 'text');
}

export function integer(name: string): ColumnBuilder<number> {
  return createColumn<number>(name, 'integer');
}

export function real(name: string): ColumnBuilder<number> {
  return createColumn<number>(name, 'real');
}

export function sqliteTable<T extends Record<string, ColumnBuilder>>(name: string, columns: T) {
  return {
    tableName: name,
    columns,
  };
}

/**
 * 1. Applications Table
 */
export const applications = sqliteTable('applications', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  executablePath: text('executable_path'),
  iconPath: text('icon_path'),
  iconDataUrl: text('icon_data_url'),
  platform: text('platform').notNull(),
  version: text('version'),
  description: text('description'),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * 2. Workspaces Table
 */
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * 3. Monitor Groups Table
 */
export const monitorGroups = sqliteTable('monitor_groups', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  color: text('color'),
  sortOrder: integer('sort_order').notNull().default(0),
  isCollapsed: integer('is_collapsed').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * 4. Floating Monitors Table
 */
export const floatingMonitors = sqliteTable('floating_monitors', {
  id: text('id').primaryKey(),
  applicationId: text('application_id'),
  sourceWindowId: text('source_window_id'),
  title: text('title').notNull(),
  displayMode: text('display_mode').notNull().default('live-monitor'),
  positionX: integer('position_x').notNull().default(100),
  positionY: integer('position_y').notNull().default(100),
  width: integer('width').notNull().default(480),
  height: integer('height').notNull().default(320),
  opacity: real('opacity').notNull().default(1.0),
  alwaysOnTop: integer('always_on_top').notNull().default(1),
  isLocked: integer('is_locked').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  isMinimized: integer('is_minimized').notNull().default(0),
  isMaximized: integer('is_maximized').notNull().default(0),
  workspaceId: text('workspace_id'),
  groupId: text('group_id'),
  displayId: integer('display_id').default(0),
  compactToolbar: integer('compact_toolbar').notNull().default(0),
  hideToolbar: integer('hide_toolbar').notNull().default(0),
  captureFrameRate: integer('capture_frame_rate').notNull().default(30),
  captureQuality: text('capture_quality').notNull().default('medium'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * 5. Workspace Monitors Junction Table
 */
export const workspaceMonitors = sqliteTable('workspace_monitors', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  monitorId: text('monitor_id').notNull(),
  groupId: text('group_id'),
  displayId: integer('display_id').default(0),
  configurationJson: text('configuration_json'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * 6. Layouts Table
 */
export const layouts = sqliteTable('layouts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  layoutType: text('layout_type').notNull().default('grid'),
  displayCount: integer('display_count').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * 7. Layout Monitors Table
 */
export const layoutMonitors = sqliteTable('layout_monitors', {
  id: text('id').primaryKey(),
  layoutId: text('layout_id').notNull(),
  positionX: integer('position_x').notNull(),
  positionY: integer('position_y').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  snapPreset: text('snap_preset'),
  configurationJson: text('configuration_json'),
  createdAt: text('created_at').notNull(),
});

/**
 * 8. Profiles Table
 */
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  isDefault: integer('is_default').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * 9. Profile Monitors Table
 */
export const profileMonitors = sqliteTable('profile_monitors', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull(),
  applicationId: text('application_id'),
  configurationJson: text('configuration_json').notNull(),
  createdAt: text('created_at').notNull(),
});

/**
 * 10. Application Settings Table
 */
export const applicationSettings = sqliteTable('application_settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  category: text('category').notNull().default('general'),
  updatedAt: text('updated_at').notNull(),
});

/**
 * 11. Keyboard Shortcuts Table
 */
export const keyboardShortcuts = sqliteTable('keyboard_shortcuts', {
  id: text('id').primaryKey(),
  actionId: text('action_id').notNull().unique(),
  label: text('label').notNull(),
  accelerator: text('accelerator').notNull(),
  isGlobal: integer('is_global').notNull().default(1),
  isEnabled: integer('is_enabled').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});

/**
 * 12. Display Configurations Table
 */
export const displayConfigurations = sqliteTable('display_configurations', {
  id: text('id').primaryKey(),
  displayId: integer('display_id').notNull(),
  label: text('label').notNull(),
  boundsX: integer('bounds_x').notNull(),
  boundsY: integer('bounds_y').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  scaleFactor: real('scale_factor').notNull().default(1.0),
  isPrimary: integer('is_primary').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

/**
 * 13. Session History Table
 */
export const sessionHistory = sqliteTable('session_history', {
  id: text('id').primaryKey(),
  sessionStart: text('session_start').notNull(),
  sessionEnd: text('session_end'),
  activeWorkspaceId: text('active_workspace_id'),
  monitorsCount: integer('monitors_count').notNull().default(0),
  stateSnapshotJson: text('state_snapshot_json'),
  createdAt: text('created_at').notNull(),
});
