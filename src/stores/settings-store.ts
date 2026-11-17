import { create } from 'zustand';
import { AppSettings, ThemeMode } from '../types/settings';
import { ipcClient } from '../services/ipc-client';

interface SettingsState {
  settings: AppSettings;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  setTheme: (theme: ThemeMode) => void;
}

const defaultSettings: AppSettings = {
  startOnStartup: false,
  startMinimized: false,
  minimizeToTray: true,
  restorePreviousSession: true,

  defaultWidth: 480,
  defaultHeight: 320,
  minWidth: 240,
  minHeight: 160,
  defaultOpacity: 1.0,
  defaultAlwaysOnTop: true,
  compactToolbar: false,
  hideToolbarOnInactive: false,

  theme: 'light',
  accentColor: '#0c8ce9',
  enableAnimations: true,

  captureFrameRate: 30,
  previewQuality: 'medium',
  pauseInactivePreviews: false,

  shortcutToggleAll: 'CommandOrControl+Shift+M',
  shortcutMissionControl: 'CommandOrControl+Shift+Space',
  shortcutCreateMonitor: 'CommandOrControl+Shift+N',
  shortcutNextWorkspace: 'CommandOrControl+Right',
  shortcutPrevWorkspace: 'CommandOrControl+Left',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,

  loadSettings: async () => {
    try {
      const saved = await ipcClient.getSettings();
      if (saved && Object.keys(saved).length > 0) {
        const merged: any = { ...defaultSettings };
        for (const [k, v] of Object.entries(saved)) {
          try {
            merged[k] = typeof v === 'string' ? JSON.parse(v) : v;
          } catch {
            merged[k] = v;
          }
        }
        // Default to clean light theme
        if (!merged.theme || merged.theme === 'dark') {
          merged.theme = 'light';
        }
        set({ settings: merged });
        applyTheme(merged.theme);
      } else {
        applyTheme(defaultSettings.theme);
      }
    } catch {
      applyTheme(defaultSettings.theme);
    }
  },

  updateSettings: async (partial) => {
    const updated = { ...get().settings, ...partial };
    set({ settings: updated });
    if (partial.theme) {
      applyTheme(partial.theme);
    }
    await ipcClient.saveSettings(partial);
  },

  setTheme: (theme) => {
    get().updateSettings({ theme });
  },
}));

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}
