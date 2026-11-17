import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { MigrationRunner } from './migrations';
import { ApplicationRepository } from './repositories/application.repo';
import { FloatingMonitorRepository } from './repositories/floating-monitor.repo';
import { WorkspaceRepository } from './repositories/workspace.repo';
import { LayoutRepository } from './repositories/layout.repo';
import { ProfileRepository } from './repositories/profile.repo';
import { SettingsRepository } from './repositories/settings.repo';
import { KeyboardShortcutRepository } from './repositories/shortcut.repo';
import { DisplayConfigurationRepository } from './repositories/display.repo';
import { SessionHistoryRepository } from './repositories/session.repo';
import { BackupRepository, DatabaseMetadata } from './repositories/backup.repo';
import { LoggerService } from '../services/logger.service';

export interface DatabaseInfo {
  status: 'healthy' | 'degraded' | 'error';
  engine: string;
  version: string;
  location: string;
  sizeBytes: number;
  schemaVersion: number;
  lastBackup: string | null;
  backupsCount: number;
  tablesCount: number;
  tableStats: Record<string, number>;
  metadata: DatabaseMetadata;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database | null = null;
  private dbPath: string = '';
  private baseDir: string = '';
  private databaseDir: string = '';
  private backupsDir: string = '';
  private migrationsDir: string = '';
  private metadataPath: string = '';
  private cacheDir: string = '';
  private logsDir: string = '';
  private exportsDir: string = '';
  private initialized: boolean = false;
  private currentSchemaVersion: number = 1;
  private logger = LoggerService.getInstance();

