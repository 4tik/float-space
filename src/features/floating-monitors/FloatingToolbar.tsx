import React, { useState } from 'react';
import {
  Pin,
  Lock,
  Unlock,
  ExternalLink,
  Sliders,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
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
  isPaused,
  onTogglePause,
  onReconnect,
}) => {
  const [showOpacityPopover, setShowOpacityPopover] = useState(false);

  return (
    <div className="h-8 w-full bg-slate-900/90 dark:bg-black/90 text-white flex items-center justify-between px-2.5 border-b border-white/10 select-none app-drag-region">
      {/* Left: macOS Traffic Lights and title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <MacTrafficLights
          size="sm"
          onClose={onClose}
          onMinimize={onMinimize}
          onMaximize={onMaximize}
        />
        <span className="text-[11px] font-medium tracking-tight text-slate-200 truncate max-w-[150px]">
          {config.title}
        </span>
      </div>

      {/* Right: Actions (all marked app-no-drag so clicks don't drag the window) */}
      <div className="flex items-center gap-1 app-no-drag relative">
        {/* Play/Pause Live stream */}
        {onTogglePause && (
          <button
            onClick={onTogglePause}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title={isPaused ? 'Resume Capture' : 'Pause Capture'}
          >
            {isPaused ? <Play size={11} className="text-emerald-400" /> : <Pause size={11} />}
          </button>
        )}

        {/* Reconnect */}
        {onReconnect && (
          <button
            onClick={onReconnect}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Reconnect Stream"
          >
            <RotateCcw size={11} />
          </button>
        )}

        {/* Focus Original App */}
        <button
          onClick={onFocusSource}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Focus Original Application"
        >
          <ExternalLink size={11} />
        </button>

        {/* Opacity slider popup */}
        <div className="relative">
          <button
            onClick={() => setShowOpacityPopover(!showOpacityPopover)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title={`Opacity: ${Math.round(config.opacity * 100)}%`}
          >
            <Sliders size={11} />
          </button>

          {showOpacityPopover && (
            <div className="absolute right-0 top-full mt-1.5 p-2 bg-slate-900 border border-white/20 rounded-mac shadow-xl z-50 flex items-center gap-2 w-32">
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={config.opacity}
                onChange={(e) => onSetOpacity(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded accent-primary-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-300 shrink-0">
                {Math.round(config.opacity * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Pin / Always on top */}
        <button
          onClick={onTogglePin}
          className={cn(
            'p-1 rounded transition-colors',
            config.alwaysOnTop
              ? 'text-primary-400 bg-primary-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          )}
          title={config.alwaysOnTop ? 'Unpin Always-on-Top' : 'Pin Always-on-Top'}
        >
          <Pin size={11} className={config.alwaysOnTop ? 'fill-current' : ''} />
        </button>

        {/* Lock window */}
        <button
          onClick={onToggleLock}
          className={cn(
            'p-1 rounded transition-colors',
            config.isLocked
              ? 'text-amber-400 bg-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          )}
          title={config.isLocked ? 'Unlock Position & Size' : 'Lock Position & Size'}
        >
          {config.isLocked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>
      </div>
    </div>
  );
};
