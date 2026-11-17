import React, { useState } from 'react';
import { Dialog } from '../../components/common/Dialog';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useMonitorStore } from '../../stores/monitor-store';
import { useApplicationStore } from '../../stores/application-store';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { useDisplayStore } from '../../stores/display-store';
import { DisplayMode } from '../../types/application';

interface CreateMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSourceId?: string;
  initialTitle?: string;
}

export const CreateMonitorModal: React.FC<CreateMonitorModalProps> = ({
  isOpen,
  onClose,
  initialSourceId,
  initialTitle,
}) => {
  const { createMonitor } = useMonitorStore();
  const { runningWindows, installedApps } = useApplicationStore();
  const { workspaces, groups, activeWorkspaceId } = useWorkspaceStore();
  const { displays } = useDisplayStore();

  const [title, setTitle] = useState(initialTitle || 'New Monitor');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('live-monitor');
  const [sourceWindowId, setSourceWindowId] = useState(initialSourceId || '');
  const [workspaceId, setWorkspaceId] = useState(activeWorkspaceId);
  const [groupId, setGroupId] = useState('');
  const [displayId, setDisplayId] = useState(0);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [opacity, setOpacity] = useState(1.0);
  const [width, setWidth] = useState(480);
  const [height, setHeight] = useState(320);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMonitor({
      title: title.trim() || 'Floating Monitor',
      displayMode,
      sourceWindowId: sourceWindowId || undefined,
      workspaceId,
      groupId: groupId || undefined,
      displayId,
      alwaysOnTop,
      opacity,
      width,
      height,
    });
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Floating Monitor"
      description="Configure an independent floating window for your workspace."
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div>
          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
            Monitor Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Server Logs or Music Player"
            required
          />
        </div>

        {/* Display Mode Selection */}
        <div>
          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
            Display Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'live-monitor', label: 'Live Monitor', desc: 'Real-time capture' },
              { id: 'embedded', label: 'Embedded', desc: 'Native frame' },
              { id: 'launcher', label: 'Launcher', desc: 'Quick focus/open' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setDisplayMode(mode.id as DisplayMode)}
                className={`p-2 rounded-mac border text-left transition-all ${
                  displayMode === mode.id
                    ? 'border-primary-500 bg-primary-500/10 text-primary-500 font-semibold'
                    : 'border-slate-200/50 dark:border-white/10 hover:bg-slate-200/40 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-[11px]">{mode.label}</div>
                <div className="text-[9px] opacity-75">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Target Running Window */}
        <div>
          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
            Target Application Window
          </label>
          <select
            value={sourceWindowId}
            onChange={(e) => {
              setSourceWindowId(e.target.value);
              const selected = runningWindows.find((w) => w.sourceId === e.target.value);
              if (selected && !title) setTitle(selected.title);
            }}
            className="w-full bg-slate-100/80 dark:bg-black/30 border border-slate-300/60 dark:border-white/10 rounded-mac p-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          >
            <option value="">-- Select detected window (or leave blank) --</option>
            {runningWindows.map((win) => (
              <option key={win.id} value={win.sourceId}>
                {win.title} ({win.appName})
              </option>
            ))}
          </select>
        </div>

        {/* Workspace and Group */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Workspace
            </label>
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="w-full bg-slate-100/80 dark:bg-black/30 border border-slate-300/60 dark:border-white/10 rounded-mac p-1.5 text-xs text-slate-800 dark:text-slate-200"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Group (Optional)
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full bg-slate-100/80 dark:bg-black/30 border border-slate-300/60 dark:border-white/10 rounded-mac p-1.5 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="">-- No Group --</option>
              {groups.map((grp) => (
                <option key={grp.id} value={grp.id}>
                  {grp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dimensions and Opacity */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Initial Dimensions (W × H)
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min="240"
                max="1920"
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value, 10))}
              />
              <span className="text-slate-400">×</span>
              <Input
                type="number"
                min="160"
                max="1080"
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Opacity ({Math.round(opacity * 100)}%)
            </label>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full h-2 mt-2 bg-slate-200 dark:bg-white/10 rounded accent-primary-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Always on top toggle */}
        <div className="flex items-center justify-between pt-1">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Keep Window Always On Top
          </span>
          <input
            type="checkbox"
            checked={alwaysOnTop}
            onChange={(e) => setAlwaysOnTop(e.target.checked)}
            className="w-4 h-4 accent-primary-500 rounded cursor-pointer"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/50 dark:border-white/10">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit">
            Create Monitor
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
