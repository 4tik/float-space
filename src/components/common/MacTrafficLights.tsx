import React from 'react';
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
  const isSm = size === 'sm';
  const dim = isSm ? 'w-2.5 h-2.5' : 'w-4 h-4';
  const glyphDim = isSm ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <div
      className={cn('traffic-lights flex items-center gap-2 py-1 app-no-drag', className)}
      role="group"
      aria-label="Window Controls"
    >
      {/* Close (Red #FF5F56) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        title="Close Window"
        aria-label="Close Window"
        className={cn(
          dim,
          'rounded-full bg-[#FF5F56] border border-[#E0443E] flex items-center justify-center shadow-[0_0.5px_1px_rgba(0,0,0,0.15)] active:brightness-90 transition-all cursor-pointer'
        )}
      >
        <svg
          className={cn(glyphDim, 'traffic-glyph text-[#4D0000] opacity-0 transition-opacity duration-100')}
          viewBox="0 0 8 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M1.75 1.75L6.25 6.25M6.25 1.75L1.75 6.25" />
        </svg>
      </button>

      {/* Minimize (Yellow #FFBD2E) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onMinimize?.();
        }}
        title="Minimize Window"
        aria-label="Minimize Window"
        className={cn(
          dim,
          'rounded-full bg-[#FFBD2E] border border-[#DEA123] flex items-center justify-center shadow-[0_0.5px_1px_rgba(0,0,0,0.15)] active:brightness-90 transition-all cursor-pointer'
        )}
      >
        <svg
          className={cn(glyphDim, 'traffic-glyph text-[#5C3B00] opacity-0 transition-opacity duration-100')}
          viewBox="0 0 8 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M1.5 4H6.5" />
        </svg>
      </button>

      {/* Zoom / Fullscreen (Green #27C93F) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onMaximize?.();
        }}
        title="Enter Full Screen / Maximize"
        aria-label="Enter Full Screen"
        className={cn(
          dim,
          'rounded-full bg-[#27C93F] border border-[#1AAB29] flex items-center justify-center shadow-[0_0.5px_1px_rgba(0,0,0,0.15)] active:brightness-90 transition-all cursor-pointer'
        )}
      >
        <svg
          className={cn(glyphDim, 'traffic-glyph text-[#004D0F] opacity-0 transition-opacity duration-100')}
          viewBox="0 0 8 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
        >
          <path d="M4 1.6V6.4M1.6 4H6.4" />
        </svg>
      </button>
    </div>
  );
};
