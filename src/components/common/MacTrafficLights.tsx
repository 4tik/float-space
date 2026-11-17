import React, { useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

interface MacTrafficLightsProps {
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const MacTrafficLights: React.FC<MacTrafficLightsProps> = ({
  onClose,
  onMinimize,
  onMaximize,
  className,
  size = 'md',
}) => {
  const [hovered, setHovered] = useState(false);

  const dimension = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  const iconSize = size === 'sm' ? 8 : 9;

  return (
    <div
      className={cn('flex items-center gap-1.5 app-no-drag', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        className={cn(
          dimension,
          'rounded-full bg-[#ff5f56] border border-[#e0443e] flex items-center justify-center transition-colors focus:outline-none'
        )}
        title="Close"
      >
        {hovered && <X size={iconSize} className="text-[#4a0002] stroke-[3]" />}
      </button>

      {/* Minimize button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onMinimize?.();
        }}
        className={cn(
          dimension,
          'rounded-full bg-[#ffbd2e] border border-[#dea123] flex items-center justify-center transition-colors focus:outline-none'
        )}
        title="Minimize"
      >
        {hovered && <Minus size={iconSize} className="text-[#593b00] stroke-[3]" />}
      </button>

      {/* Maximize / Zoom button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onMaximize?.();
        }}
        className={cn(
          dimension,
          'rounded-full bg-[#27c93f] border border-[#1aab29] flex items-center justify-center transition-colors focus:outline-none'
        )}
        title="Maximize"
      >
        {hovered && <Plus size={iconSize} className="text-[#004d11] stroke-[3]" />}
      </button>
    </div>
  );
};
