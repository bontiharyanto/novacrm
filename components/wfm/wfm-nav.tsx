'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/layout/preferences-provider';

const tabs = [
  { href: '/wfm', key: 'occupancy' as const },
  { href: '/wfm/roster', key: 'roster' as const },
  { href: '/wfm/skills', key: 'skills' as const },
  { href: '/wfm/oncall', key: 'oncall' as const },
  { href: '/wfm/forecast', key: 'forecast' as const },
  { href: '/wfm/reviews', key: 'reviews' as const },
];

export function WfmNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{t.wfm.kicker}</p>
        <h1 className="text-2xl font-semibold text-zinc-50">{t.wfm.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t.wfm.subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
        {tabs.map((tab) => {
          const active = tab.href === '/wfm' ? pathname === '/wfm' : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                active ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              {t.wfm[tab.key]}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
