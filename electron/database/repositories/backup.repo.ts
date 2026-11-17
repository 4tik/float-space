import * as fs from 'fs';
import * as path from 'path';
import initSqlJs from 'sql.js';
import { LoggerService } from '../../services/logger.service';

export interface BackupMetadataItem {
  id: string;
  filename: string;
  filepath: string;
  timestamp: string;
  reason: string;
  sizeBytes: number;
  schemaVersion: number;
}

export interface DatabaseMetadata {
  created_at: string;
  last_opened: string;
  last_backup: string | null;
  schema_version: number;
  backups: BackupMetadataItem[];
}

export class BackupRepository {
  private logger = LoggerService.getInstance();

  constructor(
    private databaseDir: string,
    private backupsDir: string,
    private metadataPath: string,
    private dbPath: string,
    private maxRetention: number = 10
  ) {}

  public getMetadata(): DatabaseMetadata {
    if (fs.existsSync(this.metadataPath)) {
      try {
        const raw = fs.readFileSync(this.metadataPath, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        this.logger.warn('BackupRepository', 'Failed to parse metadata.json, creating new', err);
      }
    }

    const defaultMeta: DatabaseMetadata = {
      created_at: new Date().toISOString(),
      last_opened: new Date().toISOString(),
      last_backup: null,
      schema_version: 1,
      backups: [],
    };
    this.saveMetadata(defaultMeta);
    return defaultMeta;
  }

  public saveMetadata(meta: DatabaseMetadata): void {
    try {
      fs.writeFileSync(this.metadataPath, JSON.stringify(meta, null, 2), 'utf-8');
    } catch (err) {
      this.logger.error('BackupRepository', 'Failed to save metadata.json', err);
    }
  }

  public createBackup(dbData: Uint8Array, reason: string = 'manual', schemaVersion: number = 1): BackupMetadataItem | null {
    try {
      if (!fs.existsSync(this.backupsDir)) {
        fs.mkdirSync(this.backupsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `floatdesk-backup-${timestamp}-${reason}.db`;
      const filepath = path.join(this.backupsDir, filename);

      fs.writeFileSync(filepath, Buffer.from(dbData));

      const stats = fs.statSync(filepath);
      const backupItem: BackupMetadataItem = {
        id: `backup-${Date.now()}`,
        filename,
        filepath,
        timestamp: new Date().toISOString(),
        reason,
        sizeBytes: stats.size,
        schemaVersion,
      };

      const meta = this.getMetadata();
      meta.last_backup = backupItem.timestamp;
      meta.backups.unshift(backupItem);

      // Clean up older backups exceeding retention limit
      if (meta.backups.length > this.maxRetention) {
        const toRemove = meta.backups.splice(this.maxRetention);
        for (const old of toRemove) {
          if (fs.existsSync(old.filepath)) {
            try {
              fs.unlinkSync(old.filepath);
            } catch {}
          }
        }
      }

      this.saveMetadata(meta);
      this.logger.info('BackupRepository', `Successfully created backup: ${filename} (${stats.size} bytes)`);
      return backupItem;
    } catch (err) {
      this.logger.error('BackupRepository', 'Failed to create database backup', err);
      return null;
    }
  }

  public async validateBackupFile(backupPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(backupPath)) return false;
      const buffer = fs.readFileSync(backupPath);
      const SQL = await initSqlJs();
      const testDb = new SQL.Database(buffer);
      const res = testDb.exec("PRAGMA integrity_check;");
      testDb.close();
      return res && res.length > 0 && res[0].values[0][0] === 'ok';
    } catch {
      return false;
    }
  }

  public async restoreFromBackup(backupPath: string, currentDbData: Uint8Array): Promise<boolean> {
    try {
      const isValid = await this.validateBackupFile(backupPath);
      if (!isValid) {
        throw new Error('Backup file failed SQLite integrity check');
      }

      // Safety pre-restore backup
      this.createBackup(currentDbData, 'pre-restore-safety');

      // Replace main database file
      const backupBuffer = fs.readFileSync(backupPath);
      fs.writeFileSync(this.dbPath, backupBuffer);
      this.logger.info('BackupRepository', `Successfully restored database from: ${backupPath}`);
      return true;
    } catch (err) {
      this.logger.error('BackupRepository', 'Restore failed', err);
      throw err;
    }
  }

  public exportDatabase(destinationPath: string): boolean {
    try {
      if (!fs.existsSync(this.dbPath)) return false;
      fs.copyFileSync(this.dbPath, destinationPath);
      return true;
    } catch (err) {
      this.logger.error('BackupRepository', 'Export failed', err);
      return false;
    }
  }

  public async importDatabase(sourcePath: string, currentDbData: Uint8Array): Promise<boolean> {
    return await this.restoreFromBackup(sourcePath, currentDbData);
  }
}
