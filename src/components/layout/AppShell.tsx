import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  X,
  Layers,
  Monitor,
  ExternalLink,
  CheckCircle2,
  Tv,
} from 'lucide-react';
import { WindowsCaptionButtons } from '../common/WindowsCaptionButtons';
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
    }, 2400);
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
    <div className="bg-[#F8F9FA] text-slate-800 h-screen w-screen flex flex-col select-none overflow-hidden font-sans border border-slate-300/80">
      {/* Windows 11 Native Titlebar Header */}
      <header className="h-9 bg-[#F0F3F6] border-b border-slate-200/90 flex items-center justify-between shrink-0 app-drag-region select-none relative">
        {/* Left: Brand Icon & Title */}
        <div className="flex items-center gap-2 pl-3 app-drag-region">
          <span className="w-4 h-4 rounded bg-[#0067C0] text-white flex items-center justify-center shadow-xs shrink-0">
            <Layers size={10} className="stroke-[2.5]" />
          </span>
          <h1 className="text-[12px] font-semibold text-slate-800 tracking-tight">
            Float-Space
          </h1>
          <span className="text-[11px] font-medium text-slate-400">
            — Extended Monitor
          </span>
        </div>

        {/* Right: Actions & Windows Caption Buttons */}
        <div className="flex items-center gap-1.5 h-full app-no-drag">
          <button
            onClick={handleRefresh}
            title="Refresh Running Applications"
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md shadow-2xs transition-colors cursor-pointer mr-1"
          >
            <RefreshCw size={11} className={cn('text-slate-600', isLoading && 'animate-spin')} />
            <span>Refresh</span>
          </button>

          {/* Standard Windows 11 Minimize, Maximize, Close */}
          <WindowsCaptionButtons
            size="sm"
            onClose={() => ipcClient.closeMain()}
            onMinimize={() => ipcClient.minimizeMain()}
            onMaximize={() => ipcClient.maximizeMain()}
          />
        </div>
      </header>

      {/* Main Body - Fills width with no extra wrapper div and no unwanted margins */}
      <div className="flex-1 flex flex-col overflow-hidden px-4 py-3 w-full space-y-2.5">

        {/* Active Extended Monitors Bar (if any monitors are active) */}
        {monitors.length > 0 && (
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/15 text-emerald-800 border border-emerald-600/25 flex items-center justify-center shrink-0">
                <Tv size={13} />
              </div>
              <div>
                <h2 className="text-[12px] font-semibold text-slate-800 tracking-tight">
                  Active Extended Monitors ({monitors.length})
                </h2>
                <p className="text-[10px] text-slate-500">
                  Running in interactive Picture-in-Picture mode
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {monitors.map((mon) => (
                <div
                  key={mon.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="truncate max-w-[140px]" title={mon.title}>
                    {mon.title}
                  </span>
                  <button
                    onClick={() => focusSource(mon.id)}
                    title="Focus monitor"
                    className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <ExternalLink size={11} />
                  </button>
                  <button
                    onClick={() => closeMonitor(mon.id)}
                    title="Close monitor"
                    className="text-slate-400 hover:text-red-600 transition-colors ml-0.5 cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Bar & Running Applications Count */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative flex-1 flex items-center">
            <Search size={13} className="text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search running applications by title, name, or PID..."
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-200 focus:border-[#0067C0] rounded-md text-slate-800 placeholder-slate-400 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#0067C0]/30 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                title="Clear search"
                className="absolute right-2.5 w-4 h-4 rounded-full bg-slate-300 hover:bg-slate-400 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={10} className="stroke-[2.5]" />
              </button>
            )}
          </div>
          <div className="px-2.5 py-1 bg-slate-200/70 border border-slate-300/60 rounded-md text-[11px] font-semibold text-slate-600 shrink-0">
            {filteredWindows.length} Apps Detected
          </div>
        </div>

        {/* Running Applications List - Edge-to-edge container filling available width */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
          {filteredWindows.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center flex flex-col items-center justify-center shadow-2xs">
              <p className="text-xs font-medium text-slate-500">
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
                    'group flex items-center justify-between gap-3 px-3 py-2 bg-white border rounded-lg transition-all',
                    isExtended
                      ? 'border-emerald-500/50 bg-emerald-50/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                  )}
                >
                  {/* Left: App Icon & Details */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {win.iconDataUrl ? (
                      <img
                        src={win.iconDataUrl}
                        alt=""
                        className="w-8 h-8 rounded-md object-contain bg-white p-0.5 border border-slate-200 shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-gradient-to-b from-slate-600 to-slate-800 text-white shadow-2xs flex items-center justify-center shrink-0 font-semibold text-xs">
                        {win.appName ? win.appName.charAt(0).toUpperCase() : 'A'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[12.5px] font-semibold text-slate-800 leading-snug truncate"
                        title={win.title}
                      >
                        {win.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="font-medium text-slate-600 truncate">{win.appName}</span>
                        {win.processId ? (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-500">
                              PID {win.processId}
                            </span>
                          </>
                        ) : null}
                        {win.handle ? (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[10px] text-slate-400">
                              HWND {win.handle}
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
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-500/15 border border-emerald-600/25 px-2.5 py-1 rounded-md">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          <span>Extended</span>
                        </span>
                        <button
                          onClick={() => focusSource(existing.id)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-md shadow-2xs transition-colors cursor-pointer"
                        >
                          Focus
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleExtendMonitor(win)}
                        title="Open application inside floating extended monitor"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0067C0] hover:bg-[#005FB8] active:bg-[#0052A3] rounded-md shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                      >
                        <Monitor size={12} className="stroke-[2.5]" />
                        <span>Extend Monitor</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Material Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 pointer-events-none flex flex-col gap-2 animate-fade-in">
          <div className="bg-slate-900 text-white text-xs font-medium px-3.5 py-2 rounded-lg border border-slate-700 shadow-md flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0067C0]" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
