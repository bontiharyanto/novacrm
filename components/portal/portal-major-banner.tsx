'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useI18n } from '@/components/layout/preferences-provider';
import type { AffectingMajor } from '@/lib/tickets/major-impact';

export function PortalMajorBanner({
  majors,
  variant = 'home',
  selectable,
  selectedId,
  onSelect,
}: {
  majors: AffectingMajor[];
  variant?: 'home' | 'create';
  selectable?: boolean;
  selectedId?: string;
  onSelect?: (majorId: string | null) => void;
}) {
  const { t } = useI18n();

  if (majors.length === 0) return null;

  return (
    <div className="space-y-2">
      {majors.map((major) => (
        <div
          key={major.id}
          className="overflow-hidden rounded-xl border border-rose-500/35 bg-rose-500/[0.08]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {t.portal.majorBannerKicker}
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-200">
                {variant === 'create'
                  ? t.portal.majorCreateHint
                      .replace('{{number}}', major.number)
                      .replace('{{title}}', major.title)
                  : t.portal.majorBannerBody
                      .replace('{{title}}', major.title)
                      .replace('{{number}}', major.number)}
              </p>
              {major.cmdbItemName ? (
                <p className="mt-1 text-[11px] text-zinc-500">
                  {t.portal.majorAffectedCi}: {major.cmdbItemName}
                </p>
              ) : null}
              {major.matchReason === 'ip_subnet' ? (
                <p className="mt-1 text-[11px] text-amber-400/90">{t.portal.majorMatchIp}</p>
              ) : null}
              {selectable ? (
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-[12px] text-zinc-300">
                  <input
                    type="checkbox"
                    className="rounded border-zinc-600 bg-zinc-900"
                    checked={selectedId === major.id}
                    onChange={(event) => onSelect?.(event.target.checked ? major.id : null)}
                  />
                  {t.portal.majorLinkChild}
                </label>
              ) : null}
            </div>
            <Link
              href={`/portal/${major.id}`}
              className="shrink-0 text-[12px] text-zinc-300 transition-colors hover:text-zinc-50"
            >
              {variant === 'create' ? t.portal.majorCreateLink : t.portal.majorBannerView}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
