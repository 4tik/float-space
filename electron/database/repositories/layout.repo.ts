export interface LayoutRecord {
  id: string;
  name: string;
  description?: string;
  layoutType: string;
  displayCount: number;
  monitors?: any[];
  createdAt: string;
  updatedAt: string;
}

export class LayoutRepository {
  constructor(private db: any) {}

  public getAll(): LayoutRecord[] {
    const res = this.db.exec("SELECT * FROM layouts ORDER BY created_at DESC");
    if (!res || res.length === 0) return [];
    return res[0].values.map((v: any[]) => ({
      id: v[0],
      name: v[1],
      description: v[2] || undefined,
      layoutType: v[3],
      displayCount: v[4],
      createdAt: v[5],
      updatedAt: v[6],
    }));
  }

  public getMonitorsForLayout(layoutId: string): any[] {
    const stmt = this.db.prepare("SELECT * FROM layout_monitors WHERE layout_id = ?");
    stmt.bind([layoutId]);
    const list: any[] = [];
    while (stmt.step()) {
      list.push(stmt.getAsObject());
    }
    stmt.free();
    return list;
  }

  public upsert(layout: LayoutRecord): void {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO layouts (id, name, description, layout_type, display_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         layout_type = excluded.layout_type,
         display_count = excluded.display_count,
         updated_at = excluded.updated_at`,
      [layout.id, layout.name, layout.description || null, layout.layoutType || 'grid', layout.displayCount || 1, layout.createdAt || now, now]
    );

    if (layout.monitors && layout.monitors.length > 0) {
      this.db.run("DELETE FROM layout_monitors WHERE layout_id = ?", [layout.id]);
      for (const m of layout.monitors) {
        this.db.run(
          `INSERT INTO layout_monitors (id, layout_id, position_x, position_y, width, height, snap_preset, configuration_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `lm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            layout.id,
            m.positionX || 0,
            m.positionY || 0,
            m.width || 480,
            m.height || 320,
            m.snapPreset || null,
            JSON.stringify(m),
            now,
          ]
        );
      }
    }
  }

  public delete(id: string): void {
    this.db.run("DELETE FROM layouts WHERE id = ?", [id]);
  }
}
