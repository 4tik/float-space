import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Trash2,
  Check,
  Monitor,
  ArrowRight,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { useMonitorStore } from '../../stores/monitor-store';
import { Button } from '../../components/common/Button';
import { Dialog } from '../../components/common/Dialog';
import { Input } from '../../components/common/Input';
import { cn } from '../../utils/cn';

export const WorkspacesView: React.FC = () => {
  const { workspaces, activeWorkspaceId, setActiveWorkspace, createWorkspace, deleteWorkspace } =
    useWorkspaceStore();
  const { monitors } = useMonitorStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    await createWorkspace(newWsName.trim(), newWsDesc.trim());
    setNewWsName('');
    setNewWsDesc('');
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-fade-in app-no-drag">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-white/10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FolderKanban className="text-primary-500" size={20} />
            Workspaces & Spaces
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize floating monitors into application-managed virtual workspaces.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={13} />}
          onClick={() => setIsModalOpen(true)}
        >
          Create Workspace
        </Button>
      </div>

      {/* Grid of Workspaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workspaces.map((ws) => {
          const isCurrent = activeWorkspaceId === ws.id;
          const assignedMonitors = monitors.filter((m) => m.workspaceId === ws.id);

          return (
            <div
              key={ws.id}
              className={cn(
                'mac-glass-surface p-4 rounded-mac-lg border transition-all duration-200 shadow-mac-card dark:shadow-mac-card-dark flex flex-col justify-between',
                isCurrent
                  ? 'border-primary-500/60 ring-2 ring-primary-500/20'
                  : 'border-slate-200/50 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {ws.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] bg-primary-500 text-white px-2 py-0.5 rounded-full font-medium">
                        Active Space
                      </span>
                    )}
                  </div>
                  {workspaces.length > 1 && (
                    <button
                      onClick={() => deleteWorkspace(ws.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-rose-500/10 transition-colors"
                      title="Delete Workspace"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 min-h-[32px]">
                  {ws.description || 'No description provided.'}
                </p>

                {/* Monitors in workspace */}
                <div className="border-t border-slate-200/40 dark:border-white/5 pt-2.5 mb-4">
                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Monitor size={12} /> Assigned Monitors
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {assignedMonitors.length}
                    </span>
                  </div>

                  {assignedMonitors.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">No monitors currently in this workspace.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {assignedMonitors.map((m) => (
                        <span
                          key={m.id}
                          className="text-[10px] bg-slate-200/60 dark:bg-white/10 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded"
                        >
                          {m.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="pt-2">
                {!isCurrent ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center"
                    icon={<ArrowRight size={12} />}
                    onClick={() => setActiveWorkspace(ws.id)}
                  >
                    Switch to {ws.name}
                  </Button>
                ) : (
                  <div className="w-full py-1 text-center text-xs font-medium text-primary-500 flex items-center justify-center gap-1">
                    <Check size={13} /> Currently Displayed
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Workspace"
        description="Add a distinct workspace layout for your tasks."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Workspace Name
            </label>
            <Input
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="e.g. Design & Research"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <Input
              value={newWsDesc}
              onChange={(e) => setNewWsDesc(e.target.value)}
              placeholder="e.g. Figma, Color pickers, Browsers"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Create
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
