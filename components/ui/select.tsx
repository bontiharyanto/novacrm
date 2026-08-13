import * as React from 'react';
import { cn } from '@/lib/utils';

export function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50',
        className,
      )}
    />
  );
}
