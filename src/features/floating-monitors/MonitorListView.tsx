import React from 'react';
import {
  MonitorCheck,
  PlusCircle,
  Lock,
  Unlock,
  Pin,
  X,
  ExternalLink,
  Sliders,
  Tv,
} from 'lucide-react';
import { useMonitorStore } from '../../stores/monitor-store';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { cn } from '../../utils/cn';

interface MonitorListViewProps {
  onOpenCreateModal: () => void;
}

export const MonitorListView: React.FC<MonitorListViewProps> = ({ onOpenCreateModal }) => {
  const {
    monitors,
    closeMonitor,
    setOpacity,
    setAlwaysOnTop,
    setLocked,
    minimizeMonitor,
    restoreMonitor,
    focusSource,
  } = useMonitorStore();

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto animate-fade-in app-no-drag">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-white/10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MonitorCheck className="text-primary-500" size={20} />
            Floating Monitors Manager
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your independent floating windows, toggle pin/locks, and adjust individual opacities.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<PlusCircle size={13} />}
          onClick={onOpenCreateModal}
        >
          Add Monitor
        </Button>
      </div>

      {monitors.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-300/60 dark:border-white/10 rounded-mac-xl">
          <Tv size={36} className="mx-auto text-slate-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No Active Monitors
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            You do not have any floating windows open. Click &quot;Add Monitor&quot; above to spawn one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {monitors.map((mon) => (
            <div
              key={mon.id}
              className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10 shadow-mac-card dark:shadow-mac-card-dark flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {mon.title}
                  </h3>
                  <Badge variant="primary">{mon.displayMode}</Badge>
                  {mon.isLocked && <Badge variant="warning">Locked</Badge>}
                  {mon.isMinimized && <Badge variant="secondary">Minimized</Badge>}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                  <span>Size: {mon.width} × {mon.height}px</span>
                  <span>Pos: ({mon.positionX}, {mon.positionY})</span>
                  <span>Opacity: {Math.round(mon.opacity * 100)}%</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {/* Opacity slider */}
                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-mac border border-slate-200/60 dark:border-white/5">
                  <Sliders size={12} className="text-slate-400" />
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={mon.opacity}
                    onChange={(e) => setOpacity(mon.id, parseFloat(e.target.value))}
                    className="w-16 h-1 accent-primary-500 cursor-pointer"
                    title={`Opacity: ${Math.round(mon.opacity * 100)}%`}
                  />
                </div>

                {/* Always on top Pin */}
                <Button
                  size="sm"
                  variant={mon.alwaysOnTop ? 'primary' : 'secondary'}
                  icon={<Pin size={12} className={mon.alwaysOnTop ? 'fill-current' : ''} />}
                  onClick={() => setAlwaysOnTop(mon.id, !mon.alwaysOnTop)}
                  title={mon.alwaysOnTop ? 'Unpin' : 'Pin Always on top'}
                >
                  {mon.alwaysOnTop ? 'Pinned' : 'Pin'}
                </Button>

                {/* Lock toggle */}
                <Button
                  size="sm"
                  variant={mon.isLocked ? 'secondary' : 'ghost'}
                  icon={mon.isLocked ? <Lock size={12} className="text-amber-500" /> : <Unlock size={12} />}
                  onClick={() => setLocked(mon.id, !mon.isLocked)}
                  title={mon.isLocked ? 'Unlock' : 'Lock'}
                >
                  {mon.isLocked ? 'Locked' : 'Lock'}
                </Button>

                {/* Focus original app */}
                {mon.sourceWindowId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<ExternalLink size={12} />}
                    onClick={() => focusSource(mon.id)}
                    title="Focus Source Application"
                  >
                    Focus
                  </Button>
                )}

                {/* Minimize / Restore */}
                {mon.isMinimized ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => restoreMonitor(mon.id)}
                  >
                    Restore
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => minimizeMonitor(mon.id)}
                  >
                    Min
                  </Button>
                )}

                {/* Close */}
                <button
                  onClick={() => closeMonitor(mon.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-mac transition-colors"
                  title="Close Window"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
