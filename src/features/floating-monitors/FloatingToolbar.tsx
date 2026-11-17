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
  MousePointer,
  Eye,
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

  return (
    <div className="h-8 w-full bg-white/95 text-slate-800 flex items-center justify-between px-2.5 border-b border-slate-200/90 select-none app-drag-region backdrop-blur-md shadow-sm">
      {/* Left: macOS Traffic Lights and title */}
      <div className="flex items-center gap-2 min-w-0">
        <MacTrafficLights
          size="sm"
          onClose={onClose}
          onMinimize={onMinimize}
          onMaximize={onMaximize}
        />
        <span className="text-[11px] font-semibold tracking-tight text-slate-800 truncate max-w-[130px]">
          {config.title}
        </span>

        {/* Mode Indicator Badge (Strict distinction between Native Interactive & Live Visual Preview) */}
        <div className="app-no-drag flex items-center ml-1">
          {onToggleDisplayMode ? (
            <button
              onClick={onToggleDisplayMode}
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase transition-colors border',
                isEmbedded
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100'
              )}
              title={
                isEmbedded
                  ? 'Mode: Native Interactive (Clicks, typing & scrolling active). Click to switch to Live Capture.'
                  : 'Mode: Live Visual Preview (Non-interactive). Click to switch to Native Embedding.'
              }
            >
              {isEmbedded ? (
                <>
                  <MousePointer size={9} className="text-emerald-600" />
                  <span>Interactive</span>
                </>
              ) : (
                <>
                  <Eye size={9} className="text-sky-600" />
                  <span>Preview</span>
                </>
              )}
            </button>
          ) : (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase border',
                isEmbedded
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-sky-50 text-sky-700 border-sky-300'
              )}
            >
              {isEmbedded ? (
                <>
                  <MousePointer size={9} className="text-emerald-600" />
                  <span>Interactive</span>
                </>
              ) : (
                <>
                  <Eye size={9} className="text-sky-600" />
                  <span>Preview</span>
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions (all marked app-no-drag so clicks don't drag the window) */}
      <div className="flex items-center gap-1 app-no-drag relative">
        {/* Play/Pause Live stream (only when in visual preview mode) */}
        {!isEmbedded && onTogglePause && (
          <button
            onClick={onTogglePause}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title={isPaused ? 'Resume Capture' : 'Pause Capture'}
          >
            {isPaused ? <Play size={11} className="text-emerald-600" /> : <Pause size={11} />}
          </button>
        )}

        {/* Reconnect (only when in visual preview mode) */}
        {!isEmbedded && onReconnect && (
          <button
            onClick={onReconnect}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Reconnect Stream"
          >
            <RotateCcw size={11} />
          </button>
        )}

        {/* Focus Original App */}
        <button
          onClick={onFocusSource}
          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Focus Original Application"
        >
          <ExternalLink size={11} />
        </button>

        {/* Opacity slider popup */}
        <div className="relative">
          <button
            onClick={() => setShowOpacityPopover(!showOpacityPopover)}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title={`Opacity: ${Math.round(config.opacity * 100)}%`}
          >
            <Sliders size={11} />
          </button>

          {showOpacityPopover && (
            <div className="absolute right-0 top-full mt-1.5 p-2 bg-white border border-slate-200 rounded-mac shadow-xl z-50 flex items-center gap-2 w-32">
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={config.opacity}
                onChange={(e) => onSetOpacity(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded accent-primary-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-600 font-medium shrink-0">
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
              ? 'text-primary-600 bg-primary-50 border border-primary-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
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
              ? 'text-amber-600 bg-amber-50 border border-amber-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          )}
          title={config.isLocked ? 'Unlock Position & Size' : 'Lock Position & Size'}
        >
          {config.isLocked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>
      </div>
    </div>
  );
};
