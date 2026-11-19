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
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500 text-xs font-medium">
        Loading extended monitor...
      </div>
    );
  }

  const handleClose = () => ipcClient.closeWindow(windowId);
  const handleMinimize = () => ipcClient.minimizeWindow(windowId);
  const handleMaximize = () => ipcClient.maximizeWindow(windowId);
  const handleTogglePin = () => ipcClient.setAlwaysOnTop(windowId, !config.alwaysOnTop);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden select-none bg-white">
      {/* Top Floating Toolbar with Windows Caption Controls & Pin */}
      {!config.hideToolbar && (
        <FloatingToolbar
          config={config}
          onClose={handleClose}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          onTogglePin={handleTogglePin}
        />
      )}

      {/* Main Content Area: Crystal-clear live interactive application display with mouse & keyboard controls */}
      <div className="flex-1 relative overflow-hidden flex flex-col bg-slate-900">
        <LiveCapturePreview
          sourceId={config.sourceWindowId}
          targetHwnd={config.targetHwnd}
          frameRate={config.captureFrameRate || 30}
          quality={config.captureQuality || 'high'}
        />
      </div>
    </div>
  );
};
