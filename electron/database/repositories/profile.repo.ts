export interface ProfileRecord {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  monitors?: any[];
  createdAt: string;
  updatedAt: string;
}

export class ProfileRepository {
  constructor(private db: any) {}

  public getAll(): ProfileRecord[] {
    const res = this.db.exec("SELECT * FROM profiles ORDER BY created_at DESC");
    if (!res || res.length === 0) return [];
    return res[0].values.map((v: any[]) => ({
      id: v[0],
      name: v[1],
      description: v[2] || undefined,
      isDefault: Boolean(v[3]),
      createdAt: v[4],
      updatedAt: v[5],
    }));
  }

  public getMonitorsForProfile(profileId: string): any[] {
    const stmt = this.db.prepare("SELECT * FROM profile_monitors WHERE profile_id = ?");
    stmt.bind([profileId]);
    const list: any[] = [];
    while (stmt.step()) {
      const obj = stmt.getAsObject();
      try {
        list.push(JSON.parse(obj.configuration_json as string));
      } catch {
        list.push(obj);
      }
    }
    stmt.free();
    return list;
  }

  public upsert(profile: ProfileRecord): void {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO profiles (id, name, description, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         is_default = excluded.is_default,
         updated_at = excluded.updated_at`,
      [profile.id, profile.name, profile.description || null, profile.isDefault ? 1 : 0, profile.createdAt || now, now]
    );

    if (profile.monitors && profile.monitors.length > 0) {
      this.db.run("DELETE FROM profile_monitors WHERE profile_id = ?", [profile.id]);
      for (const m of profile.monitors) {
        this.db.run(
          `INSERT INTO profile_monitors (id, profile_id, application_id, configuration_json, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            `pm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            profile.id,
            m.applicationId || null,
            JSON.stringify(m),
            now,
          ]
        );
      }
    }
  }

  public delete(id: string): void {
    this.db.run("DELETE FROM profiles WHERE id = ?", [id]);
  }
}
