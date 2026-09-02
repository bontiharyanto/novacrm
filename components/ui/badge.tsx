import { cn } from '@/lib/utils';

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type { BadgeTone };

const tones: Record<BadgeTone, string> = {
  neutral: 'border-zinc-700/80 bg-zinc-800/50 text-zinc-400',
  info: 'border-sky-500/25 bg-sky-500/10 text-sky-400',
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
  danger: 'border-rose-500/20 bg-rose-500/8 text-rose-400/90',
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
