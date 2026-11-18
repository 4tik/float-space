import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { MacTrafficLights } from './MacTrafficLights';
import { cn } from '../../utils/cn';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/25 backdrop-blur-xs animate-fade-in app-no-drag">
      <div
        className={cn(
          'w-full max-w-lg bg-[#FAF9F6] rounded-[13px] border border-black/[0.12] shadow-[0_24px_60px_-12px_rgba(28,25,23,0.32),0_0_1px_1px_rgba(255,255,255,0.7)_inset] overflow-hidden flex flex-col',
          className
        )}
      >
        {/* macOS Sonoma Modal Header */}
        <div className="h-11 bg-[#F5F4F0]/90 backdrop-blur-xl border-b border-black/[0.08] px-3.5 flex items-center justify-between shrink-0 relative">
          <div className="flex items-center gap-2 z-10">
            <MacTrafficLights size="sm" onClose={onClose} />
          </div>

          <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none px-12">
            <h3 className="text-[13px] font-semibold text-[#1D1D1F] tracking-[-0.01em] truncate">
              {title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-5 h-5 rounded-full bg-stone-200/70 hover:bg-stone-300 text-stone-600 flex items-center justify-center transition-colors cursor-pointer z-10"
            title="Close"
          >
            <X size={11} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 text-[#1D1D1F] overflow-y-auto max-h-[80vh]">
          {description && (
            <p className="text-xs text-stone-500 mb-3.5 -mt-1">{description}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};
