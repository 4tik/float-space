import React, { useEffect, useState } from 'react';
import { FloatingToolbar } from './FloatingToolbar';
import { LiveCapturePreview } from './LiveCapturePreview';
import { FloatingWindowConfig } from '../../types/floating-monitor';
import { ipcClient } from '../../services/ipc-client';
import { MousePointer, ExternalLink, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FloatingMonitorWindowProps {
  windowId: string;
}

export const FloatingMonitorWindow: React.FC<FloatingMonitorWindowProps> = ({ windowId }) => {
  const [config, setConfig] = useState<FloatingWindowConfig | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [captureKey, setCaptureKey] = useState(0);

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
      <div className="h-screen w-screen flex items-center justify-center bg-slate-100 text-slate-500 text-xs">
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
    <div
      className={cn(
        'h-screen w-screen flex flex-col overflow-hidden rounded-mac-lg border border-slate-300/80 shadow-2xl select-none',
        isEmbedded ? 'bg-transparent' : 'bg-slate-100'
      )}
    >
      {/* Top Floating Toolbar (macOS frosted light bar) */}
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
          onReconnect={() => setCaptureKey((k) => k + 1)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {isEmbedded ? (
          // Native Interactive Embedding Container (Transparent so OS renders the child window)
          <div className="flex-1 w-full h-full relative bg-transparent flex flex-col items-center justify-center text-center p-4">
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-2 z-10 opacity-70 hover:opacity-100 transition-opacity">
              <div className="bg-white/95 backdrop-blur-md text-[10px] text-emerald-800 border border-emerald-300 rounded px-2.5 py-1 flex items-center justify-between pointer-events-auto shadow-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <MousePointer size={11} className="text-emerald-600" />
                  Native Interactive (Clicks, typing & scrolling active)
                </span>
                <button
                  onClick={handleToggleDisplayMode}
                  className="text-slate-500 hover:text-slate-800 underline text-[9px] ml-2"
                >
                  Switch to Live Capture
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Live High-Resolution Preview with Input Forwarding (Clicks, Scrolling, Typing)
          <div className="flex-1 w-full h-full relative flex flex-col">
            <LiveCapturePreview
              key={captureKey}
              sourceId={config.sourceWindowId}
              targetHwnd={config.targetHwnd}
              frameRate={config.captureFrameRate}
              quality={config.captureQuality}
              isPaused={isPaused}
            />

            {/* Interactive Control & App Focus Bar */}
            <div
              onClick={handleFocusSource}
              className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-slate-200 px-2.5 py-1 text-[10px] text-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors z-20 shadow-sm"
              title="Click to bring the original application forward for full OS focus"
            >
              <div className="flex items-center gap-1.5 truncate">
                <MousePointer size={11} className="text-emerald-600 shrink-0" />
                <span className="truncate">
                  Interactive Mirror <span className="text-emerald-600 font-medium">(Clicks, Scroll & Typing Active)</span>
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[9px] text-sky-600 font-semibold shrink-0 ml-2">
                Focus Original <ExternalLink size={9} />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
