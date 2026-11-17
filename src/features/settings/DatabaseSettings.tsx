import React, { useEffect, useState } from 'react';
import {
  Database,
  HardDrive,
  ShieldCheck,
  RotateCcw,
  Download,
  Upload,
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileArchive,
  RefreshCw,
} from 'lucide-react';
import { ipcClient } from '../../services/ipc-client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Dialog } from '../../components/common/Dialog';

export const DatabaseSettings: React.FC = () => {
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmRestorePath, setConfirmRestorePath] = useState<string | null>(null);

  const fetchDbInfo = async () => {
    setLoading(true);
    try {
      const info = await ipcClient.getDatabaseInfo();
      setDbInfo(info);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load database information' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbInfo();
  }, []);

  const handleCreateBackup = async () => {
    setLoading(true);
    const res = await ipcClient.createDatabaseBackup('manual-user');
    if (res.success) {
      setStatusMsg({ type: 'success', text: `Backup created successfully at: ${res.path}` });
      await fetchDbInfo();
    } else {
      setStatusMsg({ type: 'error', text: 'Failed to create database backup' });
    }
    setLoading(false);
  };

  const handleRestoreBackup = async (backupPath: string) => {
    setLoading(true);
    const res = await ipcClient.restoreDatabaseBackup(backupPath);
    if (res.success) {
      setStatusMsg({ type: 'success', text: 'Database successfully restored from backup' });
      await fetchDbInfo();
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to restore backup' });
    }
    setConfirmRestorePath(null);
    setLoading(false);
  };

  const handleExport = async () => {
    const res = await ipcClient.exportDatabase();
    if (res.success) {
      setStatusMsg({ type: 'success', text: `Database exported to: ${res.path}` });
    }
  };

  const handleImport = async () => {
    const res = await ipcClient.importDatabase();
    if (res.success) {
      setStatusMsg({ type: 'success', text: `Database imported from: ${res.path}` });
      await fetchDbInfo();
    } else if (res.error) {
      setStatusMsg({ type: 'error', text: `Import failed: ${res.error}` });
    }
  };

  const handleCheckIntegrity = async () => {
    setLoading(true);
    const res = await ipcClient.checkDatabaseIntegrity();
    if (res.healthy) {
      setStatusMsg({ type: 'success', text: 'SQLite Integrity Check passed: PRAGMA integrity_check = ok' });
    } else {
      setStatusMsg({ type: 'error', text: `Integrity check issues: ${res.issues.join(', ')}` });
    }
    setLoading(false);
  };

  const handleResetDatabase = async () => {
    setLoading(true);
    const res = await ipcClient.resetDatabase();
    if (res.success) {
      setStatusMsg({ type: 'success', text: 'Database has been reset to default initial state (pre-reset backup created)' });
      await fetchDbInfo();
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to reset database' });
    }
    setConfirmResetOpen(false);
    setLoading(false);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-4 text-xs animate-fade-in app-no-drag">
      {/* Notice Banner */}
      {statusMsg && (
        <div
          className={`p-3 rounded-mac border flex items-center justify-between animate-fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-xs hover:underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Database Overview Card */}
      <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Database className="text-primary-500" size={16} />
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              FloatDesk Local SQLite Architecture
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {dbInfo && (
              <Badge variant={dbInfo.status === 'healthy' ? 'success' : 'danger'}>
                {dbInfo.status === 'healthy' ? 'Database Healthy' : 'Issues Detected'}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={12} className={loading ? 'animate-spin' : ''} />}
              onClick={fetchDbInfo}
            >
              Refresh
            </Button>
          </div>
        </div>

        {dbInfo ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <div className="p-2.5 rounded bg-white/20 dark:bg-white/5 border border-slate-200/40 dark:border-white/5">
              <div className="text-[10px] text-slate-400">Database Engine</div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                {dbInfo.engine}
              </div>
            </div>

            <div className="p-2.5 rounded bg-white/20 dark:bg-white/5 border border-slate-200/40 dark:border-white/5">
              <div className="text-[10px] text-slate-400">Schema Version</div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                v{dbInfo.schemaVersion} ({dbInfo.tablesCount} Tables)
              </div>
            </div>

            <div className="p-2.5 rounded bg-white/20 dark:bg-white/5 border border-slate-200/40 dark:border-white/5">
              <div className="text-[10px] text-slate-400">Database File Size</div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {formatBytes(dbInfo.sizeBytes)}
              </div>
            </div>

            <div className="p-2.5 rounded bg-white/20 dark:bg-white/5 border border-slate-200/40 dark:border-white/5">
              <div className="text-[10px] text-slate-400">Backups Available</div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {dbInfo.backupsCount} backups
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 py-2">Loading database diagnostics...</div>
        )}

        {dbInfo && (
          <div className="p-2 rounded bg-slate-100/80 dark:bg-black/30 border border-slate-200/60 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-400 truncate">
            <span className="font-medium text-slate-700 dark:text-slate-300">File Location: </span>
            <span className="font-mono">{dbInfo.location}</span>
          </div>
        )}
      </div>

      {/* Database Actions */}
      <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10 space-y-3">
        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Database Management & Maintenance
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<FileArchive size={13} />}
            onClick={handleCreateBackup}
            disabled={loading}
          >
            Create Backup
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<ShieldCheck size={13} />}
            onClick={handleCheckIntegrity}
            disabled={loading}
          >
            Check Integrity
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<FolderOpen size={13} />}
            onClick={() => ipcClient.openDatabaseDirectory()}
          >
            Open DB Folder
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={13} />}
            onClick={handleExport}
          >
            Export Database
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Upload size={13} />}
            onClick={handleImport}
          >
            Import Database
          </Button>

          <Button
            variant="danger"
            size="sm"
            icon={<RotateCcw size={13} />}
            onClick={() => setConfirmResetOpen(true)}
          >
            Reset Database
          </Button>
        </div>
      </div>

      {/* Backup History Table */}
      <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10 space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={13} /> Backup History ({dbInfo?.metadata?.backups?.length || 0})
          </h3>
          <span className="text-[10px] text-slate-400">
            Retains last 10 snapshots automatically
          </span>
        </div>

        {dbInfo?.metadata?.backups?.length === 0 ? (
          <p className="text-slate-400 italic py-2">No backups created yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {dbInfo?.metadata?.backups?.map((b: any) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-2 rounded bg-white/20 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {b.filename}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{new Date(b.timestamp).toLocaleString()}</span>
                    <span>•</span>
                    <span>{formatBytes(b.sizeBytes)}</span>
                    <span>•</span>
                    <Badge variant="secondary">{b.reason}</Badge>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmRestorePath(b.filepath)}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Reset */}
      <Dialog
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        title="Reset FloatDesk Database?"
        description="This will clear your monitor configurations and reset to factory workspace defaults. A safety backup will be created automatically before reset."
      >
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="ghost" size="sm" onClick={() => setConfirmResetOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleResetDatabase}>
            Confirm & Reset
          </Button>
        </div>
      </Dialog>

      {/* Confirmation Dialog for Restore */}
      <Dialog
        isOpen={!!confirmRestorePath}
        onClose={() => setConfirmRestorePath(null)}
        title="Restore Selected Backup?"
        description="The active database will be replaced with this backup file. An automated safety snapshot of your current state will be preserved."
      >
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="ghost" size="sm" onClick={() => setConfirmRestorePath(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => confirmRestorePath && handleRestoreBackup(confirmRestorePath)}
          >
            Confirm & Restore
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
