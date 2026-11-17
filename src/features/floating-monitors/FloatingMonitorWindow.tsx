import React, { useEffect, useState } from 'react';
import { FloatingToolbar } from './FloatingToolbar';
import { LiveCapturePreview } from './LiveCapturePreview';
import { FloatingWindowConfig } from '../../types/floating-monitor';
import { ipcClient } from '../../services/ipc-client';
import { MousePointer, ExternalLink, Info } from 'lucide-react';

interface FloatingMonitorWindowProps {
  windowId: string;
}

export const FloatingMonitorWindow: React.FC<FloatingMonitorWindowProps> = ({ windowId }) => {
  const [config, setConfig] = useState<FloatingWindowConfig | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Fetch initial config
    ipcClient.getWindows().then((list) => {
      const match = list.find((m) => m.id === windowId);
      if (match) setConfig(match);
    });

    // Listen to real-time changes from main process
    const cleanup = ipcClient.onWindowStateChanged((updated) => {
      if (updated.id === windowId) {
        setConfig((prev) => (prev ? { ...prev, ...updated } : updated));
      }
    });

    return cleanup;
  }, [windowId]);

  if (!config) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-slate-400 text-xs">
        Loading monitor...
      </div>
    );
  }

  const handleClose = () => ipcClient.closeWindow(windowId);
  const handleMinimize = () => ipcClient.minimizeWindow(windowId);
  const handleMaximize = () => ipcClient.maximizeWindow(windowId);
  const handleTogglePin = () => ipcClient.setAlwaysOnTop(windowId, !config.alwaysOnTop);
  const handleToggleLock = () => ipcClient.setLocked(windowId, !config.isLocked);
  const handleSetOpacity = (op: number) => ipcClient.setOpacity(windowId, op);
  const handleFocusSource = () => {
    if (config.sourceWindowId) ipcClient.focusWindow(config.sourceWindowId);
  };
  const handleToggleDisplayMode = () => {
    const nextMode = config.displayMode === 'embedded' ? 'live-monitor' : 'embedded';
    ipcClient.setDisplayMode(windowId, nextMode);
  };

  const isEmbedded = config.displayMode === 'embedded';

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden rounded-mac-lg border border-white/15 shadow-2xl bg-slate-950 select-none">
      {/* Top Floating Toolbar */}
      {!config.hideToolbar && (
        <FloatingToolbar
          config={config}
          onClose={handleClose}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          onTogglePin={handleTogglePin}
          onToggleLock={handleToggleLock}
          onSetOpacity={handleSetOpacity}
          onFocusSource={handleFocusSource}
          onToggleDisplayMode={handleToggleDisplayMode}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(!isPaused)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {isEmbedded ? (
          // Native Interactive Embedding Container
          <div className="flex-1 w-full h-full relative bg-transparent flex flex-col items-center justify-center text-center p-4">
            {/* The native child HWND is rendered by Windows OS directly in this window area */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-2 z-10 opacity-70 hover:opacity-100 transition-opacity">
              <div className="bg-slate-900/80 backdrop-blur-md text-[10px] text-emerald-300 border border-emerald-500/30 rounded px-2 py-1 flex items-center justify-between pointer-events-auto">
                <span className="flex items-center gap-1.5 font-medium">
                  <MousePointer size={11} className="text-emerald-400" />
                  Native Interactive Mode (Clicks, typing & scrolling active)
                </span>
                <button
                  onClick={handleToggleDisplayMode}
                  className="text-slate-400 hover:text-white underline text-[9px] ml-2"
                >
                  Switch to Live Capture
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Live Visual Capture Preview (Non-interactive)
          <div className="flex-1 w-full h-full relative flex flex-col">
            <LiveCapturePreview
              sourceId={config.sourceWindowId}
              frameRate={config.captureFrameRate}
              quality={config.captureQuality}
              isPaused={isPaused}
            />

            {/* Non-interactive clarification banner per guidelines */}
            <div
              onClick={handleFocusSource}
              className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-md border-t border-white/10 px-2.5 py-1 text-[10px] text-slate-300 flex items-center justify-between cursor-pointer hover:bg-slate-900/90 transition-colors z-20"
              title="Click to bring the original application forward for interaction"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Info size={11} className="text-sky-400 shrink-0" />
                <span className="truncate">
                  Live Visual Preview <span className="text-slate-400">(Non-interactive)</span> • Click to focus app
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[9px] text-sky-400 font-medium shrink-0 ml-2">
                Focus <ExternalLink size={9} />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
