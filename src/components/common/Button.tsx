import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger';
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
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0067C0]/40 disabled:opacity-50 disabled:cursor-not-allowed app-no-drag cursor-pointer active:scale-[0.98]';

  const variantClasses = {
    primary:
      'bg-[#0067C0] hover:bg-[#005FB8] text-white shadow-sm border border-[#005FB8]/50',
    secondary:
      'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-2xs',
    tonal:
      'bg-blue-50 hover:bg-blue-100 text-[#0067C0] border border-blue-200/60',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-700',
    danger:
      'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200',
  };

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-xs px-3.5 py-1.5 gap-2',
    lg: 'text-sm px-4.5 py-2 gap-2.5',
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
