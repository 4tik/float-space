import { INITIAL_SCHEMA_SQL, CURRENT_SCHEMA_VERSION } from './schema';
import { LoggerService } from '../services/logger.service';

export interface Migration {
  version: number;
  name: string;
  up: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '0001_initial_schema',
    up: INITIAL_SCHEMA_SQL,
  },
  {
    version: 2,
    name: '0002_interactive_embedding',
    up: `
      ALTER TABLE floating_monitors ADD COLUMN target_hwnd TEXT;
      ALTER TABLE floating_monitors ADD COLUMN is_interactive INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE floating_monitors ADD COLUMN interaction_message TEXT;
    `,
  },
];

export class MigrationRunner {
  private logger = LoggerService.getInstance();

  public async runMigrations(
    db: any,
    createBackupFn: (reason: string) => Promise<string | null>
  ): Promise<{ applied: number; currentVersion: number }> {
    // Check applied migrations
    db.run(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    const rows = db.exec("SELECT version FROM _migrations ORDER BY version ASC");
    const appliedVersions = new Set<number>();
    if (rows && rows.length > 0 && rows[0].values) {
      for (const row of rows[0].values) {
        appliedVersions.add(row[0] as number);
      }
    }

    const pending = MIGRATIONS.filter((m) => !appliedVersions.has(m.version));

    if (pending.length === 0) {
      const current = appliedVersions.size > 0 ? Math.max(...Array.from(appliedVersions)) : CURRENT_SCHEMA_VERSION;
      this.logger.info('Migrations', `Database schema is up to date (version ${current})`);
      return { applied: 0, currentVersion: current };
    }

    this.logger.info('Migrations', `Found ${pending.length} pending migrations. Creating pre-migration backup.`);
    try {
      await createBackupFn('pre-migration');
    } catch (err) {
      this.logger.warn('Migrations', 'Failed to create pre-migration backup, continuing with caution', err);
    }

    let appliedCount = 0;
    let latestVersion = 0;

    for (const migration of pending) {
      this.logger.info('Migrations', `Applying migration ${migration.version}: ${migration.name}`);
      try {
        db.run('BEGIN TRANSACTION;');
        db.run(migration.up);
        db.run('INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, datetime(\'now\'));', [
          migration.version,
          migration.name,
        ]);
        db.run('COMMIT;');
        appliedCount++;
        latestVersion = migration.version;
        this.logger.info('Migrations', `Successfully applied migration ${migration.version}`);
      } catch (err) {
        db.run('ROLLBACK;');
        this.logger.error('Migrations', `Failed to apply migration ${migration.version}: ${migration.name}`, err);
        throw new Error(`Migration ${migration.version} (${migration.name}) failed: ${err}`);
      }
    }

    return { applied: appliedCount, currentVersion: latestVersion };
  }
}
