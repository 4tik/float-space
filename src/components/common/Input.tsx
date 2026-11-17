import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full app-no-drag">
        {icon && (
          <div className="absolute left-2.5 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-slate-100/80 dark:bg-black/30 border border-slate-300/60 dark:border-white/10 rounded-mac text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all',
            icon ? 'pl-8' : '',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
