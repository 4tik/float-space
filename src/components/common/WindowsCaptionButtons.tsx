import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';

interface WindowsCaptionButtonsProps {
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const WindowsCaptionButtons: React.FC<WindowsCaptionButtonsProps> = ({
  onClose,
  onMinimize,
  onMaximize,
  isMaximized: initialMaximized = false,
  className,
  size = 'md',
}) => {
  const [maximized, setMaximized] = useState(initialMaximized);

  useEffect(() => {
    setMaximized(initialMaximized);
  }, [initialMaximized]);

  const handleMaximizeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMaximized((prev) => !prev);
    onMaximize?.();
  };

  const isSm = size === 'sm';
  const btnHeight = isSm ? 'h-7' : 'h-8';
  const btnWidth = isSm ? 'w-9' : 'w-11';
  const iconSize = isSm ? 9 : 10;

  return (
    <div
      className={cn('flex items-center select-none app-no-drag', className)}
      role="group"
      aria-label="Window Controls"
    >
      {/* Minimize Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onMinimize?.();
        }}
        title="Minimize"
        aria-label="Minimize"
        className={cn(
          btnWidth,
          btnHeight,
          'flex items-center justify-center text-slate-600 hover:bg-slate-200/80 active:bg-slate-300/80 transition-colors cursor-pointer'
        )}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 10 10" fill="none">
          <path d="M1 5h8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </button>

      {/* Maximize / Restore Button */}
      <button
        type="button"
        onClick={handleMaximizeToggle}
        title={maximized ? 'Restore Down' : 'Maximize'}
        aria-label={maximized ? 'Restore Down' : 'Maximize'}
        className={cn(
          btnWidth,
          btnHeight,
          'flex items-center justify-center text-slate-600 hover:bg-slate-200/80 active:bg-slate-300/80 transition-colors cursor-pointer'
        )}
      >
        {maximized ? (
          // Stacked squares (Restore)
          <svg width={iconSize} height={iconSize} viewBox="0 0 10 10" fill="none">
            <rect x="2.5" y="1" width="6.5" height="6.5" stroke="currentColor" strokeWidth="1" fill="none" />
            <path d="M1 3.5v5.5h5.5" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        ) : (
          // Single square (Maximize)
          <svg width={iconSize} height={iconSize} viewBox="0 0 10 10" fill="none">
            <rect x="1" y="1" width="8" height="8" stroke="currentColor" strokeWidth="1.1" fill="none" />
          </svg>
        )}
      </button>

      {/* Close Button (Windows Signature Red on hover) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        title="Close"
        aria-label="Close"
        className={cn(
          btnWidth,
          btnHeight,
          'flex items-center justify-center text-slate-600 hover:bg-[#E81123] hover:text-white active:bg-[#C40E1E] active:text-white transition-colors cursor-pointer'
        )}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 10 10" fill="none">
          <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};
