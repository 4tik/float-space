import React, { useEffect, useState } from 'react';
import { FloatingToolbar } from './FloatingToolbar';
import { FloatingWindowConfig } from '../../types/floating-monitor';
import { ipcClient } from '../../services/ipc-client';
import { AlertCircle, ExternalLink } from 'lucide-react';

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
  const handleFocusSource = () => {
    if (config.targetHwnd) {
      ipcClient.focusWindow(config.targetHwnd);
    } else if (config.sourceWindowId) {
      ipcClient.focusWindow(config.sourceWindowId);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden select-none bg-transparent">
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

      {/* Main Content Area: Native Win32 child window sits here */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {config.isInteractive ? (
          // The embedded native application window is attached at (0, 32)
          <div className="flex-1 w-full h-full relative bg-transparent pointer-events-none" />
        ) : (
          <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-[#0067C0] flex items-center justify-center mb-3">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Window Integration Notice
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
              {config.interactionMessage ||
                'The selected application window could not be embedded into this monitor.'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleFocusSource}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ExternalLink size={12} />
                <span>Focus On Desktop</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
