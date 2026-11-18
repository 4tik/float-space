import React, { useState } from 'react';
import {
  Monitor,
  AppWindow,
  Search,
  RefreshCw,
  Plus,
  Pin,
  ExternalLink,
  X,
  Settings as SettingsIcon,
  Layers,
  Globe,
  Minus,
  Square,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Dialog } from '../common/Dialog';
import { DatabaseSettings } from '../../features/settings/DatabaseSettings';
import { useApplicationStore } from '../../stores/application-store';
import { useMonitorStore } from '../../stores/monitor-store';
import { useSettingsStore } from '../../stores/settings-store';
import { ipcClient } from '../../services/ipc-client';
import { cn } from '../../utils/cn';
import { RunningWindowInfo } from '../../types/application';

const WEB_PRESETS = [
  { name: 'YouTube', url: 'https://youtube.com', icon: '▶' },
  { name: 'GitHub', url: 'https://github.com', icon: '🐙' },
  { name: 'ChatGPT', url: 'https://chatgpt.com', icon: '🤖' },
  { name: 'Notion', url: 'https://notion.so', icon: '📝' },
  { name: 'Google Docs', url: 'https://docs.google.com', icon: '📄' },
  { name: 'Slack', url: 'https://slack.com', icon: '💬' },
];

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

  const [sourceTab, setSourceTab] = useState<'apps' | 'web'>('apps');
  const [searchTerm, setSearchTerm] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'appearance' | 'database'>('appearance');

  // Filter running windows based on search term
  const filteredWindows = runningWindows.filter(
    (win) =>
      win.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      win.appName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (win.processId && String(win.processId).includes(searchTerm))
  );

  const handleCreateMonitor = async (win: RunningWindowInfo) => {
    try {
      const existing = monitors.find(
        (m) => (win.handle && m.targetHwnd === win.handle) || m.sourceWindowId === win.sourceId
      );
      if (existing) {
        focusSource(existing.id);
        return;
      }

      await createMonitor({
        title: win.title,
        sourceWindowId: win.sourceId,
        targetHwnd: win.handle,
        processId: win.processId,
        displayMode: 'live-monitor',
        alwaysOnTop: settings.defaultAlwaysOnTop ?? true,
        opacity: settings.defaultOpacity ?? 1.0,
        width: settings.defaultWidth || 480,
        height: settings.defaultHeight || 320,
      });
    } catch (err) {
      console.error('Failed to create monitor', err);
    }
  };

  const handleCreateWebMonitor = async (targetUrl?: string) => {
    let finalUrl = (targetUrl || webUrl).trim();
    if (!finalUrl) return;

    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      let hostname = finalUrl;
      try {
        hostname = new URL(finalUrl).hostname;
      } catch {}

      await createMonitor({
        title: hostname,
        url: finalUrl,
        displayMode: 'web',
        alwaysOnTop: settings.defaultAlwaysOnTop ?? true,
        opacity: settings.defaultOpacity ?? 1.0,
        width: settings.defaultWidth || 480,
        height: settings.defaultHeight || 320,
      });
      setWebUrl('');
    } catch (err) {
      console.error('Failed to create web monitor', err);
    }
  };

  const pinnedCount = monitors.filter((m) => m.alwaysOnTop).length;
  const backgroundCount = monitors.filter((m) => !m.alwaysOnTop).length;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100 text-slate-800 select-none font-sans rounded-none border border-slate-300 shadow-2xl">
      {/* Header bar matching user's design */}
      <header className="h-11 w-full flex items-center justify-between px-3.5 border-b border-slate-200 select-none app-drag-region shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          {/* Float-Space Logo */}
          <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Monitor size={14} className="stroke-[2.5]" />
          </div>

          <span className="text-sm font-bold tracking-tight text-slate-800">
            Float-Space
          </span>

          {/* Platform Monitor Badge */}
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300">
            Windows Monitor
          </span>

          <div className="flex items-center gap-1.5 ml-1.5 app-no-drag">
            <button
              onClick={() => loadApplications()}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
              title="Refresh running applications"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin text-teal-600' : ''} />
              Refresh
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
              title="Settings & Storage"
            >
              <SettingsIcon size={12} />
              Settings
            </button>
          </div>
        </div>

        {/* Windows Standard Window Controls */}
        <div className="flex items-center app-no-drag -mr-2">
          <button
            onClick={() => ipcClient.minimizeMain()}
            className="w-9 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            title="Minimize"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={() => ipcClient.maximizeMain()}
            className="w-9 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            title="Maximize"
          >
            <Square size={11} />
          </button>
          <button
            onClick={() => ipcClient.closeMain()}
            className="w-9 h-8 flex items-center justify-center text-slate-500 hover:bg-rose-500 hover:text-white transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Main Two-Column Workflow Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Running Applications & Website Monitor */}
        <section className="w-[370px] border-r border-slate-200 flex flex-col bg-white shrink-0 app-no-drag">
          <div className="p-3 border-b border-slate-200 space-y-2.5">
            {/* Header with counter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {sourceTab === 'apps' ? 'Running Applications' : 'Website Monitor'}
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                {sourceTab === 'apps' ? filteredWindows.length : 'Web'}
              </span>
            </div>

            {/* Source Tab Switcher (Applications vs Website) */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button
                onClick={() => setSourceTab('apps')}
                className={cn(
                  'flex-1 py-1 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5',
                  sourceTab === 'apps'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <AppWindow size={13} /> Applications
              </button>
              <button
                onClick={() => setSourceTab('web')}
                className={cn(
                  'flex-1 py-1 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5',
                  sourceTab === 'web'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <Globe size={13} /> Website URL
              </button>
            </div>

            {/* Applications Search Box */}
            {sourceTab === 'apps' ? (
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Windows apps or PID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-teal-500 transition-colors placeholder:text-slate-400"
                />
              </div>
            ) : (
              /* Website URL Input Bar */
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Globe size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. youtube.com, notion.so..."
                      value={webUrl}
                      onChange={(e) => setWebUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateWebMonitor()}
                      className="w-full h-8 pl-8 pr-2.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-teal-500 transition-colors placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    onClick={() => handleCreateWebMonitor()}
                    className="h-8 px-3 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1 shrink-0 shadow-xs"
                  >
                    <Plus size={11} /> Float Web
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {sourceTab === 'apps' ? (
              filteredWindows.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <AppWindow size={24} className="mx-auto mb-1.5 opacity-40 text-slate-400" />
                  <p className="text-xs font-medium text-slate-600">No matching windows found</p>
                  <p className="text-[10px] text-slate-400 mt-1">Make sure the application is open on your desktop.</p>
                </div>
              ) : (
                filteredWindows.map((win) => {
                  const existingMon = monitors.find(
                    (m) => (win.handle && m.targetHwnd === win.handle) || m.sourceWindowId === win.sourceId
                  );
                  const isFloating = !!existingMon;

                  return (
                    <div
                      key={win.id}
                      className={cn(
                        'p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2.5 shadow-2xs',
                        isFloating
                          ? 'border-l-4 border-l-teal-600 border-teal-200 bg-teal-50/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      {/* Left icon and title */}
                      <div className="flex items-center gap-2.5 min-w-0 pr-1">
                        {win.iconDataUrl ? (
                          <img
                            src={win.iconDataUrl}
                            alt=""
                            className="w-6 h-6 rounded shrink-0 object-contain"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 text-[11px] font-bold">
                            {win.appName.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 truncate leading-snug">
                            {win.title}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {win.appName} {win.processId ? `• PID ${win.processId}` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Right button */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isFloating ? (
                          <button
                            onClick={() => focusSource(existingMon.id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-teal-100 hover:bg-teal-200 text-teal-800 transition-colors flex items-center gap-1 shadow-2xs"
                            title="Bring the floating monitor to focus"
                          >
                            <ExternalLink size={11} /> Focus
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCreateMonitor(win)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-1 shadow-xs"
                            title="Open inside floating monitor"
                          >
                            <Plus size={11} /> Float
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              /* Quick Website Presets */
              <div className="space-y-3 pt-1">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
                  Popular Web Monitoring Presets
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {WEB_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleCreateWebMonitor(preset.url)}
                      className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-teal-500 hover:bg-teal-50/30 transition-all text-left flex items-center justify-between group shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{preset.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            {preset.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {preset.url.replace('https://', '')}
                          </div>
                        </div>
                      </div>
                      <Plus size={12} className="text-slate-400 group-hover:text-teal-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom status bar matching user's design */}
          <div className="p-2.5 px-3 border-t border-slate-200 flex items-center justify-between text-xs bg-white">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Win32 DWM Capture Ready
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
              60 FPS
            </span>
          </div>
        </section>

        {/* Right Column: Active Floating Monitors (matching user's screenshot exactly!) */}
        <section className="flex-1 bg-slate-50/60 p-6 flex flex-col space-y-4 overflow-y-auto app-no-drag">
          {/* Header Card matching user's image */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0">
                <Layers size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Active Floating Monitors ({monitors.length})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Always-on-top Picture-in-Picture overlays
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-teal-800 text-white px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 shadow-xs">
                <Pin size={11} className="fill-current" />
                <span>{pinnedCount} Pinned</span>
              </div>
              <div className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-medium">
                {backgroundCount} Background
              </div>
            </div>
          </div>

          {/* Active Monitors List */}
          {monitors.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white/60">
              <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mb-3">
                <Monitor size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                No Floating Monitors Open
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                Click <span className="font-semibold text-slate-700">+ Float</span> next to any running application on the left, or switch to the Website tab to monitor any URL.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {monitors.map((mon) => (
                <div
                  key={mon.id}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between gap-4 hover:border-slate-300 transition-all"
                >
                  {/* Left: LIVE pill indicator */}
                  <div className="bg-slate-900 text-white rounded-lg px-2.5 py-2 flex items-center justify-center font-bold text-[10px] tracking-wider gap-1.5 shrink-0 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </div>

                  {/* Center: Title and dimensions + opacity */}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {mon.title}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-mono font-medium">
                        {mon.width} × {mon.height}px
                      </span>

                      {/* Opacity Slider */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <span>Opacity</span>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          value={Math.round(mon.opacity * 100)}
                          onChange={(e) => setOpacity(mon.id, parseInt(e.target.value, 10) / 100)}
                          className="w-16 h-1 bg-slate-200 rounded-lg accent-teal-600 cursor-pointer"
                        />
                        <span className="font-mono font-bold text-slate-700 text-[10px] w-7 text-right">
                          {Math.round(mon.opacity * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Pinned, Min, Close */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Pin/Unpin Toggle */}
                    <button
                      onClick={() => setAlwaysOnTop(mon.id, !mon.alwaysOnTop)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 transition-colors',
                        mon.alwaysOnTop
                          ? 'bg-teal-800 hover:bg-teal-900 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      )}
                      title={mon.alwaysOnTop ? 'Disable pin (Keep in background)' : 'Pin above other windows'}
                    >
                      <Pin size={11} className={mon.alwaysOnTop ? 'fill-current' : ''} />
                      {mon.alwaysOnTop ? 'Pinned' : 'Background'}
                    </button>

                    {/* Minimize/Restore */}
                    <button
                      onClick={() => (mon.isMinimized ? restoreMonitor(mon.id) : minimizeMonitor(mon.id))}
                      className="border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors"
                      title={mon.isMinimized ? 'Restore window' : 'Minimize window'}
                    >
                      {mon.isMinimized ? 'Restore' : '— Min'}
                    </button>

                    {/* Close */}
                    <button
                      onClick={() => closeMonitor(mon.id)}
                      className="border border-rose-200 text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1"
                      title="Close monitor"
                    >
                      <X size={11} /> Close
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Settings Dialog */}
      <Dialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Float-Space Settings"
        description="Preferences and SQLite database management."
        className="max-w-xl"
      >
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveSettingsTab('appearance')}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-semibold transition-colors',
                activeSettingsTab === 'appearance'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              Preferences
            </button>
            <button
              onClick={() => setActiveSettingsTab('database')}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-semibold transition-colors',
                activeSettingsTab === 'database'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              SQLite Database
            </button>
          </div>

          {activeSettingsTab === 'appearance' ? (
            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Theme</label>
                <div className="flex items-center gap-2">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cn(
                        'px-3 py-1.5 rounded-md border text-xs font-medium capitalize transition-all',
                        settings.theme === t
                          ? 'border-teal-600 bg-teal-50 text-teal-800'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Default Monitor Dimensions</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 mb-1 block">Width (px)</span>
                    <input
                      type="number"
                      value={settings.defaultWidth || 480}
                      onChange={(e) => updateSettings({ defaultWidth: parseInt(e.target.value, 10) || 480 })}
                      className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 mb-1 block">Height (px)</span>
                    <input
                      type="number"
                      value={settings.defaultHeight || 320}
                      onChange={(e) => updateSettings({ defaultHeight: parseInt(e.target.value, 10) || 320 })}
                      className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <DatabaseSettings />
          )}
        </div>
      </Dialog>
    </div>
  );
};
