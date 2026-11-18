import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Pin,
  X,
  SlidersHorizontal,
  Layers,
  Globe,
  Minus,
  Maximize2,
  ArrowRight,
  MonitorOff,
  AppWindow,
  ExternalLink,
} from 'lucide-react';
import { MacTrafficLights } from '../common/MacTrafficLights';
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2200);
  };

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
        showToast(`Focused "${win.appName}"`);
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
      showToast(`Floating "${win.appName}"`);
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
      showToast(`Opened web monitor for ${hostname}`);
    } catch (err) {
      console.error('Failed to create web monitor', err);
    }
  };

  const handleRefresh = async () => {
    await loadApplications();
    showToast('Refreshed running windows');
  };

  const pinnedCount = monitors.filter((m) => m.alwaysOnTop).length;

  return (
    <div className="macos-wallpaper text-[#1D1D1F] h-screen w-screen p-2.5 sm:p-3.5 flex flex-col select-none overflow-hidden">
      {/* Classic macOS Sonoma / Sequoia Window Frame */}
      <div className="flex-1 flex flex-col bg-[#FAF9F6] rounded-[13px] border border-black/[0.12] shadow-[0_24px_60px_-12px_rgba(28,25,23,0.22),0_0_1px_1px_rgba(255,255,255,0.65)_inset] overflow-hidden transition-all duration-300">
        
        {/* Translucent macOS Header / Titlebar */}
        <header className="sticky top-0 z-30 h-12 bg-[#F5F4F0]/85 backdrop-blur-xl border-b border-black/[0.08] px-3.5 sm:px-4 flex items-center justify-between shrink-0 relative app-drag-region">
          {/* Left: Traffic Lights */}
          <div className="flex items-center gap-3 z-10 app-no-drag">
            <MacTrafficLights
              onClose={() => ipcClient.closeMain()}
              onMinimize={() => ipcClient.minimizeMain()}
              onMaximize={() => ipcClient.maximizeMain()}
            />
          </div>

          {/* Center: Centered macOS Window Title */}
          <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none px-24">
            <div className="flex items-center gap-2 truncate">
              <span className="w-4 h-4 rounded-[4px] bg-gradient-to-b from-stone-700 to-stone-900 text-[#FAF9F6] flex items-center justify-center shadow-2xs shrink-0">
                <Layers size={10} />
              </span>
              <h1 className="text-[13px] font-semibold text-[#1D1D1F] tracking-[-0.01em] truncate">
                Float-Space
              </h1>
              <span className="hidden md:inline text-[11px] font-medium text-stone-400">
                — Window Monitor
              </span>
            </div>
          </div>

          {/* Right: macOS Action Buttons */}
          <div className="flex items-center gap-1.5 z-10 app-no-drag">
            <button
              onClick={handleRefresh}
              title="Refresh Running Applications"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-700 bg-white/85 hover:bg-white active:bg-stone-100 border border-black/[0.09] rounded-[6px] shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition-all cursor-pointer"
            >
              <RefreshCw size={13} className={cn('text-stone-600', isLoading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-stone-700 bg-white/85 hover:bg-white active:bg-stone-100 border border-black/[0.09] rounded-[6px] shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition-all cursor-pointer"
            >
              <SlidersHorizontal size={13} className="text-stone-600" />
              <span className="hidden md:inline">Settings</span>
            </button>
          </div>
        </header>

        {/* Main Split View: Left Sidebar + Right Workspace Canvas */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* ===================================================== */}
          {/* LEFT MACOS VIBRANCY SIDEBAR: RUNNING APPLICATIONS     */}
          {/* ===================================================== */}
          <aside className="w-[300px] xl:w-[325px] bg-[#F5F4F0]/90 backdrop-blur-2xl border-r border-black/[0.08] flex flex-col shrink-0 app-no-drag">
            
            {/* Sidebar Section Header & Search */}
            <div className="p-3 pb-2.5 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold text-stone-500 tracking-tight">
                  {sourceTab === 'apps' ? 'Running Applications' : 'Website Monitor'}
                </span>
                <span className="px-1.5 py-0.2 text-[11px] font-semibold bg-black/[0.06] text-stone-600 rounded-[5px]">
                  {sourceTab === 'apps' ? filteredWindows.length : 'Web'}
                </span>
              </div>

              {/* Segmented Control Switcher (Apps vs Web) */}
              <div className="flex items-center p-0.5 bg-black/[0.05] rounded-[7px] border border-black/[0.05]">
                <button
                  onClick={() => setSourceTab('apps')}
                  className={cn(
                    'flex-1 py-1 text-xs font-medium rounded-[5px] transition-all flex items-center justify-center gap-1.5',
                    sourceTab === 'apps'
                      ? 'bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                      : 'text-stone-500 hover:text-stone-800'
                  )}
                >
                  <AppWindow size={12} /> Applications
                </button>
                <button
                  onClick={() => setSourceTab('web')}
                  className={cn(
                    'flex-1 py-1 text-xs font-medium rounded-[5px] transition-all flex items-center justify-center gap-1.5',
                    sourceTab === 'web'
                      ? 'bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                      : 'text-stone-500 hover:text-stone-800'
                  )}
                >
                  <Globe size={12} /> Website URL
                </button>
              </div>

              {/* Inset Search Field / Web Input */}
              {sourceTab === 'apps' ? (
                <div className="relative flex items-center">
                  <Search size={13} className="text-stone-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search"
                    className="w-full pl-8 pr-7 py-1 text-xs bg-black/[0.05] focus:bg-white border border-black/[0.07] focus:border-amber-600/60 rounded-[7px] text-[#1D1D1F] placeholder-stone-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:shadow-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      title="Clear Search"
                      className="absolute right-2 w-4 h-4 rounded-full bg-stone-400/70 hover:bg-stone-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X size={10} className="stroke-[2.5]" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative flex items-center">
                    <Globe size={13} className="text-stone-400 absolute left-2.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. youtube.com or https://..."
                      value={webUrl}
                      onChange={(e) => setWebUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateWebMonitor()}
                      className="w-full pl-8 pr-7 py-1 text-xs bg-black/[0.05] focus:bg-white border border-black/[0.07] focus:border-amber-600/60 rounded-[7px] text-[#1D1D1F] placeholder-stone-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:shadow-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                  <button
                    onClick={() => handleCreateWebMonitor()}
                    disabled={!webUrl.trim()}
                    className="w-full py-1 text-xs font-medium text-white bg-[#1D1D1F] hover:bg-black disabled:opacity-40 rounded-[6px] transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Plus size={12} /> Float Web
                  </button>
                </div>
              )}
            </div>

            {/* Finder / Activity Monitor Styled App Rows */}
            <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-1">
              {sourceTab === 'apps' ? (
                filteredWindows.length === 0 ? (
                  <div className="py-8 px-3 text-center">
                    <p className="text-xs font-medium text-stone-500">
                      {isLoading ? 'Scanning windows...' : 'No matching windows'}
                    </p>
                  </div>
                ) : (
                  filteredWindows.map((win) => {
                    const isFloating = monitors.some(
                      (m) => (win.handle && m.targetHwnd === win.handle) || m.sourceWindowId === win.sourceId
                    );

                    return (
                      <div
                        key={win.id || win.sourceId}
                        className={cn(
                          'group flex items-center justify-between gap-2 px-2.5 py-2 rounded-[8px] transition-all',
                          isFloating
                            ? 'bg-black/[0.06] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]'
                            : 'hover:bg-black/[0.04]'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* macOS Squircle App Icon (rounded-[7px]) */}
                          {win.iconDataUrl ? (
                            <img
                              src={win.iconDataUrl}
                              alt=""
                              className="w-7 h-7 rounded-[7px] object-contain shadow-[0_1px_2px_rgba(0,0,0,0.12)] bg-white p-0.5 border border-black/5 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-[7px] bg-gradient-to-b from-stone-600 to-stone-800 text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] flex items-center justify-center shrink-0 font-semibold text-[11px]">
                              {win.appName.charAt(0).toUpperCase()}
                            </div>
                          )}

                          {/* Title & Metadata */}
                          <div className="min-w-0">
                            <p
                              className="text-[12.5px] font-medium text-[#1D1D1F] leading-tight truncate"
                              title={win.title}
                            >
                              {win.title}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5 text-[10.5px] text-stone-500">
                              <span className="truncate">{win.appName}</span>
                              {win.processId ? (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-[10px] text-stone-400">
                                    PID {win.processId}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Action Pill Button */}
                        <div className="shrink-0">
                          {isFloating ? (
                            <button
                              onClick={() => {
                                const m = monitors.find(
                                  (mon) => (win.handle && mon.targetHwnd === win.handle) || mon.sourceWindowId === win.sourceId
                                );
                                if (m) focusSource(m.id);
                              }}
                              title="Highlight Active Monitor"
                              className="px-2.5 py-1 text-[11px] font-semibold text-amber-900 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-600/20 rounded-full transition-colors cursor-pointer"
                            >
                              Focus
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCreateMonitor(win)}
                              title="Spawn Floating Monitor"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#1D1D1F] bg-white hover:bg-stone-50 active:bg-stone-100 border border-black/[0.1] rounded-full shadow-[0_1px_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer"
                            >
                              <Plus size={11} className="text-stone-600 stroke-[2.2]" />
                              <span>Float</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                /* Website Quick Presets */
                <div className="space-y-2.5 pt-1">
                  <span className="text-[11px] font-semibold text-stone-500 px-1">Popular Presets</span>
                  <div className="grid grid-cols-2 gap-2">
                    {WEB_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => handleCreateWebMonitor(p.url)}
                        className="flex items-center gap-2 p-2 rounded-[8px] bg-white hover:bg-stone-50 border border-black/[0.08] shadow-[0_1px_1px_rgba(0,0,0,0.03)] text-left transition-all cursor-pointer"
                      >
                        <span className="text-sm">{p.icon}</span>
                        <span className="text-xs font-medium text-stone-700 truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Subtle macOS Sidebar Status Footer */}
            <div className="px-3.5 py-2 border-t border-black/[0.06] bg-black/[0.02] flex items-center justify-between text-[11px] text-stone-500 shrink-0">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>WindowServer Ready</span>
              </span>
              <span className="font-mono text-[10px] text-stone-400">60 Hz</span>
            </div>
          </aside>

          {/* ===================================================== */}
          {/* RIGHT MAIN WORKSPACE (WARM SAND / OFF-WHITE CANVAS)   */}
          {/* ===================================================== */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAF9F6]">
            <div className="max-w-4xl mx-auto space-y-3.5">
              
              {/* Compact Summary Header Bar */}
              <div className="bg-white/90 border border-black/[0.07] rounded-[10px] px-4 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[7px] bg-[#F3EFEA] text-stone-700 border border-black/[0.06] flex items-center justify-center shrink-0">
                    <Layers size={14} />
                  </div>
                  <div>
                    <h2 className="text-[13px] font-semibold text-[#1D1D1F] tracking-[-0.01em]">
                      Active Monitors ({monitors.length})
                    </h2>
                    <p className="text-[11px] text-stone-500">Floating picture-in-picture window overlays</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-medium">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-900 border border-amber-600/20">
                    <Pin size={11} className="text-amber-600 fill-current" />
                    <span>{pinnedCount} Pinned</span>
                  </span>
                </div>
              </div>

              {/* Streamlined Active Monitor Cards List */}
              <section className="space-y-2.5">
                {monitors.length === 0 ? (
                  <div className="bg-white/90 border border-black/[0.07] rounded-[10px] p-10 text-center flex flex-col items-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <div className="w-10 h-10 rounded-[9px] bg-[#F3EFEA] text-stone-400 flex items-center justify-center mb-2.5">
                      <MonitorOff size={18} />
                    </div>
                    <p className="text-[13px] font-semibold text-[#1D1D1F]">No Active Floating Monitors</p>
                    <p className="text-xs text-stone-500 mt-1 max-w-xs">
                      Select <strong className="font-medium text-stone-700">+ Float</strong> next to any application in the sidebar to pin it here.
                    </p>
                  </div>
                ) : (
                  monitors.map((mon) => (
                    <div
                      key={mon.id}
                      className="bg-white border border-black/[0.08] rounded-[10px] p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-black/[0.14] transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                        
                        {/* Left: Compact Live Preview Thumbnail + Title + Resolution + Opacity Slider */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-14 h-10 rounded-[7px] bg-[#1D1D1F] border border-black/15 flex flex-col items-center justify-center shrink-0 relative overflow-hidden shadow-inner">
                            <div className="w-full h-1 bg-stone-700/80 absolute top-0 flex items-center gap-0.5 px-1">
                              <span className="w-0.5 h-0.5 rounded-full bg-[#FF5F56]"></span>
                              <span className="w-0.5 h-0.5 rounded-full bg-[#FFBD2E]"></span>
                              <span className="w-0.5 h-0.5 rounded-full bg-[#27C93F]"></span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[8.5px] font-mono font-semibold text-emerald-400 tracking-wider mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              LIVE
                            </span>
                          </div>

                          <div className="min-w-0 space-y-1.5 flex-1">
                            <h3
                              className="text-[13px] font-semibold text-[#1D1D1F] tracking-[-0.01em] truncate"
                              title={mon.title}
                            >
                              {mon.title}
                            </h3>

                            {/* Metadata Row: Resolution Pill + Native macOS Opacity Slider */}
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
                              <span className="font-mono text-[10.5px] font-medium text-stone-600 bg-[#F5F4F0] px-2 py-0.5 rounded-[5px] border border-black/[0.06]">
                                {mon.width} × {mon.height}
                              </span>

                              <div className="inline-flex items-center gap-2 bg-[#FAF9F6] border border-black/[0.06] px-2.5 py-0.5 rounded-[5px] text-stone-600">
                                <span className="text-[10.5px] font-medium text-stone-500">Opacity</span>
                                <input
                                  type="range"
                                  min="25"
                                  max="100"
                                  value={Math.round((mon.opacity ?? 1.0) * 100)}
                                  onChange={(e) => setOpacity(mon.id, Number(e.target.value) / 100)}
                                  className="macos-slider w-16 sm:w-20"
                                />
                                <span className="font-mono text-[10.5px] font-semibold text-[#1D1D1F] w-7 text-right">
                                  {Math.round((mon.opacity ?? 1.0) * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right: The 3 Essential Actions (Pin, Min, Close) */}
                        <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-black/[0.06]">
                          
                          {/* 1. Pin Toggle (Warm Amber / Graphite Active State) */}
                          <button
                            onClick={() => setAlwaysOnTop(mon.id, !mon.alwaysOnTop)}
                            title={mon.alwaysOnTop ? 'Pinned Above All Windows' : 'Pin Above Other Windows'}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[6px] border transition-all cursor-pointer',
                              mon.alwaysOnTop
                                ? 'bg-[#262523] text-[#FAF9F6] border-[#262523] shadow-[0_1px_2px_rgba(0,0,0,0.12)]'
                                : 'bg-white text-stone-700 hover:bg-stone-50 border-black/[0.1] shadow-[0_1px_1px_rgba(0,0,0,0.03)]'
                            )}
                          >
                            <Pin
                              size={11}
                              className={cn(
                                mon.alwaysOnTop ? 'text-amber-400 fill-current' : 'text-stone-500'
                              )}
                            />
                            <span>{mon.alwaysOnTop ? 'Pinned' : 'Pin'}</span>
                          </button>

                          {/* 2. Minimize / Restore */}
                          <button
                            onClick={() =>
                              mon.isMinimized ? restoreMonitor(mon.id) : minimizeMonitor(mon.id)
                            }
                            title={mon.isMinimized ? 'Restore Floating Window' : 'Minimize Floating Window'}
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[6px] border transition-all cursor-pointer',
                              mon.isMinimized
                                ? 'bg-amber-500/15 text-amber-900 border-amber-600/25'
                                : 'bg-white text-stone-700 hover:bg-stone-50 border-black/[0.1] shadow-[0_1px_1px_rgba(0,0,0,0.03)]'
                            )}
                          >
                            {mon.isMinimized ? <Maximize2 size={11} className="text-amber-900" /> : <Minus size={11} className="text-stone-600" />}
                            <span>{mon.isMinimized ? 'Restore' : 'Min'}</span>
                          </button>

                          {/* 3. Close Overlay */}
                          <button
                            onClick={() => closeMonitor(mon.id)}
                            title="Close Floating Window"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[6px] bg-white text-stone-600 hover:bg-[#FF5F56]/10 hover:text-[#C92A22] border border-black/[0.1] hover:border-[#FF5F56]/30 shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition-all cursor-pointer"
                          >
                            <X size={11} className="stroke-[2.2]" />
                            <span>Close</span>
                          </button>

                        </div>

                      </div>
                    </div>
                  ))
                )}
              </section>

            </div>
          </main>
        </div>

      </div>

      {/* ========================================================= */}
      {/* MACOS TRANSLUCENT HUD / NOTIFICATION TOAST                */}
      {/* ========================================================= */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none flex flex-col gap-2 animate-fade-in">
          <div className="bg-[#262523]/90 backdrop-blur-xl text-[#FAF9F6] text-xs font-medium px-3.5 py-2 rounded-[9px] border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.22)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SETTINGS DIALOG (FOLLOWING EXACT MACOS DESIGN PATTERN)    */}
      {/* ========================================================= */}
      <Dialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Float-Space Preferences"
        description="Configure desktop overlay behavior and persistent SQLite storage."
        className="max-w-xl"
      >
        <div className="space-y-4 pt-1">
          {/* macOS Segmented Tab Header */}
          <div className="flex items-center p-0.5 bg-black/[0.05] rounded-[7px] border border-black/[0.05]">
            <button
              onClick={() => setActiveSettingsTab('appearance')}
              className={cn(
                'flex-1 py-1 text-xs font-medium rounded-[5px] transition-all',
                activeSettingsTab === 'appearance'
                  ? 'bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                  : 'text-stone-500 hover:text-stone-800'
              )}
            >
              Monitor Preferences
            </button>
            <button
              onClick={() => setActiveSettingsTab('database')}
              className={cn(
                'flex-1 py-1 text-xs font-medium rounded-[5px] transition-all',
                activeSettingsTab === 'database'
                  ? 'bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                  : 'text-stone-500 hover:text-stone-800'
              )}
            >
              SQLite Database
            </button>
          </div>

          {activeSettingsTab === 'appearance' ? (
            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="font-semibold text-stone-700 block text-[11px] uppercase tracking-wider">
                  Default Floating Dimensions
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-stone-500 mb-1 block">Width (px)</span>
                    <input
                      type="number"
                      value={settings.defaultWidth || 480}
                      onChange={(e) => updateSettings({ defaultWidth: parseInt(e.target.value, 10) || 480 })}
                      className="w-full h-8 px-2.5 bg-white border border-black/[0.1] rounded-[6px] text-xs focus:outline-none focus:border-amber-600"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-stone-500 mb-1 block">Height (px)</span>
                    <input
                      type="number"
                      value={settings.defaultHeight || 320}
                      onChange={(e) => updateSettings({ defaultHeight: parseInt(e.target.value, 10) || 320 })}
                      className="w-full h-8 px-2.5 bg-white border border-black/[0.1] rounded-[6px] text-xs focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-black/[0.06]">
                <label className="font-semibold text-stone-700 block text-[11px] uppercase tracking-wider">
                  Default Behavior
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-stone-700">
                  <input
                    type="checkbox"
                    checked={settings.defaultAlwaysOnTop ?? true}
                    onChange={(e) => updateSettings({ defaultAlwaysOnTop: e.target.checked })}
                    className="rounded border-stone-300 text-stone-900 focus:ring-amber-500/20"
                  />
                  <span>Always on Top (Pin floating monitors automatically)</span>
                </label>
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
