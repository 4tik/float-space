export class SettingsRepository {
  constructor(private db: any) {}

  public getAll(): Record<string, string> {
    const res = this.db.exec("SELECT key, value FROM application_settings");
    if (!res || res.length === 0) return {};
    const map: Record<string, string> = {};
    for (const v of res[0].values) {
      map[v[0]] = v[1];
    }
    return map;
  }

  public get(key: string): string | null {
    const stmt = this.db.prepare("SELECT value FROM application_settings WHERE key = ?");
    stmt.bind([key]);
    if (stmt.step()) {
      const val = stmt.get()[0] as string;
      stmt.free();
      return val;
    }
    stmt.free();
    return null;
  }

  public set(key: string, value: string, category: string = 'general'): void {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO application_settings (id, key, value, category, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         category = excluded.category,
         updated_at = excluded.updated_at`,
      [`set-${key}`, key, value, category, now]
    );
  }

  public setMany(settings: Record<string, any>, category: string = 'general'): void {
    const now = new Date().toISOString();
    for (const [k, v] of Object.entries(settings)) {
      const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
      this.db.run(
        `INSERT INTO application_settings (id, key, value, category, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
        [`set-${k}`, k, valStr, category, now]
      );
    }
  }
}
