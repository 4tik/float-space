import { PhysicalDisplay } from '../../../src/types/display';

export class DisplayConfigurationRepository {
  constructor(private db: any) {}

  public saveAll(displays: PhysicalDisplay[]): void {
    const now = new Date().toISOString();
    for (const d of displays) {
      this.db.run(
        `INSERT INTO display_configurations (id, display_id, label, bounds_x, bounds_y, width, height, scale_factor, is_primary, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           label = excluded.label,
           bounds_x = excluded.bounds_x,
           bounds_y = excluded.bounds_y,
           width = excluded.width,
           height = excluded.height,
           scale_factor = excluded.scale_factor,
           is_primary = excluded.is_primary,
           updated_at = excluded.updated_at`,
        [
          `disp-${d.id}`,
          d.id,
          d.label,
          d.bounds.x,
          d.bounds.y,
          d.bounds.width,
          d.bounds.height,
          d.scaleFactor,
          d.isPrimary ? 1 : 0,
          now,
        ]
      );
    }
  }

  public getAll(): any[] {
    const res = this.db.exec("SELECT * FROM display_configurations ORDER BY display_id ASC");
    if (!res || res.length === 0) return [];
    return res[0].values.map((v: any[]) => ({
      id: v[0],
      displayId: v[1],
      label: v[2],
      bounds: { x: v[3], y: v[4], width: v[5], height: v[6] },
      scaleFactor: v[7],
      isPrimary: Boolean(v[8]),
      updatedAt: v[9],
    }));
  }
}
