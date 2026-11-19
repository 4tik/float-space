import React, { useEffect, useState } from 'react';
import { FloatingToolbar } from './FloatingToolbar';
import { LiveCapturePreview } from './LiveCapturePreview';
import { FloatingWebMonitor } from './FloatingWebMonitor';
import { VirtualMonitorRenderer } from '../virtual-monitor/VirtualMonitorRenderer';
import { FloatingWindowConfig } from '../../types/floating-monitor';
import { ipcClient } from '../../services/ipc-client';
import { AlertCircle, ExternalLink, RefreshCw, Eye } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FloatingMonitorWindowProps {
  windowId: string;
}

export const FloatingMonitorWindow: React.FC<FloatingMonitorWindowProps> = ({ windowId }) => {
  const [config, setConfig] = useState<FloatingWindowConfig | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [captureKey, setCaptureKey] = useState(0);

  useEffect(() => {
    ipcClient.getWindows().then((list) => {
      const match = list.find((m) => m.id === windowId);
      if (match) setConfig(match);
    });

    const cleanup = ipcClient.onWindowStateChanged((updated) => {
      if (updated.id === windowId) {
        setConfig((prev) => (prev ? { ...prev, ...updated } : updated));
      }
    });

    return cleanup;
  }, [windowId]);

  if (!config) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FAF9F6] text-stone-500 text-xs font-medium">
        Initializing Float-Space monitor...
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
    if (config.targetHwnd) {
      ipcClient.focusWindow(config.targetHwnd);
    } else if (config.sourceWindowId) {
      ipcClient.focusWindow(config.sourceWindowId);
    }
  };

  const handleToggleDisplayMode = () => {
    const nextMode = config.displayMode === 'embedded' ? 'live-monitor' : 'embedded';
    ipcClient.setDisplayMode(windowId, nextMode);
  };

  const isEmbedded = config.displayMode === 'embedded';

  return (
    <div
      className={cn(
        'h-screen w-screen flex flex-col overflow-hidden select-none',
        isEmbedded ? 'bg-transparent' : 'bg-[#FAF9F6] rounded-[13px] border border-black/[0.12] shadow-[0_24px_60px_-12px_rgba(28,25,23,0.32)]'
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
        {config.displayMode === 'web' ? (
          // Secure Web Monitor
          <FloatingWebMonitor url={config.url} title={config.title} />
        ) : config.displayMode === 'virtual-display' ? (
          // High-Performance Virtual Extended Display (Display 2)
          <VirtualMonitorRenderer
            key={captureKey}
            sourceId={config.sourceWindowId}
            isPaused={isPaused}
          />
        ) : isEmbedded ? (
          config.isInteractive ? (
            // Native Window Embedding Container
            // The Win32 child window sits at (0, 32) and directly handles mouse, keyboard & rendering.
            <div className="flex-1 w-full h-full relative bg-transparent pointer-events-none" />
          ) : (
            // Native embedding could not attach (e.g. elevated or permission block)
            <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#FAF9F6]">
              <div className="w-11 h-11 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-sm font-semibold text-[#1D1D1F] mb-1">
                Window Embedding Unavailable
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mb-4 leading-relaxed">
                {config.interactionMessage ||
                  'The application window could not be embedded directly into this container.'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleDisplayMode}
                  className="px-3 py-1.5 text-xs font-medium text-[#1D1D1F] bg-white hover:bg-stone-50 border border-black/[0.12] rounded-[6px] shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw size={11} />
                  <span>Retry Embedding</span>
                </button>
                <button
                  onClick={handleFocusSource}
                  className="px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-600/30 rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ExternalLink size={11} />
                  <span>Focus On Desktop</span>
                </button>
                <button
                  onClick={() => ipcClient.setDisplayMode(windowId, 'live-monitor')}
                  className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-[6px] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Eye size={11} />
                  <span>Visual Monitor</span>
                </button>
              </div>
            </div>
          )
        ) : (
          // Visual Monitor Mode (Read-Only Capture Stream)
          <div className="flex-1 w-full h-full relative flex flex-col">
            <LiveCapturePreview
              key={captureKey}
              sourceId={config.sourceWindowId}
              targetHwnd={config.targetHwnd}
              frameRate={config.captureFrameRate}
              quality={config.captureQuality}
              isPaused={isPaused}
            />

            {/* Read-Only Status Bar */}
            <div
              onClick={handleFocusSource}
              className="absolute bottom-0 inset-x-0 bg-[#F5F4F0]/90 backdrop-blur-md border-t border-black/[0.08] px-3 py-1.5 text-[10.5px] text-stone-600 flex items-center justify-between cursor-pointer hover:bg-stone-200/50 transition-colors z-20 shadow-xs"
              title="Click to bring the original application forward on the desktop"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                <span className="truncate">
                  Visual Monitor <span className="text-stone-500 font-medium">(Read-Only Preview)</span>
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] text-stone-600 font-medium shrink-0 ml-2 hover:text-[#1D1D1F]">
                Focus Original <ExternalLink size={10} />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
