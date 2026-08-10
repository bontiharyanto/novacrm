import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
}

export function Button({ className = '', variant = 'default', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50';
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-500',
    outline: 'border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800',
  };

  return <button className={`${base} ${variants[variant]} ${className}`.trim()} {...props} />;
}
