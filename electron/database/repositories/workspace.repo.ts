import { Workspace, MonitorGroup } from '../../../src/types/floating-monitor';

export class WorkspaceRepository {
  constructor(private db: any) {}

  public getAll(): Workspace[] {
    const res = this.db.exec("SELECT * FROM workspaces ORDER BY sort_order ASC");
    if (!res || res.length === 0) return [];
    return res[0].values.map((v: any[]) => ({
      id: v[0],
      name: v[1],
      description: v[2] || undefined,
      sortOrder: v[3],
      createdAt: v[5],
      updatedAt: v[6],
    }));
  }

  public upsert(ws: Partial<Workspace> & { id: string; name: string }): void {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO workspaces (id, name, description, sort_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         sort_order = excluded.sort_order,
         updated_at = excluded.updated_at`,
      [ws.id, ws.name, ws.description || null, ws.sortOrder ?? 0, 0, ws.createdAt || now, now]
    );
  }

  public delete(id: string): void {
    this.db.run("DELETE FROM workspaces WHERE id = ?", [id]);
  }

  // Monitor Groups
  public getGroups(): MonitorGroup[] {
    const res = this.db.exec("SELECT * FROM monitor_groups ORDER BY sort_order ASC");
    if (!res || res.length === 0) return [];
    return res[0].values.map((v: any[]) => ({
      id: v[0],
      workspaceId: v[1],
      name: v[2],
      color: v[3] || undefined,
      sortOrder: v[4],
      isCollapsed: Boolean(v[5]),
      monitorIds: [],
      createdAt: v[6],
      updatedAt: v[7],
    }));
  }

  public upsertGroup(grp: Partial<MonitorGroup> & { id: string; workspaceId: string; name: string }): void {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO monitor_groups (id, workspace_id, name, color, sort_order, is_collapsed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         color = excluded.color,
         sort_order = excluded.sort_order,
         is_collapsed = excluded.is_collapsed,
         updated_at = excluded.updated_at`,
      [grp.id, grp.workspaceId, grp.name, grp.color || null, grp.sortOrder ?? 0, grp.isCollapsed ? 1 : 0, grp.createdAt || now, now]
    );
  }

  public deleteGroup(id: string): void {
    this.db.run("DELETE FROM monitor_groups WHERE id = ?", [id]);
  }
}
