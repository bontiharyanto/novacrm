'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Scale } from 'lucide-react';
import { useI18n } from '@/components/layout/preferences-provider';
import { getPrivacyConsentState, markPrivacySeen, type PrivacyConsentState } from '@/lib/governance/consent';
import { formatDateLong } from '@/lib/utils/dates';
import { cn } from '@/lib/utils';

export function PortalConsentBanner({ variant }: { variant: 'home' | 'privacy' }) {
  const { t, locale } = useI18n();
  const [state, setState] = useState<PrivacyConsentState | null>(null);

  useEffect(() => {
    setState(getPrivacyConsentState(markPrivacySeen()));
  }, []);

  if (!state) return null;
  if (variant === 'home' && state.deemed) return null;

  const text = state.deemed
    ? t.portal.consentDeemed.replace('{{date}}', formatDateLong(state.deemedOn, locale))
    : t.portal.consentPending
        .replace('{{day}}', String(state.dayNumber))
        .replace('{{remaining}}', String(state.remaining));

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border',
        state.deemed ? 'border-emerald-500/35 bg-emerald-500/[0.08]' : 'border-sky-500/35 bg-sky-500/[0.08]',
      )}
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p
            className={cn(
              'inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em]',
              state.deemed ? 'text-emerald-400' : 'text-sky-400',
            )}
          >
            <Scale className="h-3.5 w-3.5" />
            {t.portal.consentKicker}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-zinc-300">{text}</p>
        </div>
        <Link
          href={variant === 'home' ? '/portal/privacy' : '/portal/privacy/new'}
          className="shrink-0 text-[12px] text-zinc-400 transition-colors hover:text-zinc-200"
        >
          {variant === 'home' ? t.portal.consentReadMore : t.portal.submitRights}
        </Link>
      </div>
    </div>
  );
}

export function useMarkPrivacySeen(enabled = true) {
  useEffect(() => {
    if (enabled) markPrivacySeen();
  }, [enabled]);
}
