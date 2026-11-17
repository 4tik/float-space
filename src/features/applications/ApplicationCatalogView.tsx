import React, { useState } from 'react';
import {
  AppWindow,
  Search,
  RefreshCw,
  Play,
  ExternalLink,
  PlusCircle,
  Filter,
} from 'lucide-react';
import { useApplicationStore } from '../../stores/application-store';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { cn } from '../../utils/cn';

interface ApplicationCatalogViewProps {
  onAttachMonitor: (sourceId?: string, title?: string) => void;
}

export const ApplicationCatalogView: React.FC<ApplicationCatalogViewProps> = ({
  onAttachMonitor,
}) => {
  const {
    installedApps,
    runningWindows,
    searchTerm,
    setSearchTerm,
    filterMode,
    setFilterMode,
    loadApplications,
    launchApp,
    focusWindow,
    isLoading,
  } = useApplicationStore();

  const filteredInstalled = installedApps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.executablePath.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterMode === 'running') return matchesSearch && app.isRunning;
    if (filterMode === 'installed') return matchesSearch && !app.isRunning;
    return matchesSearch;
  });

  const filteredWindows = runningWindows.filter((win) => {
    return (
      win.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      win.appName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto animate-fade-in app-no-drag">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-white/10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AppWindow className="text-primary-500" size={20} />
            Application Discovery & Launcher
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Discover installed applications, inspect top-level windows, and launch or attach them.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
          onClick={() => loadApplications()}
        >
          Scan & Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="max-w-md w-full">
          <Input
            icon={<Search size={14} />}
            placeholder="Search installed applications or active windows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-white/5 p-1 rounded-mac border border-slate-200/60 dark:border-white/5">
          {[
            { id: 'all', label: 'All' },
            { id: 'running', label: 'Running Windows' },
            { id: 'installed', label: 'Installed Apps' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as any)}
              className={cn(
                'text-xs px-2.5 py-1 rounded transition-colors font-medium',
                filterMode === tab.id
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Detected Running Windows Section */}
      {filterMode !== 'installed' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Active Running Windows ({filteredWindows.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredWindows.map((win) => (
              <div
                key={win.id}
                className="mac-glass-surface p-3.5 rounded-mac-lg border border-slate-200/50 dark:border-white/10 shadow-mac-card dark:shadow-mac-card-dark flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all"
              >
                <div>
                  <div className="flex items-start gap-2.5 mb-2">
                    {win.iconDataUrl ? (
                      <img src={win.iconDataUrl} alt="" className="w-5 h-5 rounded shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-5 h-5 rounded bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0">
                        <AppWindow size={13} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {win.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {win.appName} {win.processId ? `• PID ${win.processId}` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-slate-200/40 dark:border-white/5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 justify-center"
                    icon={<ExternalLink size={11} />}
                    onClick={() => focusWindow(win.id, win.processId)}
                  >
                    Focus
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    className="flex-1 justify-center"
                    icon={<PlusCircle size={11} />}
                    onClick={() => onAttachMonitor(win.sourceId, win.title)}
                  >
                    Attach Monitor
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Installed Applications Catalog */}
      {filterMode !== 'running' && (
        <div className="space-y-3 pt-3">
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Installed Desktop Applications ({filteredInstalled.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredInstalled.map((app) => (
              <div
                key={app.id}
                className="mac-glass-surface p-3 rounded-mac-lg border border-slate-200/50 dark:border-white/10 shadow-mac-card dark:shadow-mac-card-dark flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-6 h-6 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                    {app.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {app.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {app.executablePath}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {app.isRunning && <Badge variant="success">Running</Badge>}
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Play size={10} />}
                    onClick={() => launchApp(app.executablePath)}
                  >
                    Launch
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
