export class SessionHistoryRepository {
  constructor(private db: any) {}

  public recordSessionStart(activeWorkspaceId?: string, monitorsCount: number = 0): string {
    const id = `session-${Date.now()}`;
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO session_history (id, session_start, active_workspace_id, monitors_count, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, now, activeWorkspaceId || null, monitorsCount, now]
    );
    return id;
  }

  public recordSessionEnd(sessionId: string, snapshotJson?: string): void {
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE session_history SET session_end = ?, state_snapshot_json = ? WHERE id = ?`,
      [now, snapshotJson || null, sessionId]
    );
  }

  public getLastSession(): any | null {
    const res = this.db.exec("SELECT * FROM session_history ORDER BY session_start DESC LIMIT 1");
    if (!res || res.length === 0 || !res[0].values[0]) return null;
    const v = res[0].values[0];
    return {
      id: v[0],
      sessionStart: v[1],
      sessionEnd: v[2],
      activeWorkspaceId: v[3],
      monitorsCount: v[4],
      stateSnapshotJson: v[5],
      createdAt: v[6],
    };
  }
}
