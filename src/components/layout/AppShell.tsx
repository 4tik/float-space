import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  X,
  Layers,
  Monitor,
  ExternalLink,
  Eye,
  CheckCircle2,
  Tv,
} from 'lucide-react';
import { MacTrafficLights } from '../common/MacTrafficLights';
import { useApplicationStore } from '../../stores/application-store';
import { useMonitorStore } from '../../stores/monitor-store';
import { useSettingsStore } from '../../stores/settings-store';
import { ipcClient } from '../../services/ipc-client';
import { cn } from '../../utils/cn';
import { RunningWindowInfo } from '../../types/application';

export const AppShell: React.FC = () => {
  const { runningWindows, loadApplications, isLoading } = useApplicationStore();
  const {
    monitors,
    createMonitor,
    closeMonitor,
    focusSource,
  } = useMonitorStore();
  const { settings } = useSettingsStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2200);
  };

  const filteredWindows = runningWindows.filter(
    (win) =>
      win.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      win.appName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (win.processId && String(win.processId).includes(searchTerm))
  );

  const handleExtendMonitor = async (win: RunningWindowInfo) => {
    try {
      const existing = monitors.find(
        (m) => (win.handle && m.targetHwnd === win.handle) || m.sourceWindowId === win.sourceId
      );
      if (existing) {
        focusSource(existing.id);
        showToast(`Focused "${win.appName}" monitor`);
        return;
      }

      await createMonitor({
        title: win.title,
        sourceWindowId: win.sourceId,
        targetHwnd: win.handle,
        processId: win.processId,
        executablePath: win.executablePath,
        appName: win.appName,
        displayMode: 'embedded',
        alwaysOnTop: settings.defaultAlwaysOnTop ?? true,
        opacity: settings.defaultOpacity ?? 1.0,
        width: settings.defaultWidth || 640,
        height: settings.defaultHeight || 480,
      });
      showToast(`Extended "${win.appName}" into floating monitor`);
    } catch (err: any) {
      showToast(err?.message || `Error extending monitor: ${err}`);
      loadApplications();
    }
  };

  const handleRefresh = async () => {
    await loadApplications();
    showToast('Refreshed running applications');
  };

  return (
    <div className="macos-wallpaper text-[#1D1D1F] h-screen w-screen flex flex-col select-none overflow-hidden font-sans">
      {/* Clean macOS Sonoma / Sequoia Window Shell */}
      <div className="flex-1 flex flex-col bg-[#FAF9F6] rounded-[13px] border border-black/[0.12] shadow-[0_24px_60px_-12px_rgba(28,25,23,0.22),0_0_1px_1px_rgba(255,255,255,0.65)_inset] overflow-hidden m-1.5 transition-all">

        {/* Minimal macOS Titlebar Header */}
        <header className="h-11 bg-[#F5F4F0]/90 backdrop-blur-xl border-b border-black/[0.08] px-4 flex items-center justify-between shrink-0 relative app-drag-region">
          {/* Left: macOS Traffic Lights */}
          <div className="flex items-center gap-3 z-10 app-no-drag">
            <MacTrafficLights
              onClose={() => ipcClient.closeMain()}
              onMinimize={() => ipcClient.minimizeMain()}
              onMaximize={() => ipcClient.maximizeMain()}
            />
          </div>

          {/* Center: Title */}
          <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none px-24">
            <div className="flex items-center gap-2 truncate">
              <span className="w-4 h-4 rounded-[4px] bg-gradient-to-b from-stone-700 to-stone-900 text-[#FAF9F6] flex items-center justify-center shadow-2xs shrink-0">
                <Layers size={10} />
              </span>
              <h1 className="text-[13px] font-semibold text-[#1D1D1F] tracking-[-0.01em]">
                Float-Space
              </h1>
              <span className="text-[11px] font-medium text-stone-400">
                — Extended Monitor
              </span>
            </div>
          </div>

          {/* Right: Refresh Button */}
          <div className="flex items-center gap-1.5 z-10 app-no-drag">
            <button
              onClick={handleRefresh}
              title="Refresh Running Applications"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 active:bg-stone-100 border border-black/[0.1] rounded-[6px] shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition-all cursor-pointer"
            >
              <RefreshCw size={12} className={cn('text-stone-600', isLoading && 'animate-spin')} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Main Body */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-5 max-w-4xl w-full mx-auto space-y-3.5">

          {/* Active Extended Monitors Bar (if any monitors are active) */}
          {monitors.length > 0 && (
            <div className="bg-white/95 border border-black/[0.08] rounded-[10px] p-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[7px] bg-emerald-500/15 text-emerald-800 border border-emerald-600/25 flex items-center justify-center shrink-0">
                  <Tv size={14} />
                </div>
                <div>
                  <h2 className="text-[12.5px] font-semibold text-[#1D1D1F] tracking-tight">
                    Active Extended Monitors ({monitors.length})
                  </h2>
                  <p className="text-[10.5px] text-stone-500">
                    Running in interactive Picture-in-Picture mode
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {monitors.map((mon) => (
                  <div
                    key={mon.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#FAF9F6] border border-black/[0.08] text-xs font-medium text-stone-700"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="truncate max-w-[120px]" title={mon.title}>
                      {mon.title}
                    </span>
                    <button
                      onClick={() => focusSource(mon.id)}
                      title="Focus monitor"
                      className="text-stone-400 hover:text-black transition-colors"
                    >
                      <ExternalLink size={10} />
                    </button>
                    <button
                      onClick={() => closeMonitor(mon.id)}
                      title="Close monitor"
                      className="text-stone-400 hover:text-[#C92A22] transition-colors ml-0.5"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Bar & Application Count */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative flex-1 flex items-center">
              <Search size={14} className="text-stone-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search running applications..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-black/[0.09] focus:border-amber-600/60 rounded-[8px] text-[#1D1D1F] placeholder-stone-400 shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                  className="absolute right-2.5 w-4 h-4 rounded-full bg-stone-400/70 hover:bg-stone-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={10} className="stroke-[2.5]" />
                </button>
              )}
            </div>
            <div className="px-2.5 py-1.5 bg-black/[0.04] border border-black/[0.06] rounded-[7px] text-[11px] font-semibold text-stone-600 shrink-0">
              {filteredWindows.length} Apps Running
            </div>
          </div>

          {/* Applications List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredWindows.length === 0 ? (
              <div className="bg-white/80 border border-black/[0.07] rounded-[10px] p-10 text-center flex flex-col items-center justify-center">
                <p className="text-xs font-medium text-stone-500">
                  {isLoading ? 'Scanning running applications...' : 'No matching applications found'}
                </p>
              </div>
            ) : (
              filteredWindows.map((win) => {
                const existing = monitors.find(
                  (m) => (win.handle && m.targetHwnd === win.handle) || m.sourceWindowId === win.sourceId
                );
                const isExtended = !!existing;

                return (
                  <div
                    key={win.id || win.sourceId}
                    className={cn(
                      'group flex items-center justify-between gap-3 p-2.5 bg-white border rounded-[9px] transition-all',
                      isExtended
                        ? 'border-emerald-600/30 bg-emerald-500/[0.03] shadow-xs'
                        : 'border-black/[0.07] hover:border-black/[0.15] shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                    )}
                  >
                    {/* Left: App Icon & Details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {win.iconDataUrl ? (
                        <img
                          src={win.iconDataUrl}
                          alt=""
                          className="w-8 h-8 rounded-[7px] object-contain shadow-[0_1px_2px_rgba(0,0,0,0.1)] bg-white p-0.5 border border-black/5 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-[7px] bg-gradient-to-b from-stone-600 to-stone-800 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] flex items-center justify-center shrink-0 font-semibold text-xs">
                          {win.appName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[13px] font-semibold text-[#1D1D1F] leading-snug truncate"
                          title={win.title}
                        >
                          {win.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-stone-500">
                          <span className="font-medium text-stone-600 truncate">{win.appName}</span>
                          {win.processId ? (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[10.5px] text-stone-400">
                                PID {win.processId}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Right: Extend Monitor Action Button */}
                    <div className="shrink-0 flex items-center gap-2">
                      {isExtended ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-500/15 border border-emerald-600/25 px-2.5 py-1 rounded-[6px]">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            <span>Extended</span>
                          </span>
                          <button
                            onClick={() => focusSource(existing.id)}
                            className="px-2.5 py-1 text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 active:bg-stone-100 border border-black/[0.1] rounded-[6px] transition-colors cursor-pointer"
                          >
                            Focus
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleExtendMonitor(win)}
                          title="Open application inside floating extended monitor"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1D1D1F] hover:bg-black active:scale-[0.98] rounded-[7px] shadow-sm transition-all cursor-pointer"
                        >
                          <Monitor size={12} className="text-emerald-400 stroke-[2.5]" />
                          <span>Extend Monitor</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Minimal Status Footer */}
          <div className="pt-2 border-t border-black/[0.06] flex items-center justify-between text-[11px] text-stone-500 shrink-0">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Native Window Integration Ready</span>
            </span>
            <span className="font-mono text-[10px] text-stone-400">
              {monitors.length > 0 ? `${monitors.length} Active` : 'Idle'}
            </span>
          </div>

        </div>

      </div>

      {/* Translucent Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none flex flex-col gap-2 animate-fade-in">
          <div className="bg-[#262523]/90 backdrop-blur-xl text-[#FAF9F6] text-xs font-medium px-3.5 py-2 rounded-[9px] border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.22)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
