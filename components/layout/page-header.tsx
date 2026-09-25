import { cn } from '@/lib/utils';

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  className,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-2.5', className)}>
      <div className="min-w-0 space-y-0.5">
        {kicker ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">{kicker}</p>
        ) : null}
        <h1 className="text-lg font-semibold tracking-tight text-zinc-50 md:text-xl">{title}</h1>
        {description ? <p className="text-[13px] leading-5 text-zinc-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}
