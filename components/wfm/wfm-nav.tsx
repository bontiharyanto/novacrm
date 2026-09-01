'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/layout/preferences-provider';
import { wfmNavTabsForRole } from '@/lib/wfm/nav-config';

export function WfmNav({
  selfOnly = false,
  canManageWfm = false,
}: {
  selfOnly?: boolean;
  canManageWfm?: boolean;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const tabs = wfmNavTabsForRole(canManageWfm);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{t.wfm.kicker}</p>
        <h1 className="text-2xl font-semibold text-zinc-50">{t.wfm.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t.wfm.subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
        {tabs.map((tab) => {
          const active =
            tab.href === '/wfm' ? pathname === '/wfm' : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const label =
            selfOnly && tab.key === 'roster'
              ? t.wfm.myRoster
              : tab.key === 'swaps'
                ? t.wfm.swaps
                : t.wfm[tab.key];
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                active ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
