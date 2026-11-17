import { create } from 'zustand';
import { Workspace, MonitorGroup } from '../types/floating-monitor';
import { ipcClient } from '../services/ipc-client';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  groups: MonitorGroup[];
  activeGroupId: string | null;
  isLoading: boolean;
  loadWorkspacesAndGroups: () => Promise<void>;
  setActiveWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string, description?: string) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  setActiveGroup: (id: string | null) => void;
  createGroup: (workspaceId: string, name: string) => Promise<MonitorGroup>;
  deleteGroup: (id: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: 'ws-dev',
  groups: [],
  activeGroupId: null,
  isLoading: false,

  loadWorkspacesAndGroups: async () => {
    set({ isLoading: true });
    try {
      const [wsList, grpList] = await Promise.all([
        ipcClient.getWorkspaces(),
        ipcClient.getGroups(),
      ]);
      set({
        workspaces: wsList,
        groups: grpList,
        activeWorkspaceId: wsList[0]?.id || 'ws-dev',
      });
    } catch (e) {
      console.error('Failed to load workspaces & groups', e);
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveWorkspace: async (id: string) => {
    set({ activeWorkspaceId: id, activeGroupId: null });
    await ipcClient.switchWorkspace(id);
  },

  createWorkspace: async (name: string, description?: string) => {
    const newWs: Workspace = {
      id: `ws-${Date.now()}`,
      name,
      description,
      sortOrder: get().workspaces.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ipcClient.saveWorkspace(newWs);
    set((state) => ({
      workspaces: [...state.workspaces, newWs],
      activeWorkspaceId: newWs.id,
    }));
    return newWs;
  },

  deleteWorkspace: async (id: string) => {
    await ipcClient.deleteWorkspace(id);
    set((state) => {
      const filtered = state.workspaces.filter((w) => w.id !== id);
      return {
        workspaces: filtered,
        activeWorkspaceId: state.activeWorkspaceId === id ? filtered[0]?.id || '' : state.activeWorkspaceId,
      };
    });
  },

  setActiveGroup: (id: string | null) => {
    set({ activeGroupId: id });
  },

  createGroup: async (workspaceId: string, name: string) => {
    const newGrp: MonitorGroup = {
      id: `grp-${Date.now()}`,
      workspaceId,
      name,
      sortOrder: get().groups.length,
      monitorIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ipcClient.saveGroup(newGrp);
    set((state) => ({
      groups: [...state.groups, newGrp],
      activeGroupId: newGrp.id,
    }));
    return newGrp;
  },

  deleteGroup: async (id: string) => {
    await ipcClient.deleteGroup(id);
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
      activeGroupId: state.activeGroupId === id ? null : state.activeGroupId,
    }));
  },
}));
