import { create } from 'zustand';
import { PhysicalDisplay } from '../types/display';
import { ipcClient } from '../services/ipc-client';

interface DisplayState {
  displays: PhysicalDisplay[];
  primaryDisplayId: number | null;
  selectedDisplayId: number | null;
  loadDisplays: () => Promise<void>;
  selectDisplay: (id: number) => void;
}

export const useDisplayStore = create<DisplayState>((set) => ({
  displays: [],
  primaryDisplayId: null,
  selectedDisplayId: null,

  loadDisplays: async () => {
    try {
      const list = await ipcClient.getAllDisplays();
      const primary = list.find((d) => d.isPrimary)?.id ?? (list[0]?.id || null);
      set({
        displays: list,
        primaryDisplayId: primary,
        selectedDisplayId: primary,
      });
    } catch (e) {
      console.error('Failed to load displays', e);
    }
  },

  selectDisplay: (id) => set({ selectedDisplayId: id }),
}));
