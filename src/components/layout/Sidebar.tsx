import React from 'react';
import {
  LayoutDashboard,
  Layers,
  MonitorCheck,
  AppWindow,
  Sliders,
  Settings,
  Info,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export type NavigationTab =
  | 'dashboard'
  | 'mission-control'
  | 'workspaces'
  | 'floating-monitors'
  | 'applications'
  | 'layouts'
  | 'settings'
  | 'about';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeMonitorCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  activeMonitorCount,
}) => {
  const navSections = [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
        { id: 'mission-control', label: 'Mission Control', icon: <Layers size={15} />, badge: activeMonitorCount > 0 ? activeMonitorCount : undefined },
        { id: 'workspaces', label: 'Workspaces', icon: <FolderKanban size={15} /> },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { id: 'floating-monitors', label: 'Floating Monitors', icon: <MonitorCheck size={15} /> },
        { id: 'applications', label: 'Applications', icon: <AppWindow size={15} /> },
        { id: 'layouts', label: 'Layouts & Snap', icon: <Sliders size={15} /> },
      ],
    },
    {
      title: 'PREFERENCES',
      items: [
        { id: 'settings', label: 'Settings', icon: <Settings size={15} /> },
        { id: 'about', label: 'About', icon: <Info size={15} /> },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'mac-sidebar-surface flex flex-col justify-between transition-all duration-200 select-none border-r border-slate-300/30 dark:border-white/5 relative z-20',
        collapsed ? 'w-14' : 'w-52'
      )}
    >
      <div className="flex flex-col h-full pt-12 pb-3 px-2 overflow-y-auto overflow-x-hidden">
        {navSections.map((section, sIdx) => (
          <div key={section.title} className={cn('mb-4', sIdx !== 0 ? 'mt-1' : '')}>
            {!collapsed && (
              <h4 className="px-2.5 mb-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
                {section.title}
              </h4>
            )}
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id as NavigationTab)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-mac text-xs font-medium transition-all group app-no-drag',
                      isActive
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-slate-200'
                    )}
                  >
                    <span className={cn('shrink-0', isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200')}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}
                    {!collapsed && item.badge !== undefined && (
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.2 rounded-full font-semibold',
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Collapse toggle footer */}
      <div className="p-2 border-t border-slate-200/40 dark:border-white/5 flex items-center justify-between app-no-drag">
        {!collapsed && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 px-2">
            v1.0.0
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-mac transition-colors ml-auto"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
};
