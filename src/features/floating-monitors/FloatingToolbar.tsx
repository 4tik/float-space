import React from 'react';
import { Pin, ChevronLeft, ChevronRight, Play, XSquare } from 'lucide-react';
import { WindowsCaptionButtons } from '../../components/common/WindowsCaptionButtons';
import { FloatingWindowConfig } from '../../types/floating-monitor';
import { ipcClient } from '../../services/ipc-client';
import { cn } from '../../utils/cn';

interface FloatingToolbarProps {
  config: FloatingWindowConfig;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onTogglePin: () => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  config,
  onClose,
  onMinimize,
  onMaximize,
  onTogglePin,
}) => {
  const isPowerPoint =
    config.appName?.toLowerCase().includes('powerpoint') ||
    config.title?.toLowerCase().includes('powerpoint') ||
    config.executablePath?.toLowerCase().includes('powerpnt') ||
    config.isPresentationMode;

  const handlePresentationAction = async (action: 'next' | 'prev' | 'escape' | 'start') => {
    await ipcClient.sendPresentationControl(config.id, action);
  };

  return (
    <div className="h-8 w-full bg-[#FBFBFC]/95 backdrop-blur-md text-slate-800 flex items-center justify-between border-b border-slate-200/80 select-none app-drag-region shrink-0 transition-colors">
      {/* Left: Window Title & Pin Control */}
      <div className="flex items-center gap-1.5 pl-3 min-w-0 flex-1">
        <span
          className="text-xs font-semibold text-slate-800 truncate"
          title={config.title}
        >
          {config.title}
        </span>

        {/* Pin / Always on Top Pill Button */}
        <div className="app-no-drag shrink-0">
          <button
            onClick={onTogglePin}
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all cursor-pointer',
              config.alwaysOnTop
                ? 'bg-[#0067C0] text-white shadow-2xs'
                : 'bg-slate-200/60 text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
            )}
            title={config.alwaysOnTop ? 'Always on Top (Active)' : 'Pin Always on Top'}
          >
            <Pin size={10} className={config.alwaysOnTop ? 'fill-current' : ''} />
            <span className="hidden sm:inline">{config.alwaysOnTop ? 'Pinned' : 'Pin'}</span>
          </button>
        </div>

        {/* PowerPoint Slide Show Quick Controls */}
        {isPowerPoint && (
          <div className="app-no-drag flex items-center gap-1 ml-1 shrink-0">
            {config.isPresentationMode ? (
              <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200/90 rounded-md px-1.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-emerald-800 mr-1">Slide Show</span>
                <button
                  onClick={() => handlePresentationAction('prev')}
                  title="Previous Slide (Left Arrow / Page Up)"
                  className="w-4 h-4 rounded text-emerald-700 hover:bg-emerald-200/70 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft size={11} />
                </button>
                <button
                  onClick={() => handlePresentationAction('next')}
                  title="Next Slide (Right Arrow / Space / Page Down)"
                  className="w-4 h-4 rounded text-emerald-700 hover:bg-emerald-200/70 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight size={11} />
                </button>
                <button
                  onClick={() => handlePresentationAction('escape')}
                  title="End Slide Show (Escape)"
                  className="w-4 h-4 rounded text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors cursor-pointer ml-0.5"
                >
                  <XSquare size={10} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handlePresentationAction('start')}
                title="Start Slide Show inside floating monitor (F5)"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-[#0067C0] hover:bg-blue-100 border border-blue-200/70 transition-colors cursor-pointer"
              >
                <Play size={9} className="fill-current" />
                <span>Slide Show</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: Windows Native Caption Controls */}
      <div className="app-no-drag shrink-0">
        <WindowsCaptionButtons
          size="sm"
          onClose={onClose}
          onMinimize={onMinimize}
          onMaximize={onMaximize}
          isMaximized={config.isMaximized}
        />
      </div>
    </div>
  );
};
