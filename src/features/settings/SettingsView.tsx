import React, { useEffect, useState } from 'react';
import {
  Settings,
  Shield,
  Palette,
  Cpu,
  Command,
  Database,
  Sliders,
  Check,
} from 'lucide-react';
import { useSettingsStore } from '../../stores/settings-store';
import { ipcClient } from '../../services/ipc-client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { DatabaseSettings } from './DatabaseSettings';
import { cn } from '../../utils/cn';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, setTheme } = useSettingsStore();
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<'general' | 'appearance' | 'performance' | 'platform' | 'database'>('general');

  useEffect(() => {
    ipcClient.getSystemInfo().then(setSystemInfo);
  }, []);

  const triggerSaveNotice = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const colors = [
    { name: 'macOS Blue', hex: '#0c8ce9' },
    { name: 'Purple', hex: '#8b5cf6' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Rose', hex: '#f43f5e' },
  ];

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto animate-fade-in app-no-drag">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-white/10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings className="text-primary-500" size={20} />
            Preferences & Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure system behavior, floating window defaults, themes, and local database storage.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-mac">
            <Check size={13} /> Settings saved
          </div>
        )}
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/50 dark:bg-white/5 rounded-mac border border-slate-200/60 dark:border-white/5">
        {[
          { id: 'general', label: 'General', icon: <Sliders size={13} /> },
          { id: 'appearance', label: 'Appearance', icon: <Palette size={13} /> },
          { id: 'performance', label: 'Performance', icon: <Cpu size={13} /> },
          { id: 'platform', label: 'Platform & Shortcuts', icon: <Shield size={13} /> },
          { id: 'database', label: 'Database & Storage', icon: <Database size={13} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 px-2 rounded font-medium transition-all',
              activeSection === tab.id
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeSection === 'general' && (
        <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10 space-y-3">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            General Preferences
          </h3>

          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between p-2 rounded-mac hover:bg-slate-200/40 dark:hover:bg-white/5 cursor-pointer">
              <div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  Restore Previous Session
                </div>
                <div className="text-[10px] text-slate-400">
                  Automatically reload your floating windows and layouts from SQLite when the app starts.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.restorePreviousSession}
                onChange={(e) => {
                  updateSettings({ restorePreviousSession: e.target.checked });
                  triggerSaveNotice();
                }}
                className="accent-primary-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-mac hover:bg-slate-200/40 dark:hover:bg-white/5 cursor-pointer">
              <div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  Minimize to System Tray
                </div>
                <div className="text-[10px] text-slate-400">
                  Keep FloatDesk running in the system tray when dashboard window is closed.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.minimizeToTray}
                onChange={(e) => {
                  updateSettings({ minimizeToTray: e.target.checked });
                  triggerSaveNotice();
                }}
                className="accent-primary-500 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}

      {/* Appearance Settings */}
      {activeSection === 'appearance' && (
        <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10 space-y-4">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Palette size={14} /> Appearance & Design
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
            <div>
              <div className="font-medium text-slate-700 dark:text-slate-300 mb-2">Theme Mode</div>
              <div className="flex items-center gap-2">
                {(['dark', 'light', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTheme(t);
                      triggerSaveNotice();
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-mac border text-xs font-medium capitalize transition-all',
                      settings.theme === t
                        ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                        : 'border-slate-300/60 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="font-medium text-slate-700 dark:text-slate-300 mb-2">Accent Color</div>
              <div className="flex items-center gap-2">
                {colors.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => {
                      updateSettings({ accentColor: c.hex });
                      triggerSaveNotice();
                    }}
                    style={{ backgroundColor: c.hex }}
                    className={cn(
                      'w-6 h-6 rounded-full transition-transform focus:outline-none flex items-center justify-center',
                      settings.accentColor === c.hex ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : ''
                    )}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance & Capture Settings */}
      {activeSection === 'performance' && (
        <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10 space-y-4">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu size={14} /> Performance & Capture Stream
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Live Capture Frame Rate
              </label>
              <div className="flex items-center gap-2">
                {[15, 30, 60].map((fps) => (
                  <button
                    key={fps}
                    onClick={() => {
                      updateSettings({ captureFrameRate: fps });
                      triggerSaveNotice();
                    }}
                    className={cn(
                      'px-3 py-1 rounded-mac border text-xs font-medium transition-all',
                      settings.captureFrameRate === fps
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'border-slate-300/60 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5'
                    )}
                  >
                    {fps} FPS
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Preview Quality
              </label>
              <div className="flex items-center gap-2">
                {(['low', 'medium', 'high'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      updateSettings({ previewQuality: q });
                      triggerSaveNotice();
                    }}
                    className={cn(
                      'px-3 py-1 rounded-mac border text-xs font-medium capitalize transition-all',
                      settings.previewQuality === q
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'border-slate-300/60 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5'
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Platform & Shortcuts */}
      {activeSection === 'platform' && (
        <div className="space-y-4">
          <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10 space-y-3">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Shield size={14} /> Platform & Native Integration
            </h3>

            {systemInfo ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-white/20 dark:bg-white/5">
                  <span className="text-slate-500 dark:text-slate-400">Host OS</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                    {systemInfo.platform} ({systemInfo.arch})
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-white/20 dark:bg-white/5">
                  <span className="text-slate-500 dark:text-slate-400">Desktop Environment</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {systemInfo.capabilities?.desktopEnvironment || 'Standard Window Manager'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-white/20 dark:bg-white/5">
                  <span className="text-slate-500 dark:text-slate-400">Live Window Capture (desktopCapturer)</span>
                  <Badge variant="success">Supported & Active</Badge>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-white/20 dark:bg-white/5">
                  <span className="text-slate-500 dark:text-slate-400">External Window Reparenting</span>
                  <Badge variant={systemInfo.capabilities?.canEmbed ? 'primary' : 'secondary'}>
                    {systemInfo.capabilities?.canEmbed ? 'Supported (Win32/X11)' : 'Sandboxed Fallback (macOS/Wayland)'}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">Loading system information...</div>
            )}
          </div>

          <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10 space-y-3">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Command size={14} /> Global Keyboard Shortcuts
            </h3>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-white/20 dark:bg-white/5">
                <span className="text-slate-700 dark:text-slate-300">Show / Hide All Floating Monitors</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-200 dark:bg-black/50 font-mono text-[11px] border border-slate-300 dark:border-white/10">
                  Ctrl+Shift+M / ⌘⇧M
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-white/20 dark:bg-white/5">
                <span className="text-slate-700 dark:text-slate-300">Toggle Mission Control / Dashboard</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-200 dark:bg-black/50 font-mono text-[11px] border border-slate-300 dark:border-white/10">
                  Ctrl+Shift+Space / ⌘⇧Space
                </kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Database & Storage (Section 9) */}
      {activeSection === 'database' && <DatabaseSettings />}
    </div>
  );
};
