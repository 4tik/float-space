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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in app-no-drag">
      <div
        className={cn(
          'w-full max-w-md mac-glass-surface rounded-mac-lg shadow-mac-window dark:shadow-mac-window-dark overflow-hidden p-5 border border-slate-300/40 dark:border-white/10',
          className
        )}
      >
        <div className="flex items-start justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-white/10">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-mac hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
