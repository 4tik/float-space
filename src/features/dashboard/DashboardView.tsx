import React from 'react';
import {
  Monitor,
  AppWindow,
  FolderKanban,
  Play,
  Layers,
  PlusCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useMonitorStore } from '../../stores/monitor-store';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { useApplicationStore } from '../../stores/application-store';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

interface DashboardViewProps {
  onOpenCreateModal: () => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenCreateModal,
  onNavigateTab,
}) => {
  const { monitors, autoArrange, showAllMonitors } = useMonitorStore();
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { runningWindows, installedApps, launchApp, focusWindow, loadApplications } =
    useApplicationStore();

  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const activeMonitorsCount = monitors.length;
  const runningCount = runningWindows.length;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-fade-in app-no-drag">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Floating Workspace Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cross-platform desktop manager with independent floating monitors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={13} />}
            onClick={() => loadApplications()}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<PlusCircle size={13} />}
            onClick={onOpenCreateModal}
          >
            Create Monitor
          </Button>
        </div>
      </div>

      {/* Primary Status Overview (Only on Dashboard as requested in Section 4 & 5) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10 shadow-mac-card dark:shadow-mac-card-dark flex items-center gap-3.5">
          <div className="p-2.5 rounded-mac bg-primary-500/10 text-primary-500 shrink-0">
            <Monitor size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Active Floating Monitors
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {activeMonitorsCount}
              </span>
              <span className="text-[11px] text-slate-400">running</span>
            </div>
          </div>
        </div>

        <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10 shadow-mac-card dark:shadow-mac-card-dark flex items-center gap-3.5">
          <div className="p-2.5 rounded-mac bg-emerald-500/10 text-emerald-500 shrink-0">
            <AppWindow size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Running App Windows
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {runningCount}
              </span>
              <span className="text-[11px] text-slate-400">detected</span>
            </div>
          </div>
        </div>

        <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10 shadow-mac-card dark:shadow-mac-card-dark flex items-center gap-3.5">
          <div className="p-2.5 rounded-mac bg-purple-500/10 text-purple-500 shrink-0">
            <FolderKanban size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Current Workspace
            </span>
            <div className="flex items-baseline gap-2 mt-0.5 truncate">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentWorkspace?.name || 'Default'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions (Section 5) */}
      <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10">
        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wider">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={onOpenCreateModal}
            className="flex flex-col items-center justify-center p-3 rounded-mac border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-white/5 hover:bg-primary-500/10 hover:border-primary-500/30 transition-all text-center group"
          >
            <PlusCircle size={18} className="text-primary-500 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              Create Monitor
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Spawn new floating window</span>
          </button>

          <button
            onClick={() => onNavigateTab('mission-control')}
            className="flex flex-col items-center justify-center p-3 rounded-mac border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-white/5 hover:bg-primary-500/10 hover:border-primary-500/30 transition-all text-center group"
          >
            <Layers size={18} className="text-indigo-500 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              Mission Control
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Visual overview of monitors</span>
          </button>

          <button
            onClick={() => onNavigateTab('workspaces')}
            className="flex flex-col items-center justify-center p-3 rounded-mac border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-white/5 hover:bg-primary-500/10 hover:border-primary-500/30 transition-all text-center group"
          >
            <FolderKanban size={18} className="text-amber-500 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              Workspaces
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Switch spaces & setups</span>
          </button>

          <button
            onClick={() => autoArrange(activeWorkspaceId)}
            className="flex flex-col items-center justify-center p-3 rounded-mac border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-white/5 hover:bg-primary-500/10 hover:border-primary-500/30 transition-all text-center group"
          >
            <Play size={18} className="text-emerald-500 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              Auto Arrange
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Organize windows in grid</span>
          </button>
        </div>
      </div>

      {/* Running Monitored Applications & Fast Launch */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Detected Running Windows */}
        <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Running Windows ({runningWindows.length})
            </h3>
            <button
              onClick={() => onNavigateTab('applications')}
              className="text-[11px] text-primary-500 hover:underline flex items-center gap-1"
            >
              View All <ExternalLink size={10} />
            </button>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {runningWindows.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No external top-level windows detected.</p>
            ) : (
              runningWindows.slice(0, 5).map((win) => (
                <div
                  key={win.id}
                  className="flex items-center justify-between p-2 rounded-mac bg-white/30 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {win.iconDataUrl ? (
                      <img src={win.iconDataUrl} alt="" className="w-4 h-4 shrink-0 rounded" />
                    ) : (
                      <AppWindow size={14} className="text-slate-400 shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {win.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{win.appName}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => focusWindow(win.id, win.processId)}
                    >
                      Focus
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        onOpenCreateModal()
                      }
                    >
                      Attach
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Used / Discovered Applications */}
        <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Applications ({installedApps.length})
            </h3>
            <button
              onClick={() => onNavigateTab('applications')}
              className="text-[11px] text-primary-500 hover:underline flex items-center gap-1"
            >
              Catalog <ExternalLink size={10} />
            </button>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {installedApps.slice(0, 5).map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between p-2 rounded-mac bg-white/30 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-5 h-5 rounded bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0 text-[10px] font-bold">
                    {app.name.charAt(0)}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {app.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{app.executablePath}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {app.isRunning && <Badge variant="success">Running</Badge>}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => launchApp(app.executablePath)}
                  >
                    Launch
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
