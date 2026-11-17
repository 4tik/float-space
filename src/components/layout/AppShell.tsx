import React, { useState } from 'react';
import {
  Monitor,
  AppWindow,
  Search,
  RefreshCw,
  Plus,
  Sliders,
  Pin,
  Lock,
  Unlock,
  ExternalLink,
  X,
  Settings as SettingsIcon,
  HelpCircle,
  Eye,
  Layers,
  ChevronRight,
  Tv,
} from 'lucide-react';
import { MacTrafficLights } from '../common/MacTrafficLights';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { Dialog } from '../common/Dialog';
import { DatabaseSettings } from '../../features/settings/DatabaseSettings';
import { useApplicationStore } from '../../stores/application-store';
import { useMonitorStore } from '../../stores/monitor-store';
import { useSettingsStore } from '../../stores/settings-store';
import { ipcClient } from '../../services/ipc-client';
import { cn } from '../../utils/cn';
import { RunningWindowInfo } from '../../types/application';

export const AppShell: React.FC = () => {
  const { runningWindows, loadApplications, isLoading, focusWindow } = useApplicationStore();
  const {
    monitors,
    createMonitor,
    closeMonitor,
    setOpacity,
    setAlwaysOnTop,
    setLocked,
    minimizeMonitor,
    restoreMonitor,
    focusSource,
  } = useMonitorStore();
  const { settings, updateSettings, setTheme } = useSettingsStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'appearance' | 'database'>('appearance');

  // Filter running windows based on search term
  const filteredWindows = runningWindows.filter(
    (win) =>
      win.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      win.appName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateMonitor = async (win: RunningWindowInfo) => {
    await createMonitor({
      title: win.title,
      sourceWindowId: win.sourceId,
      displayMode: 'live-monitor',
      alwaysOnTop: settings.defaultAlwaysOnTop ?? true,
      opacity: settings.defaultOpacity ?? 1.0,
      width: settings.defaultWidth || 480,
      height: settings.defaultHeight || 320,
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const item = JSON.parse(raw);
        await createMonitor({
          title: item.title,
          sourceWindowId: item.sourceId,
          displayMode: 'live-monitor',
          alwaysOnTop: settings.defaultAlwaysOnTop ?? true,
          opacity: settings.defaultOpacity ?? 1.0,
          width: settings.defaultWidth || 480,
          height: settings.defaultHeight || 320,
        });
      }
    } catch (err) {
      console.error('Failed to create monitor from drop', err);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100/95 dark:bg-[#161618] text-slate-800 dark:text-slate-100 select-none font-sans rounded-mac-xl border border-slate-300/40 dark:border-white/10 shadow-mac-window dark:shadow-mac-window-dark">
      {/* Header with Float-Space Branding & Window Controls */}
      <header className="h-11 w-full flex items-center justify-between px-3.5 border-b border-slate-200/60 dark:border-white/5 select-none app-drag-region shrink-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <MacTrafficLights
            onClose={() => ipcClient.closeMain()}
            onMinimize={() => ipcClient.minimizeMain()}
            onMaximize={() => ipcClient.maximizeMain()}
          />
          <div className="flex items-center gap-2 pl-2">
            <Monitor size={15} className="text-primary-500" />
            <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Float-Space
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Desktop Monitor</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 app-no-drag">
          <Button
            size="sm"
            variant="ghost"
            icon={<RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />}
            onClick={() => loadApplications()}
            title="Refresh running applications"
          >
            Refresh
          </Button>

          <Button
            size="sm"
            variant="ghost"
            icon={<SettingsIcon size={12} />}
            onClick={() => setSettingsOpen(true)}
            title="Settings & Storage"
          >
            Settings
          </Button>
        </div>
      </header>

      {/* Main Two-Column Workflow Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Running Applications & Browser Windows */}
        <section className="w-80 border-r border-slate-200/60 dark:border-white/5 flex flex-col bg-slate-50/50 dark:bg-zinc-900/20 app-no-drag">
          <div className="p-3 border-b border-slate-200/50 dark:border-white/5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AppWindow size={13} /> Running Applications ({filteredWindows.length})
              </h2>
            </div>
            <Input
              icon={<Search size={13} />}
              placeholder="Filter running windows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 text-xs"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {filteredWindows.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <AppWindow size={24} className="mx-auto mb-1.5 opacity-50" />
                <p className="text-xs">No matching windows detected.</p>
                <p className="text-[10px] text-slate-500 mt-1">Make sure the application is open and visible on your desktop.</p>
              </div>
            ) : (
              filteredWindows.map((win) => (
                <div
                  key={win.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify(win));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="group p-2.5 rounded-mac border border-slate-200/60 dark:border-white/5 bg-white/60 dark:bg-white/5 hover:border-primary-500/40 hover:bg-primary-500/5 cursor-grab active:cursor-grabbing transition-all flex items-center justify-between gap-2 shadow-sm"
                  title="Drag onto the monitor area or click Float to create a monitor"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-1">
                    {win.iconDataUrl ? (
                      <img src={win.iconDataUrl} alt="" className="w-5 h-5 rounded shrink-0 object-contain" />
                    ) : (
                      <div className="w-5 h-5 rounded bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0 text-[10px] font-bold">
                        {win.appName.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate leading-snug">
                        {win.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {win.appName} {win.processId ? `• PID ${win.processId}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCreateMonitor(win)}
                      className="px-2 py-1 rounded-mac text-[11px] font-medium bg-primary-500/10 hover:bg-primary-500 text-primary-600 dark:text-primary-400 hover:text-white transition-all flex items-center gap-1"
                      title="Turn into floating monitor"
                    >
                      <Plus size={11} /> Float
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-slate-200/50 dark:border-white/5 text-[10px] text-slate-400 text-center">
            Tip: Drag any app into the monitor zone
          </div>
        </section>

        {/* Right Column: Drag & Drop Zone and Active Floating Monitors */}
        <section className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4 app-no-drag">
          {/* Simple Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-mac-lg p-5 text-center transition-all flex flex-col items-center justify-center min-h-[110px]',
              isDragOver
                ? 'border-primary-500 bg-primary-500/10 scale-[1.01]'
                : 'border-slate-300/70 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 bg-white/30 dark:bg-white/5'
            )}
          >
            <Tv size={24} className={isDragOver ? 'text-primary-500 animate-bounce' : 'text-slate-400 mb-1'} />
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
              {isDragOver ? 'Release to Create Floating Monitor' : 'Drag & Drop an Application Here'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm">
              Instantly spawns an independent floating window you can pin above all apps or keep in the background.
            </p>
          </div>

          {/* Active Floating Monitors List */}
          <div className="flex-1 flex flex-col space-y-2">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Monitor size={13} /> Active Floating Monitors ({monitors.length})
              </h2>
              {monitors.length > 0 && (
                <span className="text-[11px] text-slate-400">
                  {monitors.filter((m) => m.alwaysOnTop).length} Pinned • {monitors.filter((m) => !m.alwaysOnTop).length} Background
                </span>
              )}
            </div>

            {monitors.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-slate-200/60 dark:border-white/5 rounded-mac-lg bg-white/20 dark:bg-white/5">
                <Monitor size={32} className="text-slate-300 dark:text-slate-600 mb-2" />
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No Floating Monitors Open
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Select an application from the left list or drag it into the drop zone above.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {monitors.map((mon) => (
                  <div
                    key={mon.id}
                    className="p-3 rounded-mac-lg border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-white/20 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {mon.title}
                        </span>
                        {/* Status: Always on Top / Pin vs Background Mode */}
                        <Badge variant={mon.alwaysOnTop ? 'primary' : 'secondary'}>
                          {mon.alwaysOnTop ? 'Pinned (Always on Top)' : 'Background Mode'}
                        </Badge>
                        {mon.isLocked && <Badge variant="warning">Locked</Badge>}
                        {mon.isMinimized && <Badge variant="secondary">Minimized</Badge>}
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3">
                        <span>Size: {mon.width} × {mon.height}px</span>
                        <span>Opacity: {Math.round(mon.opacity * 100)}%</span>
                      </div>
                    </div>

                    {/* Compact Monitor Controls */}
                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      {/* Pin Toggle: Always on Top vs Background Mode */}
                      <button
                        onClick={() => setAlwaysOnTop(mon.id, !mon.alwaysOnTop)}
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 transition-all',
                          mon.alwaysOnTop
                            ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                        )}
                        title={mon.alwaysOnTop ? 'Disable pin (Keep in background)' : 'Pin above other windows'}
                      >
                        <Pin size={11} className={mon.alwaysOnTop ? 'fill-current' : ''} />
                        {mon.alwaysOnTop ? 'Pinned' : 'Background'}
                      </button>

                      {/* Lock Toggle */}
                      <button
                        onClick={() => setLocked(mon.id, !mon.isLocked)}
                        className={cn(
                          'p-1.5 rounded text-xs border transition-all',
                          mon.isLocked
                            ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:text-slate-800'
                        )}
                        title={mon.isLocked ? 'Unlock position and size' : 'Lock position and size'}
                      >
                        {mon.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                      </button>

                      {/* Opacity Control Slider */}
                      <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/10">
                        <Sliders size={11} className="text-slate-400" />
                        <input
                          type="range"
                          min="0.2"
                          max="1.0"
                          step="0.05"
                          value={mon.opacity}
                          onChange={(e) => setOpacity(mon.id, parseFloat(e.target.value))}
                          className="w-14 h-1 accent-primary-500 cursor-pointer"
                          title={`Adjust Opacity: ${Math.round(mon.opacity * 100)}%`}
                        />
                      </div>

                      {/* Focus Original App */}
                      {mon.sourceWindowId && (
                        <button
                          onClick={() => focusSource(mon.id)}
                          className="p-1.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-white/10 transition-colors"
                          title="Focus original application window"
                        >
                          <ExternalLink size={12} />
                        </button>
                      )}

                      {/* Minimize / Restore */}
                      <button
                        onClick={() => (mon.isMinimized ? restoreMonitor(mon.id) : minimizeMonitor(mon.id))}
                        className="px-2 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-200 transition-colors"
                        title={mon.isMinimized ? 'Restore window' : 'Minimize window'}
                      >
                        {mon.isMinimized ? 'Restore' : 'Min'}
                      </button>

                      {/* Close Window */}
                      <button
                        onClick={() => closeMonitor(mon.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Close floating monitor"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Settings & Storage Dialog */}
      <Dialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Float-Space Settings"
        description="Appearance preferences, default behavior, and local SQLite database."
        className="max-w-2xl"
      >
        <div className="space-y-4 pt-1">
          {/* Settings Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-white/10 pb-2">
            <button
              onClick={() => setActiveSettingsTab('appearance')}
              className={cn(
                'px-3 py-1 rounded-mac text-xs font-medium transition-colors',
                activeSettingsTab === 'appearance'
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5'
              )}
            >
              Preferences
            </button>
            <button
              onClick={() => setActiveSettingsTab('database')}
              className={cn(
                'px-3 py-1 rounded-mac text-xs font-medium transition-colors',
                activeSettingsTab === 'database'
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5'
              )}
            >
              Database & Storage
            </button>
          </div>

          {activeSettingsTab === 'appearance' ? (
            <div className="space-y-4 text-xs">
              {/* Theme Mode */}
              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Theme Appearance
                </label>
                <div className="flex items-center gap-2">
                  {(['dark', 'light', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cn(
                        'px-3 py-1.5 rounded-mac border text-xs font-medium capitalize transition-all',
                        settings.theme === t
                          ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                          : 'border-slate-300/60 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Floating Monitor Behavior */}
              <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
                <label className="flex items-center justify-between p-2 rounded-mac hover:bg-slate-200/40 dark:hover:bg-white/5 cursor-pointer">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      Default: Always on Top (Pinned)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      When enabled, newly created floating monitors default to always-on-top. Otherwise, they start in background mode.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.defaultAlwaysOnTop}
                    onChange={(e) => updateSettings({ defaultAlwaysOnTop: e.target.checked })}
                    className="accent-primary-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-mac hover:bg-slate-200/40 dark:hover:bg-white/5 cursor-pointer">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      Restore Session on Startup
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Automatically reload open floating monitors from SQLite database upon launching Float-Space.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.restorePreviousSession}
                    onChange={(e) => updateSettings({ restorePreviousSession: e.target.checked })}
                    className="accent-primary-500 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              {/* Frame rate */}
              <div className="pt-2 border-t border-slate-200/50 dark:border-white/5">
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Capture Frame Rate
                </label>
                <div className="flex items-center gap-2">
                  {[15, 30, 60].map((fps) => (
                    <button
                      key={fps}
                      onClick={() => updateSettings({ captureFrameRate: fps })}
                      className={cn(
                        'px-3 py-1 rounded-mac border text-xs font-medium transition-all',
                        settings.captureFrameRate === fps
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'border-slate-300/60 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      )}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <DatabaseSettings />
          )}

          <div className="flex justify-end pt-2 border-t border-slate-200/50 dark:border-white/10">
            <Button size="sm" variant="secondary" onClick={() => setSettingsOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
