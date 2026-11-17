export interface ShortcutRecord {
  id: string;
  actionId: string;
  label: string;
  accelerator: string;
  isGlobal: boolean;
  isEnabled: boolean;
  updatedAt: string;
}

export class KeyboardShortcutRepository {
  constructor(private db: any) {}

  public getAll(): ShortcutRecord[] {
    const res = this.db.exec("SELECT * FROM keyboard_shortcuts ORDER BY action_id ASC");
    if (!res || res.length === 0) return [];
    return res[0].values.map((v: any[]) => ({
      id: v[0],
      actionId: v[1],
      label: v[2],
      accelerator: v[3],
      isGlobal: Boolean(v[4]),
      isEnabled: Boolean(v[5]),
      updatedAt: v[6],
    }));
  }

  public upsert(shortcut: ShortcutRecord): void {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO keyboard_shortcuts (id, action_id, label, accelerator, is_global, is_enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(action_id) DO UPDATE SET
         label = excluded.label,
         accelerator = excluded.accelerator,
         is_global = excluded.is_global,
         is_enabled = excluded.is_enabled,
         updated_at = excluded.updated_at`,
      [
        shortcut.id,
        shortcut.actionId,
        shortcut.label,
        shortcut.accelerator,
        shortcut.isGlobal ? 1 : 0,
        shortcut.isEnabled ? 1 : 0,
        now,
      ]
    );
  }
}
