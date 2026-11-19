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
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-slate-100/90 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 py-2 px-3 focus:outline-none focus:bg-white focus:border-[#0067C0] focus:ring-2 focus:ring-[#0067C0]/20 transition-all',
            icon ? 'pl-9' : '',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
