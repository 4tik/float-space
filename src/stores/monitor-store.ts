import { create } from 'zustand';
import { FloatingWindowConfig } from '../types/floating-monitor';
import { DisplayMode } from '../types/application';
import { SnapPosition } from '../types/display';
import { ipcClient } from '../services/ipc-client';

interface MonitorState {
  monitors: FloatingWindowConfig[];
  selectedMonitorId: string | null;
  isLoading: boolean;
  loadMonitors: () => Promise<void>;
  createMonitor: (config: Partial<FloatingWindowConfig> & { title: string }) => Promise<FloatingWindowConfig>;
  updateMonitor: (config: FloatingWindowConfig) => void;
  closeMonitor: (id: string) => Promise<void>;
  minimizeMonitor: (id: string) => Promise<void>;
  maximizeMonitor: (id: string) => Promise<void>;
  restoreMonitor: (id: string) => Promise<void>;
  setOpacity: (id: string, opacity: number) => Promise<void>;
  setAlwaysOnTop: (id: string, alwaysOnTop: boolean) => Promise<void>;
  setLocked: (id: string, isLocked: boolean) => Promise<void>;
  setDisplayMode: (id: string, mode: DisplayMode) => Promise<void>;
  snapMonitor: (id: string, snap: SnapPosition, displayId?: number) => Promise<void>;
  autoArrange: (workspaceId?: string, displayId?: number) => Promise<void>;
  selectMonitor: (id: string | null) => void;
  hideAllMonitors: () => Promise<void>;
  showAllMonitors: () => Promise<void>;
  focusSource: (id: string) => Promise<void>;
}

export const useMonitorStore = create<MonitorState>((set, get) => ({
  monitors: [],
  selectedMonitorId: null,
  isLoading: false,

  loadMonitors: async () => {
    set({ isLoading: true });
    try {
      const list = await ipcClient.getWindows();
      set({ monitors: list.filter(m => m.isActive) });
    } catch (e) {
      console.error('Failed to load monitors', e);
    } finally {
      set({ isLoading: false });
    }
  },

  createMonitor: async (config) => {
    const created = await ipcClient.createWindow(config);
    set((state) => ({
      monitors: [...state.monitors.filter((m) => m.id !== created.id), created],
      selectedMonitorId: created.id,
    }));
    return created;
  },

  updateMonitor: (config) => {
    set((state) => {
      if (!config.isActive) {
        return {
          monitors: state.monitors.filter((m) => m.id !== config.id),
          selectedMonitorId: state.selectedMonitorId === config.id ? null : state.selectedMonitorId,
        };
      }
      const exists = state.monitors.some((m) => m.id === config.id);
      if (exists) {
        return {
          monitors: state.monitors.map((m) => (m.id === config.id ? config : m)),
        };
      }
      return {
        monitors: [...state.monitors, config],
      };
    });
  },

  closeMonitor: async (id) => {
    await ipcClient.closeWindow(id);
    set((state) => ({
      monitors: state.monitors.filter((m) => m.id !== id),
      selectedMonitorId: state.selectedMonitorId === id ? null : state.selectedMonitorId,
    }));
  },

  minimizeMonitor: async (id) => {
    await ipcClient.minimizeWindow(id);
    set((state) => ({
      monitors: state.monitors.map((m) => (m.id === id ? { ...m, isMinimized: true } : m)),
    }));
  },

  maximizeMonitor: async (id) => {
    await ipcClient.maximizeWindow(id);
    set((state) => ({
      monitors: state.monitors.map((m) => (m.id === id ? { ...m, isMaximized: !m.isMaximized } : m)),
    }));
  },

  restoreMonitor: async (id) => {
    await ipcClient.restoreWindow(id);
    set((state) => ({
      monitors: state.monitors.map((m) => (m.id === id ? { ...m, isMinimized: false } : m)),
    }));
  },

  setOpacity: async (id, opacity) => {
    await ipcClient.setOpacity(id, opacity);
    set((state) => ({
      monitors: state.monitors.map((m) => (m.id === id ? { ...m, opacity } : m)),
    }));
  },

  setAlwaysOnTop: async (id, alwaysOnTop) => {
    await ipcClient.setAlwaysOnTop(id, alwaysOnTop);
    set((state) => ({
      monitors: state.monitors.map((m) => (m.id === id ? { ...m, alwaysOnTop } : m)),
    }));
  },

  setLocked: async (id, isLocked) => {
    await ipcClient.setLocked(id, isLocked);
    set((state) => ({
      monitors: state.monitors.map((m) => (m.id === id ? { ...m, isLocked } : m)),
    }));
  },

  setDisplayMode: async (id, mode) => {
    const updated = await ipcClient.setDisplayMode(id, mode);
    if (updated) {
      set((state) => ({
        monitors: state.monitors.map((m) => (m.id === id ? { ...m, ...updated } : m)),
      }));
    }
  },

  snapMonitor: async (id, snap, displayId) => {
    await ipcClient.snapWindow(id, snap, displayId);
  },

  autoArrange: async (workspaceId, displayId) => {
    await ipcClient.autoArrange(workspaceId, displayId);
    await get().loadMonitors();
  },

  selectMonitor: (id) => set({ selectedMonitorId: id }),

  hideAllMonitors: async () => {
    await ipcClient.hideAllWindows();
  },

  showAllMonitors: async () => {
    await ipcClient.showAllWindows();
    await get().loadMonitors();
  },

  focusSource: async (id) => {
    const mon = get().monitors.find((m) => m.id === id);
    if (mon?.sourceWindowId) {
      await ipcClient.focusWindow(mon.sourceWindowId);
    }
  },
}));
