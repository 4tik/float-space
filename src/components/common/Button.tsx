import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-mac transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed app-no-drag';

  const variantClasses = {
    primary:
      'bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white shadow-sm border border-primary-700/20',
    secondary:
      'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 dark:active:bg-white/20 text-slate-800 dark:text-slate-100 border border-slate-300/40 dark:border-white/10 shadow-sm',
    ghost:
      'bg-transparent hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300',
    danger:
      'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-sm border border-red-700/20',
  };

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-xs px-3 py-1.5 gap-2',
    lg: 'text-sm px-4 py-2 gap-2.5',
  };

  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
