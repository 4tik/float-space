import React from 'react';
import { Layers, Plus, Folder, Eye, EyeOff } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { useMonitorStore } from '../../stores/monitor-store';
import { cn } from '../../utils/cn';

interface StageManagerSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const StageManagerSidebar: React.FC<StageManagerSidebarProps> = ({ isOpen, onToggle }) => {
  const { groups, activeGroupId, setActiveGroup, createGroup } = useWorkspaceStore();
  const { monitors, updateMonitor } = useMonitorStore();

  return (
    <div
      className={cn(
        'transition-all duration-200 border-l border-slate-300/30 dark:border-white/5 flex flex-col bg-slate-50/70 dark:bg-zinc-900/60 backdrop-blur-md app-no-drag',
        isOpen ? 'w-56' : 'w-10'
      )}
    >
      <div className="flex items-center justify-between p-2.5 border-b border-slate-200/40 dark:border-white/5">
        <button
          onClick={onToggle}
          className="p-1 rounded-mac text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/10"
          title="Toggle Stage Manager"
        >
          <Layers size={14} />
        </button>
        {isOpen && (
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Stage Groups
          </span>
        )}
        {isOpen && (
          <button
            onClick={() => {
              const name = prompt('Enter group name:');
              if (name) createGroup('ws-dev', name);
            }}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-mac hover:bg-slate-200/50 dark:hover:bg-white/10"
            title="New Group"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {isOpen ? (
        <div className="p-2 space-y-2 overflow-y-auto flex-1">
          {/* "All Monitors" Option */}
          <button
            onClick={() => setActiveGroup(null)}
            className={cn(
              'w-full text-left p-2 rounded-mac text-xs transition-all flex items-center justify-between',
              activeGroupId === null
                ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium border border-primary-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-white/5'
            )}
          >
            <span className="flex items-center gap-2">
              <Folder size={13} />
              All Windows
            </span>
            <span className="text-[10px] bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded-full">
              {monitors.length}
            </span>
          </button>

          {/* User Groups */}
          {groups.map((group) => {
            const count = monitors.filter((m) => m.groupId === group.id).length;
            const isCurrent = activeGroupId === group.id;

            return (
              <div
                key={group.id}
                onClick={() => setActiveGroup(group.id)}
                className={cn(
                  'cursor-pointer p-2.5 rounded-mac transition-all border',
                  isCurrent
                    ? 'bg-primary-500/15 border-primary-500/30 shadow-sm'
                    : 'bg-white/40 dark:bg-white/5 border-slate-200/40 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {group.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                    {count}
                  </span>
                </div>

                {/* Stage thumbnail pile representation */}
                <div className="h-10 bg-slate-100/80 dark:bg-black/30 rounded border border-slate-200/50 dark:border-white/5 flex items-center justify-center p-1 text-[10px] text-slate-400">
                  {count > 0 ? (
                    <span className="truncate">{count} active monitor{count > 1 ? 's' : ''}</span>
                  ) : (
                    <span className="italic">Empty group</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center py-2 space-y-2">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => setActiveGroup(group.id)}
              className={cn(
                'w-6 h-6 rounded-mac flex items-center justify-center text-[10px] font-bold transition-all',
                activeGroupId === group.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/20'
              )}
              title={group.name}
            >
              {group.name.charAt(0).toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
