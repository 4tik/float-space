import React, { useState } from 'react';
import {
  Layers,
  X,
  Maximize2,
  Lock,
  Unlock,
  Eye,
  Tv,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { useMonitorStore } from '../../stores/monitor-store';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { cn } from '../../utils/cn';

export const MissionControlView: React.FC = () => {
  const {
    monitors,
    selectedMonitorId,
    selectMonitor,
    closeMonitor,
    restoreMonitor,
    setLocked,
    autoArrange,
  } = useMonitorStore();

  const { workspaces, groups } = useWorkspaceStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === monitors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(monitors.map((m) => m.id));
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto animate-fade-in app-no-drag">
      {/* Header and Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-white/10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="text-primary-500" size={20} />
            Mission Control
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Overview of all active independent floating monitors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {monitors.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={selectAll}
              icon={
                selectedIds.length === monitors.length ? (
                  <CheckSquare size={13} />
                ) : (
                  <Square size={13} />
                )
              }
            >
              {selectedIds.length === monitors.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}

          <Button
            size="sm"
            variant="primary"
            onClick={() => autoArrange()}
            icon={<Sparkles size={13} />}
          >
            Auto Arrange Grid
          </Button>
        </div>
      </div>

      {/* Grid of Monitors */}
      {monitors.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-300/60 dark:border-white/10 rounded-mac-xl">
          <Tv size={36} className="mx-auto text-slate-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No Active Floating Monitors
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Create your first floating window or launch an application to monitor it in real-time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {monitors.map((mon) => {
            const isSelected = selectedIds.includes(mon.id);
            const isFocused = selectedMonitorId === mon.id;
            const workspace = workspaces.find((w) => w.id === mon.workspaceId);
            const group = groups.find((g) => g.id === mon.groupId);

            return (
              <div
                key={mon.id}
                onClick={() => selectMonitor(mon.id)}
                className={cn(
                  'mac-glass-surface rounded-mac-lg p-3.5 border transition-all duration-200 shadow-mac-card dark:shadow-mac-card-dark relative group cursor-pointer',
                  isFocused
                    ? 'ring-2 ring-primary-500 border-primary-500/50'
                    : isSelected
                    ? 'border-primary-400 bg-primary-500/5'
                    : 'border-slate-200/50 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                )}
              >
                {/* Top bar with Selection checkbox and Traffic lights */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/40 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(mon.id);
                      }}
                      className="text-slate-400 hover:text-primary-500 transition-colors"
                    >
                      {isSelected ? <CheckSquare size={14} className="text-primary-500" /> : <Square size={14} />}
                    </button>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                      {mon.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocked(mon.id, !mon.isLocked);
                      }}
                      className={cn(
                        'p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors',
                        mon.isLocked ? 'text-amber-500' : ''
                      )}
                      title={mon.isLocked ? 'Locked' : 'Unlocked'}
                    >
                      {mon.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeMonitor(mon.id);
                      }}
                      className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Close Monitor"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {/* Simulated preview display */}
                <div className="h-32 bg-slate-900/90 rounded-mac border border-black/20 flex flex-col items-center justify-center p-3 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent pointer-events-none" />
                  <Tv size={24} className="text-primary-400/80 mb-2" />
                  <div className="text-[11px] font-medium text-slate-200 truncate w-full px-2">
                    {mon.title}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    {mon.width} × {mon.height}px • Opacity {Math.round(mon.opacity * 100)}%
                  </div>
                </div>

                {/* Footer details */}
                <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="primary">{mon.displayMode}</Badge>
                    {workspace && <Badge variant="secondary">{workspace.name}</Badge>}
                    {group && <Badge variant="warning">{group.name}</Badge>}
                  </div>
                  {mon.isMinimized && <span className="text-amber-500 italic">Minimized</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
