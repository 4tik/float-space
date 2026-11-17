import { FloatingWindowConfig } from '../../../src/types/floating-monitor';

export class FloatingMonitorRepository {
  constructor(private db: any) {}

  public getAllActive(): FloatingWindowConfig[] {
    const res = this.db.exec("SELECT * FROM floating_monitors WHERE is_active = 1 ORDER BY created_at ASC");
    if (!res || res.length === 0) return [];
    return res[0].values.map((v: any[]) => this.mapRowToConfig(v));
  }

  public getAll(): FloatingWindowConfig[] {
    const res = this.db.exec("SELECT * FROM floating_monitors ORDER BY created_at ASC");
    if (!res || res.length === 0) return [];
    return res[0].values.map((v: any[]) => this.mapRowToConfig(v));
  }

  public getById(id: string): FloatingWindowConfig | null {
    const stmt = this.db.prepare("SELECT * FROM floating_monitors WHERE id = ?");
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.get();
      stmt.free();
      return this.mapRowToConfig(row);
    }
    stmt.free();
    return null;
  }

  public upsert(config: FloatingWindowConfig): void {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO floating_monitors (
        id, application_id, source_window_id, title, display_mode,
        position_x, position_y, width, height, opacity,
        always_on_top, is_locked, is_active, is_minimized, is_maximized,
        workspace_id, group_id, display_id, compact_toolbar, hide_toolbar,
        capture_frame_rate, capture_quality, target_hwnd, is_interactive, interaction_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        display_mode = excluded.display_mode,
        position_x = excluded.position_x,
        position_y = excluded.position_y,
        width = excluded.width,
        height = excluded.height,
        opacity = excluded.opacity,
        always_on_top = excluded.always_on_top,
        is_locked = excluded.is_locked,
        is_active = excluded.is_active,
        is_minimized = excluded.is_minimized,
        is_maximized = excluded.is_maximized,
        workspace_id = excluded.workspace_id,
        group_id = excluded.group_id,
        display_id = excluded.display_id,
        compact_toolbar = excluded.compact_toolbar,
        hide_toolbar = excluded.hide_toolbar,
        capture_frame_rate = excluded.capture_frame_rate,
        capture_quality = excluded.capture_quality,
        target_hwnd = excluded.target_hwnd,
        is_interactive = excluded.is_interactive,
        interaction_message = excluded.interaction_message,
        updated_at = excluded.updated_at`,
      [
        config.id,
        config.applicationId || null,
        config.sourceWindowId || null,
        config.title,
        config.displayMode,
        config.positionX,
        config.positionY,
        config.width,
        config.height,
        config.opacity,
        config.alwaysOnTop ? 1 : 0,
        config.isLocked ? 1 : 0,
        config.isActive ? 1 : 0,
        config.isMinimized ? 1 : 0,
        config.isMaximized ? 1 : 0,
        config.workspaceId || null,
        config.groupId || null,
        config.displayId || 0,
        config.compactToolbar ? 1 : 0,
        config.hideToolbar ? 1 : 0,
        config.captureFrameRate || 30,
        config.captureQuality || 'medium',
        config.targetHwnd || null,
        config.isInteractive ? 1 : 0,
        config.interactionMessage || null,
        config.createdAt || now,
        now,
      ]
    );
  }

  public updateBounds(id: string, x: number, y: number, width: number, height: number): void {
    const now = new Date().toISOString();
    this.db.run(
      "UPDATE floating_monitors SET position_x = ?, position_y = ?, width = ?, height = ?, updated_at = ? WHERE id = ?",
      [x, y, width, height, now, id]
    );
  }

  public updateOpacity(id: string, opacity: number): void {
    const now = new Date().toISOString();
    this.db.run("UPDATE floating_monitors SET opacity = ?, updated_at = ? WHERE id = ?", [opacity, now, id]);
  }

  public updateLocked(id: string, isLocked: boolean): void {
    const now = new Date().toISOString();
    this.db.run("UPDATE floating_monitors SET is_locked = ?, updated_at = ? WHERE id = ?", [isLocked ? 1 : 0, now, id]);
  }

  public updateAlwaysOnTop(id: string, alwaysOnTop: boolean): void {
    const now = new Date().toISOString();
    this.db.run("UPDATE floating_monitors SET always_on_top = ?, updated_at = ? WHERE id = ?", [alwaysOnTop ? 1 : 0, now, id]);
  }

  public setInactive(id: string): void {
    const now = new Date().toISOString();
    this.db.run("UPDATE floating_monitors SET is_active = 0, updated_at = ? WHERE id = ?", [now, id]);
  }

  public delete(id: string): void {
    this.db.run("DELETE FROM floating_monitors WHERE id = ?", [id]);
  }

  private mapRowToConfig(v: any[]): FloatingWindowConfig {
    return {
      id: v[0],
      applicationId: v[1] || undefined,
      sourceWindowId: v[2] || undefined,
      title: v[3],
      displayMode: v[4],
      positionX: v[5],
      positionY: v[6],
      width: v[7],
      height: v[8],
      opacity: v[9],
      alwaysOnTop: Boolean(v[10]),
      isLocked: Boolean(v[11]),
      isActive: Boolean(v[12]),
      isMinimized: Boolean(v[13]),
      isMaximized: Boolean(v[14]),
      workspaceId: v[15] || 'ws-dev',
      groupId: v[16] || undefined,
      displayId: v[17] || 0,
      compactToolbar: Boolean(v[18]),
      hideToolbar: Boolean(v[19]),
      captureFrameRate: v[20] || 30,
      captureQuality: v[21] || 'medium',
      targetHwnd: v[22] || undefined,
      isInteractive: Boolean(v[23]),
      interactionMessage: v[24] || undefined,
      createdAt: v[25] || v[22],
      updatedAt: v[26] || v[23],
    };
  }
}
