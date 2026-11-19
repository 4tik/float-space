import React from 'react';
import { Pin } from 'lucide-react';
import { WindowsCaptionButtons } from '../../components/common/WindowsCaptionButtons';
import { FloatingWindowConfig } from '../../types/floating-monitor';
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
  return (
    <div className="h-8 w-full bg-[#FBFBFC]/95 backdrop-blur-md text-slate-800 flex items-center justify-between border-b border-slate-200/80 select-none app-drag-region shrink-0 transition-colors">
      {/* Left: Window Title & Pin Control */}
      <div className="flex items-center gap-2 pl-3 min-w-0 flex-1">
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
