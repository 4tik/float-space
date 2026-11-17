import { create } from 'zustand';
import { InstalledApplication, RunningWindowInfo } from '../types/application';
import { ipcClient } from '../services/ipc-client';

interface ApplicationState {
  installedApps: InstalledApplication[];
  runningWindows: RunningWindowInfo[];
  searchTerm: string;
  isLoading: boolean;
  filterMode: 'all' | 'running' | 'installed';
  loadApplications: () => Promise<void>;
  setSearchTerm: (term: string) => void;
  setFilterMode: (mode: 'all' | 'running' | 'installed') => void;
  launchApp: (executablePath: string) => Promise<{ success: boolean; error?: string }>;
  focusWindow: (windowId: string, processId?: number) => Promise<boolean>;
}

export const useApplicationStore = create<ApplicationState>((set, get) => ({
  installedApps: [],
  runningWindows: [],
  searchTerm: '',
  isLoading: false,
  filterMode: 'all',

  loadApplications: async () => {
    set({ isLoading: true });
    try {
      const [installed, running] = await Promise.all([
        ipcClient.getInstalledApplications(),
        ipcClient.getRunningWindows(),
      ]);

      // Cross-reference running processes
      const runningNames = new Set(running.map((r) => r.appName.toLowerCase()));
      const apps = installed.map((app) => ({
        ...app,
        isRunning: runningNames.has(app.name.toLowerCase()),
      }));

      set({ installedApps: apps, runningWindows: running });
    } catch (e) {
      console.error('Failed to load apps/windows', e);
    } finally {
      set({ isLoading: false });
    }
  },

  setSearchTerm: (term: string) => set({ searchTerm: term }),

  setFilterMode: (mode) => set({ filterMode: mode }),

  launchApp: async (executablePath: string) => {
    const res = await ipcClient.launchApplication(executablePath);
    // Refresh after a brief delay so newly launched process appears
    setTimeout(() => {
      get().loadApplications();
    }, 1500);
    return res;
  },

  focusWindow: async (windowId: string, processId?: number) => {
    return await ipcClient.focusWindow(windowId, processId);
  },
}));
