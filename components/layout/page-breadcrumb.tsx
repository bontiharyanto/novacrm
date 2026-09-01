'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useI18n } from '@/components/layout/preferences-provider';
import { breadcrumbForPath } from '@/lib/nav/breadcrumb';
import { cn } from '@/lib/utils';

function PageBreadcrumbInner({ className }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const segments = useMemo(
    () => breadcrumbForPath(pathname, searchParams, t),
    [pathname, searchParams, t],
  );

  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex flex-wrap items-center gap-1 px-4 pb-2 pt-3 text-[11px] uppercase tracking-[0.14em] md:px-6',
        className,
      )}
    >
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return (
          <span key={`${segment.label}-${index}`} className="inline-flex items-center gap-1">
            {index > 0 ? <ChevronRight className="h-3 w-3 text-zinc-700" aria-hidden /> : null}
            {segment.href && !isLast ? (
              <Link
                href={segment.href}
                className="text-zinc-500 transition-colors hover:text-zinc-200"
              >
                {segment.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-zinc-300' : 'text-zinc-500'}>{segment.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function PageBreadcrumb({ className }: { className?: string }) {
  return (
    <Suspense fallback={null}>
      <PageBreadcrumbInner className={className} />
    </Suspense>
  );
}
