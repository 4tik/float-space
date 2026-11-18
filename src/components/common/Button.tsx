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
    'inline-flex items-center justify-center font-medium rounded-[6px] transition-all duration-150 select-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed app-no-drag cursor-pointer';

  const variantClasses = {
    primary:
      'bg-[#1D1D1F] hover:bg-black active:brightness-95 text-[#FAF9F6] shadow-[0_1px_2px_rgba(0,0,0,0.12)] border border-[#1D1D1F]',
    secondary:
      'bg-white hover:bg-stone-50 active:bg-stone-100 text-[#1D1D1F] border border-black/[0.1] shadow-[0_1px_1px_rgba(0,0,0,0.03)]',
    ghost:
      'bg-transparent hover:bg-black/[0.05] text-stone-700',
    danger:
      'bg-white text-[#C92A22] hover:bg-[#FF5F56]/10 border border-[#FF5F56]/30 shadow-[0_1px_1px_rgba(0,0,0,0.03)]',
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
