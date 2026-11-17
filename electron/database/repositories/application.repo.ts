import { InstalledApplication } from '../../../src/types/application';

export class ApplicationRepository {
  constructor(private db: any) {}

  public getAll(): InstalledApplication[] {
    const res = this.db.exec("SELECT * FROM applications ORDER BY name ASC");
    if (!res || res.length === 0) return [];
    return res[0].values.map((v: any[]) => ({
      id: v[0],
      name: v[1],
      executablePath: v[2],
      iconPath: v[3],
      iconDataUrl: v[4],
      platform: v[5],
      version: v[6],
      description: v[7],
      lastUsedAt: v[8],
      createdAt: v[9],
      updatedAt: v[10],
    }));
  }

  public upsert(app: Partial<InstalledApplication> & { id: string; name: string; platform: string }): void {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO applications (
        id, name, executable_path, icon_path, icon_data_url, platform, version, description, last_used_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        executable_path = excluded.executable_path,
        icon_path = excluded.icon_path,
        icon_data_url = excluded.icon_data_url,
        version = excluded.version,
        description = excluded.description,
        updated_at = excluded.updated_at`,
      [
        app.id,
        app.name,
        app.executablePath || null,
        app.iconPath || null,
        app.iconDataUrl || null,
        app.platform,
        app.version || null,
        app.description || null,
        app.lastUsedAt || null,
        now,
        now,
      ]
    );
  }

  public updateLastUsed(id: string): void {
    const now = new Date().toISOString();
    this.db.run("UPDATE applications SET last_used_at = ?, updated_at = ? WHERE id = ?", [now, now, id]);
  }
}