  // Repositories
  public applications!: ApplicationRepository;
  public floatingMonitors!: FloatingMonitorRepository;
  public workspaces!: WorkspaceRepository;
  public layouts!: LayoutRepository;
  public profiles!: ProfileRepository;
  public settings!: SettingsRepository;
  public shortcuts!: KeyboardShortcutRepository;
  public displays!: DisplayConfigurationRepository;
  public sessions!: SessionHistoryRepository;
  public backups!: BackupRepository;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized && this.db) return;

    try {
      this.logger.info('DatabaseService', 'Initializing local SQLite database for Float-Space...');

      // 1. Resolve dedicated directory structure under app.getPath('userData')
      const userDataDir = app ? app.getPath('userData') : path.join(process.cwd(), '.data');
      this.baseDir = path.join(userDataDir, 'Float-Space');
      this.databaseDir = path.join(this.baseDir, 'database');
      this.migrationsDir = path.join(this.databaseDir, 'migrations');
      this.backupsDir = path.join(this.databaseDir, 'backups');
      this.metadataPath = path.join(this.databaseDir, 'metadata.json');
      this.dbPath = path.join(this.databaseDir, 'floatspace.db');
      this.cacheDir = path.join(this.baseDir, 'cache');
      this.logsDir = path.join(this.baseDir, 'logs');
      this.exportsDir = path.join(this.baseDir, 'exports');

      // Seamless migration if legacy FloatDesk directory exists
      const legacyDir = path.join(userDataDir, 'FloatDesk');
      if (!fs.existsSync(this.baseDir) && fs.existsSync(legacyDir)) {
        try {
          fs.cpSync(legacyDir, this.baseDir, { recursive: true });
        } catch {}
      }

      // Ensure directory structure exists
      for (const dir of [
        this.baseDir,
        this.databaseDir,
        this.migrationsDir,
        this.backupsDir,
        this.cacheDir,
        this.logsDir,
        this.exportsDir,
      ]) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      // Initialize Backup Repository
      this.backups = new BackupRepository(
        this.databaseDir,
        this.backupsDir,
        this.metadataPath,
        this.dbPath
      );

      // 2. Initialize SQLite WebAssembly Engine
      const SQL = await initSqlJs();

      // 3. Load or Create Database File
      const dbExists = fs.existsSync(this.dbPath);
      if (dbExists) {
        this.logger.info('DatabaseService', `Loading existing SQLite database from: ${this.dbPath}`);
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
      } else {
        this.logger.info('DatabaseService', `Creating new local SQLite database at: ${this.dbPath}`);
        this.db = new SQL.Database();
      }

      // 4. Configure SQLite PRAGMAs: Foreign Keys, WAL Journal, Synchronous
      this.db.run("PRAGMA foreign_keys = ON;");
      this.db.run("PRAGMA journal_mode = WAL;");
      this.db.run("PRAGMA synchronous = NORMAL;");

      // 5. Initialize Repositories
      this.initRepositories();

      // 6. Execute Schema & Migrations
      const migrationRunner = new MigrationRunner();
      const migrationResult = await migrationRunner.runMigrations(this.db, async (reason) => {
        return this.createBackup(reason);
      });
      this.currentSchemaVersion = migrationResult.currentVersion;

      // 7. Validate Database Integrity
      const integrity = this.checkIntegrity();
      if (!integrity.healthy) {
        this.logger.error('DatabaseService', 'Database integrity check failed!', integrity.issues);
        throw new Error(`Database integrity failure: ${integrity.issues.join(', ')}`);
      }

      // 8. Seed Default Workspaces and Settings if new
      this.seedDefaults();

      // 9. Save initial state and update metadata
      this.saveToDisk();
      const meta = this.backups.getMetadata();
      meta.last_opened = new Date().toISOString();
      meta.schema_version = this.currentSchemaVersion;
      this.backups.saveMetadata(meta);

      this.initialized = true;
      this.logger.info('DatabaseService', 'Local SQLite database successfully initialized and verified.');
    } catch (err) {
      this.logger.error('DatabaseService', 'Fatal database initialization error', err);
      throw err;
    }
  }

  private initRepositories(): void {
    this.applications = new ApplicationRepository(this.db);
    this.floatingMonitors = new FloatingMonitorRepository(this.db);
    this.workspaces = new WorkspaceRepository(this.db);
    this.layouts = new LayoutRepository(this.db);
    this.profiles = new ProfileRepository(this.db);
    this.settings = new SettingsRepository(this.db);
    this.shortcuts = new KeyboardShortcutRepository(this.db);
    this.displays = new DisplayConfigurationRepository(this.db);
    this.sessions = new SessionHistoryRepository(this.db);
  }

  public saveToDisk(): void {
    if (!this.db || !this.dbPath) return;
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    } catch (err) {
      this.logger.error('DatabaseService', 'Error saving SQLite database to disk', err);
    }
  }

  public checkIntegrity(): { healthy: boolean; issues: string[] } {
    if (!this.db) return { healthy: false, issues: ['Database not loaded'] };
    try {
      const res = this.db.exec("PRAGMA integrity_check;");
      if (res && res.length > 0 && res[0].values) {
        const issues = res[0].values.map((v) => v[0] as string);
        const healthy = issues.length === 1 && issues[0] === 'ok';
        return { healthy, issues: healthy ? [] : issues };
      }
      return { healthy: false, issues: ['No result from integrity check'] };
    } catch (err: any) {
      return { healthy: false, issues: [err.message] };
    }
  }

  public optimize(): void {
    if (!this.db) return;
    try {
      this.db.run("PRAGMA optimize;");
      this.saveToDisk();
    } catch (err) {
      this.logger.warn('DatabaseService', 'PRAGMA optimize failed', err);
    }
  }

  public vacuum(): void {
    if (!this.db) return;
    try {
      this.db.run("VACUUM;");
      this.saveToDisk();
    } catch (err) {
      this.logger.warn('DatabaseService', 'VACUUM failed', err);
    }
  }

  public getDatabaseInfo(): DatabaseInfo {
    const integrity = this.checkIntegrity();
    const stats = fs.existsSync(this.dbPath) ? fs.statSync(this.dbPath) : { size: 0 };
    const meta = this.backups.getMetadata();

    const tableNames = [
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

    const tableStats: Record<string, number> = {};
    if (this.db) {
      for (const tbl of tableNames) {
        try {
          const res = this.db.exec(`SELECT COUNT(*) FROM ${tbl}`);
          tableStats[tbl] = (res[0]?.values[0]?.[0] as number) || 0;
        } catch {
          tableStats[tbl] = 0;
        }
      }
    }

    return {
      status: integrity.healthy ? 'healthy' : 'degraded',
      engine: 'SQLite 3 (Embedded WASM/sql.js)',
      version: '3.46.0',
      location: this.dbPath,
      sizeBytes: stats.size,
      schemaVersion: this.currentSchemaVersion,
      lastBackup: meta.last_backup,
      backupsCount: meta.backups.length,
      tablesCount: tableNames.length,
      tableStats,
      metadata: meta,
    };
  }

  public createBackup(reason: string = 'manual'): string | null {
    if (!this.db) return null;
    const data = this.db.export();
    const item = this.backups.createBackup(data, reason, this.currentSchemaVersion);
    return item ? item.filepath : null;
  }

  public async restoreBackup(backupPath: string): Promise<boolean> {
    if (!this.db) return false;
    const currentData = this.db.export();
    await this.backups.restoreFromBackup(backupPath, currentData);

    // Reload active database
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(this.dbPath);
    this.db = new SQL.Database(fileBuffer);
    this.initRepositories();
    return true;
  }

  public exportDatabase(destinationPath?: string): string {
    const dest = destinationPath || path.join(this.exportsDir, `floatdesk-export-${Date.now()}.db`);
    this.saveToDisk();
    this.backups.exportDatabase(dest);
    return dest;
  }

  public async importDatabase(sourcePath: string): Promise<boolean> {
    if (!this.db) return false;
    const currentData = this.db.export();
    await this.backups.importDatabase(sourcePath, currentData);

    // Reload database
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(this.dbPath);
    this.db = new SQL.Database(fileBuffer);
    this.initRepositories();
    return true;
  }

  public async resetDatabase(): Promise<void> {
    if (!this.db) return;
    this.createBackup('pre-reset-safety');

    const SQL = await initSqlJs();
    this.db = new SQL.Database();
    this.initRepositories();

    const migrationRunner = new MigrationRunner();
    await migrationRunner.runMigrations(this.db, async () => null);

    this.seedDefaults();
    this.saveToDisk();
  }

  private seedDefaults(): void {
    if (!this.db) return;

    // Check workspaces
    const res = this.db.exec("SELECT COUNT(*) FROM workspaces");
    const wsCount = res[0]?.values[0]?.[0] as number;

    if (wsCount === 0) {
      const now = new Date().toISOString();
      const defaultWorkspaces = [
        { id: 'ws-dev', name: 'Development', desc: 'Code editors, terminals, debuggers', sort: 0 },
        { id: 'ws-mon', name: 'Monitoring', desc: 'System metrics, log viewers, dashboards', sort: 1 },
        { id: 'ws-comm', name: 'Communication', desc: 'Chat, video calls, team collaboration', sort: 2 },
        { id: 'ws-personal', name: 'Personal', desc: 'Music player, notes, reference docs', sort: 3 },
      ];

      for (const ws of defaultWorkspaces) {
        this.workspaces.upsert({
          id: ws.id,
          name: ws.name,
          description: ws.desc,
          sortOrder: ws.sort,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Default groups
      const defaultGroups = [
        { id: 'grp-dev', ws: 'ws-dev', name: 'Dev Tools', sort: 0 },
        { id: 'grp-mon', ws: 'ws-mon', name: 'Live Metrics', sort: 0 },
        { id: 'grp-comm', ws: 'ws-comm', name: 'Messaging', sort: 0 },
        { id: 'grp-personal', ws: 'ws-personal', name: 'Media & Docs', sort: 0 },
      ];

      for (const grp of defaultGroups) {
        this.workspaces.upsertGroup({
          id: grp.id,
          workspaceId: grp.ws,
          name: grp.name,
          sortOrder: grp.sort,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Default settings
      this.settings.setMany({
        restorePreviousSession: true,
        minimizeToTray: true,
        theme: 'light',
        accentColor: '#0c8ce9',
        captureFrameRate: 30,
        previewQuality: 'medium',
      });

      // Default keyboard shortcuts
      this.shortcuts.upsert({
        id: 'sc-toggle-all',
        actionId: 'toggle-all-monitors',
        label: 'Show/Hide All Monitors',
        accelerator: 'CommandOrControl+Shift+M',
        isGlobal: true,
        isEnabled: true,
        updatedAt: now,
      });

      this.shortcuts.upsert({
        id: 'sc-mission-control',
        actionId: 'open-mission-control',
        label: 'Open Mission Control',
        accelerator: 'CommandOrControl+Shift+Space',
        isGlobal: true,
        isEnabled: true,
        updatedAt: now,
      });
    }
  }

  public getDatabasePath(): string {
    return this.dbPath;
  }

  public getDatabaseDir(): string {
    return this.databaseDir;
  }

  public run(sql: string, params: any[] = []): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(sql, params);
    this.saveToDisk();
  }

  public query<T = any>(sql: string, params: any[] = []): T[] {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return results;
  }

  public get<T = any>(sql: string, params: any[] = []): T | null {
    const results = this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }
}
