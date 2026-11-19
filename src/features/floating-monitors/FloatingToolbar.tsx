import React from 'react';
import { Pin } from 'lucide-react';
import { MacTrafficLights } from '../../components/common/MacTrafficLights';
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
    <div className="h-8 w-full bg-[#F5F4F0]/95 backdrop-blur-md text-[#1D1D1F] flex items-center justify-between px-2.5 border-b border-black/[0.08] select-none app-drag-region shrink-0">
      {/* Left: macOS Traffic Lights (Close, Minimize, Maximize) and title */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="app-no-drag">
          <MacTrafficLights
            size="sm"
            onClose={onClose}
            onMinimize={onMinimize}
            onMaximize={onMaximize}
          />
        </div>
        <span className="text-[11.5px] font-semibold tracking-[-0.01em] text-[#1D1D1F] truncate max-w-[200px]">
          {config.title}
        </span>
      </div>

      {/* Right: Essential Control - Always on Top / Pin */}
      <div className="flex items-center gap-1 app-no-drag">
        <button
          onClick={onTogglePin}
          className={cn(
            'p-1 rounded-[5px] transition-colors cursor-pointer',
            config.alwaysOnTop
              ? 'bg-[#262523] text-amber-400 shadow-xs'
              : 'text-stone-500 hover:text-stone-800 hover:bg-black/[0.05]'
          )}
          title={config.alwaysOnTop ? 'Pinned Always On Top' : 'Pin Always On Top'}
        >
          <Pin size={12} className={config.alwaysOnTop ? 'fill-current' : ''} />
        </button>
      </div>
    </div>
  );
};
