import { cn } from '@/lib/utils';

export function NovaMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="14"
        className="fill-zinc-950 stroke-zinc-800"
        strokeWidth="1.5"
      />
      <circle cx="24" cy="24" r="16.5" className="stroke-zinc-800" strokeWidth="1" />
      <path
        d="M15 33.5V14.5h4.1l9.4 12.8V14.5H33v19H28.9L19.5 20.7v12.8H15Z"
        className="fill-zinc-50"
      />
      <path
        d="M36.2 10.4 37.6 14l3.6 1.4-3.6 1.4-1.4 3.6-1.4-3.6-3.6-1.4 3.6-1.4 1.4-3.6Z"
        className="nova-accent-fill"
      />
      <circle cx="16.4" cy="14.8" r="1.2" className="nova-accent-fill" />
    </svg>
  );
}

export function BrandMark({
  size,
  logoUrl,
  logoAlt,
}: {
  size: number;
  logoUrl?: string | null;
  logoAlt?: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- MinIO presigned URL
      <img
        src={logoUrl}
        alt={logoAlt ?? ''}
        width={size}
        height={size}
        className="shrink-0 object-contain"
        style={{ height: size, width: 'auto', maxWidth: Math.max(size * 2.5, 96) }}
      />
    );
  }
  return <NovaMark size={size} />;
}

export function NovaWordmark({
  subtitle,
  size = 40,
  className,
  logoUrl,
  logoAlt,
}: {
  subtitle?: string;
  size?: number;
  className?: string;
  logoUrl?: string | null;
  logoAlt?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <BrandMark size={size} logoUrl={logoUrl} logoAlt={logoAlt} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold tracking-tight text-zinc-50">NovaCRM</p>
        {subtitle ? (
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
