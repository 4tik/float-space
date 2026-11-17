import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import initSqlJs, { Database } from 'sql.js';
import { INITIAL_SCHEMA_SQL, CURRENT_SCHEMA_VERSION } from '../electron/database/schema';
import { MigrationRunner, MIGRATIONS } from '../electron/database/migrations';
import { ApplicationRepository } from '../electron/database/repositories/application.repo';
import { FloatingMonitorRepository } from '../electron/database/repositories/floating-monitor.repo';
import { WorkspaceRepository } from '../electron/database/repositories/workspace.repo';
import { LayoutRepository } from '../electron/database/repositories/layout.repo';
import { ProfileRepository } from '../electron/database/repositories/profile.repo';
import { SettingsRepository } from '../electron/database/repositories/settings.repo';
import { KeyboardShortcutRepository } from '../electron/database/repositories/shortcut.repo';
import { DisplayConfigurationRepository } from '../electron/database/repositories/display.repo';
import { SessionHistoryRepository } from '../electron/database/repositories/session.repo';
import { BackupRepository } from '../electron/database/repositories/backup.repo';

describe('Float-Space Mandatory Local SQLite Architecture', () => {
  let db: Database;
  let testDir: string;
  let databaseDir: string;
  let backupsDir: string;
  let metadataPath: string;
  let dbPath: string;

  beforeEach(async () => {
    testDir = path.join(process.cwd(), '.test-data-' + Date.now());
    databaseDir = path.join(testDir, 'database');
    backupsDir = path.join(databaseDir, 'backups');
    metadataPath = path.join(databaseDir, 'metadata.json');
    dbPath = path.join(databaseDir, 'floatdesk.db');

    fs.mkdirSync(backupsDir, { recursive: true });

    const SQL = await initSqlJs();
    db = new SQL.Database();
    db.run("PRAGMA foreign_keys = ON;");
    db.run("PRAGMA journal_mode = WAL;");
    db.run("PRAGMA synchronous = NORMAL;");
    const runner = new MigrationRunner();
    await runner.runMigrations(db, async () => null);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('1. should create all 13 required FloatDesk tables with primary and foreign keys', () => {
    const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name ASC;");
    const tables = res[0].values.map((v) => v[0]);

    const requiredTables = [
      'applications',
      'floating_monitors',
      'workspaces',
      'monitor_groups',
      'workspace_monitors',
      'layouts',
      'layout_monitors',
      'profiles',
      'profile_monitors',
      'application_settings',
      'keyboard_shortcuts',
      'display_configurations',
      'session_history',
    ];

    for (const table of requiredTables) {
      expect(tables).toContain(table);
    }
  });

  it('2. should enforce foreign key constraints', () => {
    // Attempting to insert a monitor_group with non-existent workspace_id must fail
    expect(() => {
      db.run(
        "INSERT INTO monitor_groups (id, workspace_id, name, sort_order) VALUES ('g1', 'non-existent-ws', 'Test', 0)"
      );
    }).toThrow();
  });

  it('3. should run migration runner and track version in _migrations', async () => {
    const SQL = await initSqlJs();
    const freshDb = new SQL.Database();
    freshDb.run("PRAGMA foreign_keys = ON;");

    let backupCalled = false;
    const runner = new MigrationRunner();
    const result = await runner.runMigrations(freshDb, async () => {
      backupCalled = true;
      return 'backup.db';
    });

    expect(result.applied).toBeGreaterThan(0);
    expect(result.currentVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(backupCalled).toBe(true);

    const migRows = freshDb.exec("SELECT version, name FROM _migrations ORDER BY version ASC");
    expect(migRows[0].values.length).toBe(MIGRATIONS.length);
    expect(migRows[0].values[0][0]).toBe(1);
    expect(migRows[0].values[1][0]).toBe(2);
  });

  it('4. should pass PRAGMA integrity_check', () => {
    const res = db.exec("PRAGMA integrity_check;");
    expect(res[0].values[0][0]).toBe('ok');
  });

  it('5. should manage backups, metadata.json, and retention limits', () => {
    const backupRepo = new BackupRepository(databaseDir, backupsDir, metadataPath, dbPath, 3);
    const dbData = db.export();

    // Create 4 backups to test retention limit of 3
    backupRepo.createBackup(dbData, 'backup-1');
    backupRepo.createBackup(dbData, 'backup-2');
    backupRepo.createBackup(dbData, 'backup-3');
    backupRepo.createBackup(dbData, 'backup-4');

    const meta = backupRepo.getMetadata();
    expect(meta.backups.length).toBe(3); // Capped at maxRetention 3
    expect(fs.existsSync(metadataPath)).toBe(true);
  });

  it('6. should validate and restore database from backup file', async () => {
    const backupRepo = new BackupRepository(databaseDir, backupsDir, metadataPath, dbPath);
    const dbData = db.export();

    // Write initial database file
    fs.writeFileSync(dbPath, Buffer.from(dbData));

    // Create a backup
    const backupItem = backupRepo.createBackup(dbData, 'test-restore');
    expect(backupItem).not.toBeNull();

    // Validate backup file
    const isValid = await backupRepo.validateBackupFile(backupItem!.filepath);
    expect(isValid).toBe(true);

    // Modify active database
    db.run("INSERT INTO workspaces (id, name, sort_order) VALUES ('ws-mod', 'Modified', 99)");
    const modifiedData = db.export();

    // Restore from backup
    const restored = await backupRepo.restoreFromBackup(backupItem!.filepath, modifiedData);
    expect(restored).toBe(true);

    // Verify restored file does not have modified record
    const SQL = await initSqlJs();
    const restoredDb = new SQL.Database(fs.readFileSync(dbPath));
    const res = restoredDb.exec("SELECT COUNT(*) FROM workspaces WHERE id = 'ws-mod'");
    expect(res[0].values[0][0]).toBe(0);
  });

  it('7. ApplicationRepository should perform typed CRUD', () => {
    const repo = new ApplicationRepository(db);
    repo.upsert({
      id: 'app-code',
      name: 'VS Code',
      executablePath: 'code.exe',
      platform: 'win32',
      description: 'Code Editor',
    });

    const apps = repo.getAll();
    expect(apps.length).toBe(1);
    expect(apps[0].name).toBe('VS Code');

    repo.updateLastUsed('app-code');
    const updated = repo.getAll();
    expect(updated[0].lastUsedAt).not.toBeNull();
  });

  it('8. FloatingMonitorRepository should manage positions, dimensions, opacity, and locks', () => {
    // Insert parent workspace first to satisfy foreign key constraint
    db.run("INSERT INTO workspaces (id, name, sort_order) VALUES ('ws-dev', 'Development', 0)");

    const repo = new FloatingMonitorRepository(db);
    repo.upsert({
      id: 'mon-1',
      title: 'Dev Server',
      displayMode: 'live-monitor',
      positionX: 200,
      positionY: 150,
      width: 600,
      height: 400,
      opacity: 0.9,
      alwaysOnTop: true,
      isLocked: false,
      isActive: true,
      isMinimized: false,
      isMaximized: false,
      workspaceId: 'ws-dev',
      displayId: 0,
      compactToolbar: false,
      hideToolbar: false,
      captureFrameRate: 30,
      captureQuality: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const active = repo.getAllActive();
    expect(active.length).toBe(1);
    expect(active[0].width).toBe(600);

    repo.updateBounds('mon-1', 300, 250, 700, 500);
    repo.updateOpacity('mon-1', 0.8);
    repo.updateLocked('mon-1', true);

    const updated = repo.getById('mon-1');
    expect(updated?.positionX).toBe(300);
    expect(updated?.opacity).toBe(0.8);
    expect(updated?.isLocked).toBe(true);

    repo.setInactive('mon-1');
    expect(repo.getAllActive().length).toBe(0);
  });

  it('9. WorkspaceRepository should manage workspaces and monitor groups with cascading relations', () => {
    const repo = new WorkspaceRepository(db);
    repo.upsert({ id: 'ws-test', name: 'Design Space', sortOrder: 0 });
    repo.upsertGroup({ id: 'grp-test', workspaceId: 'ws-test', name: 'UI Group', sortOrder: 0 });

    expect(repo.getAll().length).toBe(1);
    expect(repo.getGroups().length).toBe(1);

    // Deleting workspace should cascade delete its groups
    repo.delete('ws-test');
    expect(repo.getAll().length).toBe(0);
    expect(repo.getGroups().length).toBe(0);
  });

  it('10. LayoutRepository should store layouts and layout monitors', () => {
    const repo = new LayoutRepository(db);
    repo.upsert({
      id: 'layout-grid',
      name: 'Quad Grid',
      layoutType: 'grid',
      displayCount: 1,
      monitors: [
        { positionX: 0, positionY: 0, width: 960, height: 540, snapPreset: 'top-left' },
        { positionX: 960, positionY: 0, width: 960, height: 540, snapPreset: 'top-right' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const layouts = repo.getAll();
    expect(layouts.length).toBe(1);
    const monitors = repo.getMonitorsForLayout('layout-grid');
    expect(monitors.length).toBe(2);
  });

  it('11. ProfileRepository should store profiles and profile monitors', () => {
    const repo = new ProfileRepository(db);
    repo.upsert({
      id: 'prof-dev',
      name: 'Full Dev Stack',
      isDefault: true,
      monitors: [{ title: 'IDE', width: 640, height: 480 }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const profiles = repo.getAll();
    expect(profiles.length).toBe(1);
    expect(profiles[0].isDefault).toBe(true);
    const mons = repo.getMonitorsForProfile('prof-dev');
    expect(mons.length).toBe(1);
    expect(mons[0].title).toBe('IDE');
  });

  it('12. SettingsRepository should store and retrieve key-value pairs', () => {
    const repo = new SettingsRepository(db);
    repo.set('restorePreviousSession', 'true', 'general');
    repo.setMany({ theme: 'dark', captureFrameRate: 60 });

    const all = repo.getAll();
    expect(all.restorePreviousSession).toBe('true');
    expect(all.theme).toBe('dark');
    expect(all.captureFrameRate).toBe('60');
  });

  it('13. KeyboardShortcutRepository should manage global shortcuts', () => {
    const repo = new KeyboardShortcutRepository(db);
    repo.upsert({
      id: 'sc-1',
      actionId: 'toggle-monitors',
      label: 'Toggle All',
      accelerator: 'CommandOrControl+Shift+M',
      isGlobal: true,
      isEnabled: true,
      updatedAt: new Date().toISOString(),
    });

    const list = repo.getAll();
    expect(list.length).toBe(1);
    expect(list[0].accelerator).toBe('CommandOrControl+Shift+M');
  });

  it('14. DisplayConfigurationRepository should persist display setups', () => {
    const repo = new DisplayConfigurationRepository(db);
    repo.saveAll([
      {
        id: 1,
        label: 'Primary Display',
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1040 },
        scaleFactor: 1.0,
        isPrimary: true,
        rotation: 0,
      },
    ]);

    const displays = repo.getAll();
    expect(displays.length).toBe(1);
    expect(displays[0].label).toBe('Primary Display');
  });

  it('15. SessionHistoryRepository should track session lifecycle and snapshots', () => {
    const repo = new SessionHistoryRepository(db);
    const sessionId = repo.recordSessionStart('ws-dev', 3);
    expect(sessionId).toContain('session-');

    repo.recordSessionEnd(sessionId, JSON.stringify({ activeMonitors: ['m1', 'm2'] }));
    const last = repo.getLastSession();
    expect(last.id).toBe(sessionId);
    expect(last.monitorsCount).toBe(3);
    expect(last.sessionEnd).not.toBeNull();
  });
});
