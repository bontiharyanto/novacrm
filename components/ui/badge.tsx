import { cn } from '@/lib/utils';

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type { BadgeTone };

const tones: Record<BadgeTone, string> = {
  neutral: 'border-zinc-700 bg-zinc-800 text-zinc-300',
  info: 'border-sky-500/30 bg-sky-500/15 text-sky-300',
  success: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  warning: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  danger: 'border-rose-500/30 bg-rose-500/15 text-rose-300',
};

export function Badge({
  children,
  tone = 'neutral',
  className = '',
  title,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
  title?: string;
}) {
  return (
    <span title={title} className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}
