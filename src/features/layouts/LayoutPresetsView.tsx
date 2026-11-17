import React, { useState } from 'react';
import {
  Sliders,
  Monitor,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Sparkles,
  Save,
  Check,
  BookmarkCheck,
} from 'lucide-react';
import { useMonitorStore } from '../../stores/monitor-store';
import { useDisplayStore } from '../../stores/display-store';
import { SnapPosition } from '../../types/display';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { cn } from '../../utils/cn';

export const LayoutPresetsView: React.FC = () => {
  const { monitors, snapMonitor, autoArrange } = useMonitorStore();
  const { displays, selectedDisplayId, selectDisplay } = useDisplayStore();

  const [targetMonitorId, setTargetMonitorId] = useState<string>(monitors[0]?.id || '');
  const [savedPresets, setSavedPresets] = useState<Array<{ name: string; desc: string }>>([
    { name: 'Developer Grid', desc: 'Code editor left half, terminal & monitor right quadrants' },
    { name: 'Side-by-Side Dual', desc: 'Two equal 50% split monitors' },
    { name: 'Quad Dashboard', desc: '4 equal quadrants in all 4 corners' },
    { name: 'Picture-in-Picture Corner', desc: 'Compact PiP monitor in bottom-right corner' },
  ]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const snapOptions: Array<{ id: SnapPosition; label: string; desc: string }> = [
    { id: 'left-half', label: 'Left Half', desc: 'Left 50% width' },
    { id: 'right-half', label: 'Right Half', desc: 'Right 50% width' },
    { id: 'top-half', label: 'Top Half', desc: 'Top 50% height' },
    { id: 'bottom-half', label: 'Bottom Half', desc: 'Bottom 50% height' },
    { id: 'top-left', label: 'Top Left', desc: 'Quarter quadrant' },
    { id: 'top-right', label: 'Top Right', desc: 'Quarter quadrant' },
    { id: 'bottom-left', label: 'Bottom Left', desc: 'Quarter quadrant' },
    { id: 'bottom-right', label: 'Bottom Right', desc: 'Quarter quadrant (PiP)' },
    { id: 'center', label: 'Center Window', desc: 'Centered on display' },
    { id: 'maximize', label: 'Full Display', desc: 'Span work area' },
  ];

  const handleApplySnap = async (snap: SnapPosition) => {
    if (!targetMonitorId) return;
    await snapMonitor(targetMonitorId, snap, selectedDisplayId || undefined);
    setSuccessMessage(`Snapped monitor to ${snap}`);
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-fade-in app-no-drag">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-white/10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sliders className="text-primary-500" size={20} />
            Window Snapping & Display Layouts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Snap floating monitors into grids, halves, corners, or auto-arrange across physical displays.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Sparkles size={13} />}
          onClick={() => autoArrange(undefined, selectedDisplayId || undefined)}
        >
          Auto Arrange All
        </Button>
      </div>

      {successMessage && (
        <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-mac flex items-center gap-2 animate-fade-in">
          <Check size={14} /> {successMessage}
        </div>
      )}

      {/* Physical Displays Detection */}
      <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10">
        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
          <Monitor size={14} /> Detected Physical Displays ({displays.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {displays.map((disp) => {
            const isSelected = selectedDisplayId === disp.id;
            return (
              <div
                key={disp.id}
                onClick={() => selectDisplay(disp.id)}
                className={cn(
                  'cursor-pointer p-3 rounded-mac border transition-all text-xs flex flex-col justify-between',
                  isSelected
                    ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500'
                    : 'border-slate-200/50 dark:border-white/10 bg-white/30 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20'
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {disp.label}
                    </span>
                    {disp.isPrimary && <Badge variant="primary">Primary</Badge>}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div>Bounds: {disp.bounds.width} × {disp.bounds.height}px</div>
                    <div>Scale Factor: {disp.scaleFactor}x</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Target Monitor Selector and Snapping Grid */}
      <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Quick Snap Selected Monitor
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Target Monitor:</span>
            <select
              value={targetMonitorId}
              onChange={(e) => setTargetMonitorId(e.target.value)}
              className="bg-slate-100/80 dark:bg-black/30 border border-slate-300/60 dark:border-white/10 rounded-mac p-1 text-xs text-slate-800 dark:text-slate-200"
            >
              {monitors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Snapping Presets Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {snapOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleApplySnap(opt.id)}
              disabled={!targetMonitorId}
              className="p-2.5 rounded-mac border border-slate-200/60 dark:border-white/10 bg-white/40 dark:bg-white/5 hover:border-primary-500/50 hover:bg-primary-500/10 transition-all text-left group disabled:opacity-50"
            >
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-primary-500 transition-colors">
                {opt.label}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Saved Layout Presets */}
      <div className="mac-glass-surface p-4 rounded-mac-lg border border-slate-200/50 dark:border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Saved Layout Presets
          </h3>
          <Button
            size="sm"
            variant="secondary"
            icon={<Save size={12} />}
            onClick={() => {
              const name = prompt('Preset name:');
              if (name) {
                setSavedPresets([...savedPresets, { name, desc: 'User custom arrangement preset' }]);
              }
            }}
          >
            Save Current Layout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {savedPresets.map((preset, idx) => (
            <div
              key={idx}
              className="p-3 rounded-mac border border-slate-200/50 dark:border-white/10 bg-white/30 dark:bg-white/5 flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <BookmarkCheck size={13} className="text-primary-500" />
                  {preset.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {preset.desc}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => autoArrange()}
              >
                Apply
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
