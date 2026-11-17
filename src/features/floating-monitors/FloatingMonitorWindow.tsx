import React, { useEffect, useState } from 'react';
import { FloatingToolbar } from './FloatingToolbar';
import { LiveCapturePreview } from './LiveCapturePreview';
import { FloatingWindowConfig } from '../../types/floating-monitor';
import { ipcClient } from '../../services/ipc-client';

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

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden rounded-mac-lg border border-white/15 shadow-2xl bg-slate-950">
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
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(!isPaused)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <LiveCapturePreview
          sourceId={config.sourceWindowId}
          frameRate={config.captureFrameRate}
          quality={config.captureQuality}
          isPaused={isPaused}
        />
      </div>
    </div>
  );
};
