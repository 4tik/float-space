import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'secondary', className }) => {
  const variantStyles = {
    primary: 'bg-primary-500/15 text-primary-600 dark:text-primary-400 border-primary-500/20',
    secondary: 'bg-slate-200/60 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-300/30 dark:border-white/10',
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border leading-none',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
