import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm';
}

export function Button({ className = '', variant = 'default', size = 'default', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50';
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-500 hover:-translate-y-0.5',
    outline: 'border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800 hover:-translate-y-0.5',
    ghost: 'bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50',
  };
  const sizes = {
    default: 'px-4 py-2',
    sm: 'px-2.5 py-1.5 text-xs',
  };

  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`.trim()} {...props} />;
}
