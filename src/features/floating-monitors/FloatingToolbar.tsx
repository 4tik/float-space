import React, { useState } from 'react';
import {
  Pin,
  Lock,
  Unlock,
  ExternalLink,
  Sliders,
  Pause,
  Play,
  RotateCcw,
  MousePointer,
  Eye,
  Globe,
} from 'lucide-react';
import { MacTrafficLights } from '../../components/common/MacTrafficLights';
import { FloatingWindowConfig } from '../../types/floating-monitor';
import { cn } from '../../utils/cn';

interface FloatingToolbarProps {
  config: FloatingWindowConfig;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onTogglePin: () => void;
  onToggleLock: () => void;
  onSetOpacity: (opacity: number) => void;
  onFocusSource: () => void;
  onToggleDisplayMode?: () => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
  onReconnect?: () => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  config,
  onClose,
  onMinimize,
  onMaximize,
  onTogglePin,
  onToggleLock,
  onSetOpacity,
  onFocusSource,
  onToggleDisplayMode,
  isPaused,
  onTogglePause,
  onReconnect,
}) => {
  const [showOpacityPopover, setShowOpacityPopover] = useState(false);

  const isEmbedded = config.displayMode === 'embedded';
  const isWeb = config.displayMode === 'web';

  return (
    <div className="h-8 w-full bg-[#F5F4F0]/90 backdrop-blur-xl text-[#1D1D1F] flex items-center justify-between px-2.5 border-b border-black/[0.08] select-none app-drag-region shrink-0">
      {/* Left: macOS Traffic Lights and title */}
      <div className="flex items-center gap-2 min-w-0">
        <MacTrafficLights
          size="sm"
          onClose={onClose}
          onMinimize={onMinimize}
          onMaximize={onMaximize}
        />
        <span className="text-[11.5px] font-semibold tracking-[-0.01em] text-[#1D1D1F] truncate max-w-[140px]">
          {config.title}
        </span>

        {/* Mode Indicator Badge */}
        <div className="app-no-drag flex items-center ml-1">
          {isWeb ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[4px] text-[9px] font-semibold tracking-wide uppercase border bg-indigo-500/10 text-indigo-800 border-indigo-600/20">
              <Globe size={9} className="text-indigo-600" />
              <span>Web</span>
            </span>
          ) : (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[4px] text-[9px] font-semibold tracking-wide uppercase border',
                isEmbedded
                  ? 'bg-emerald-500/10 text-emerald-800 border-emerald-600/20'
                  : 'bg-amber-500/10 text-amber-900 border-amber-600/20'
              )}
              title={
                isEmbedded
                  ? 'Native Application Window: Direct mouse, keyboard, and OS interaction active'
                  : 'Visual Monitor: Read-only display capture'
              }
            >
              {isEmbedded ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Interactive</span>
                </>
              ) : (
                <>
                  <Eye size={9} className="text-amber-600" />
                  <span>Visual Monitor</span>
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 app-no-drag relative">
        {/* Play/Pause Live stream */}
        {!isEmbedded && onTogglePause && (
          <button
            onClick={onTogglePause}
            className="p-1 rounded-[5px] text-stone-500 hover:text-stone-800 hover:bg-black/[0.05] transition-colors cursor-pointer"
            title={isPaused ? 'Resume Capture' : 'Pause Capture'}
          >
            {isPaused ? <Play size={11} className="text-emerald-600" /> : <Pause size={11} />}
          </button>
        )}

        {/* Reconnect */}
        {!isEmbedded && onReconnect && (
          <button
            onClick={onReconnect}
            className="p-1 rounded-[5px] text-stone-500 hover:text-stone-800 hover:bg-black/[0.05] transition-colors cursor-pointer"
            title="Reconnect Stream"
          >
            <RotateCcw size={11} />
          </button>
        )}

        {/* Focus Original App */}
        <button
          onClick={onFocusSource}
          className="p-1 rounded-[5px] text-stone-500 hover:text-stone-800 hover:bg-black/[0.05] transition-colors cursor-pointer"
          title="Focus Original Application"
        >
          <ExternalLink size={11} />
        </button>

        {/* Opacity slider popup */}
        <div className="relative">
          <button
            onClick={() => setShowOpacityPopover(!showOpacityPopover)}
            className="p-1 rounded-[5px] text-stone-500 hover:text-stone-800 hover:bg-black/[0.05] transition-colors cursor-pointer"
            title={`Opacity: ${Math.round((config.opacity ?? 1.0) * 100)}%`}
          >
            <Sliders size={11} />
          </button>

          {showOpacityPopover && (
            <div className="absolute right-0 top-full mt-1.5 p-2 bg-[#FAF9F6] border border-black/[0.1] rounded-[8px] shadow-[0_8px_20px_rgba(0,0,0,0.18)] z-50 flex items-center gap-2 w-36">
              <input
                type="range"
                min="0.25"
                max="1.0"
                step="0.05"
                value={config.opacity ?? 1.0}
                onChange={(e) => onSetOpacity(parseFloat(e.target.value))}
                className="macos-slider w-full"
              />
              <span className="font-mono text-[10px] text-stone-700 w-7 text-right">
                {Math.round((config.opacity ?? 1.0) * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Lock window position */}
        <button
          onClick={onToggleLock}
          className={cn(
            'p-1 rounded-[5px] transition-colors cursor-pointer',
            config.isLocked
              ? 'bg-[#262523] text-amber-400'
              : 'text-stone-500 hover:text-stone-800 hover:bg-black/[0.05]'
          )}
          title={config.isLocked ? 'Position Locked' : 'Lock Window Position'}
        >
          {config.isLocked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>

        {/* Pin (Always on top) */}
        <button
          onClick={onTogglePin}
          className={cn(
            'p-1 rounded-[5px] transition-colors cursor-pointer',
            config.alwaysOnTop
              ? 'bg-[#262523] text-amber-400'
              : 'text-stone-500 hover:text-stone-800 hover:bg-black/[0.05]'
          )}
          title={config.alwaysOnTop ? 'Pinned On Top' : 'Pin On Top'}
        >
          <Pin size={11} className={config.alwaysOnTop ? 'fill-current' : ''} />
        </button>
      </div>
    </div>
  );
};
