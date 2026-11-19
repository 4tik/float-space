import React, { useEffect } from 'react';
import { X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in app-no-drag">
      <div
        className={cn(
          'w-full max-w-lg bg-white rounded-xl border border-slate-200/90 shadow-[0_16px_36px_-6px_rgba(0,0,0,0.18),0_0_1px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col',
          className
        )}
      >
        {/* Modern Windows / Material 3 Modal Header */}
        <div className="h-12 bg-slate-50/90 border-b border-slate-200/70 px-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 truncate">
              {title}
            </h3>
            {description && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                {description}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );
};
