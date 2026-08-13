'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export function Dialog({
  open,
  title,
  onClose,
  children,
  className = '',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh]">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className={cn('relative w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900', className)}>
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-medium text-zinc-50">{title}</h2>
          <button type="button" onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-200">
            Esc
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
