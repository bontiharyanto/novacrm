'use client';

import Link from 'next/link';
import { useI18n } from '@/components/layout/preferences-provider';
import { fillPdp, type PdpContact } from '@/lib/governance/pdp';
import { cn } from '@/lib/utils';

export type PdpConsentVariant = 'process' | 'capture' | 'erasure' | 'withdraw';

const CLAUSE_KEY = {
  process: 'consentClause',
  capture: 'captureClause',
  erasure: 'erasureClause',
  withdraw: 'withdrawClause',
} as const;

export function PdpConsentField({
  variant,
  checked,
  onChange,
  contact,
  privacyHref = '/privacy',
  className,
}: {
  variant: PdpConsentVariant;
  checked: boolean;
  onChange: (next: boolean) => void;
  contact?: PdpContact;
  privacyHref?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const clause = fillPdp(t.pdp[CLAUSE_KEY[variant]], contact);

  return (
    <label className={cn('flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-3', className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-700 bg-zinc-900 accent-blue-500"
        required
      />
      <span className="min-w-0 text-[12px] leading-5 text-zinc-400">
        <span className="font-medium text-zinc-300">{t.pdp.confirmConsent}. </span>
        {clause}{' '}
        <Link href={privacyHref} className="nova-accent-text underline-offset-2 hover:underline">
          {t.pdp.readNotice}
        </Link>
      </span>
    </label>
  );
}
