import React, { useEffect, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { FloatingMonitorWindow } from './features/floating-monitors/FloatingMonitorWindow';
import { useMonitorStore } from './stores/monitor-store';
import { useApplicationStore } from './stores/application-store';
import { useDisplayStore } from './stores/display-store';
import { useSettingsStore } from './stores/settings-store';
import { ipcClient } from './services/ipc-client';

export const App: React.FC = () => {
  const [monitorModeId, setMonitorModeId] = useState<string | null>(null);

  const loadMonitors = useMonitorStore((s) => s.loadMonitors);
  const updateMonitor = useMonitorStore((s) => s.updateMonitor);
  const loadApps = useApplicationStore((s) => s.loadApplications);
  const loadDisplays = useDisplayStore((s) => s.loadDisplays);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    // Check URL parameters to see if this window instance is an independent floating monitor
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const windowId = params.get('windowId');

    if (mode === 'monitor' && windowId) {
      loadSettings();
      setMonitorModeId(windowId);
      return;
    }

    // Otherwise initialize main window controller
    loadSettings();
    loadMonitors();
    loadApps();
    loadDisplays();

    // Listen for real-time window updates across all processes
    const unsubState = ipcClient.onWindowStateChanged((config) => {
      updateMonitor(config);
    });

    const unsubDisplay = ipcClient.onDisplayChanged(() => {
      loadDisplays();
    });

    return () => {
      unsubState();
      unsubDisplay();
    };
  }, []);

  if (monitorModeId) {
    return <FloatingMonitorWindow windowId={monitorModeId} />;
  }

  return <AppShell />;
};
