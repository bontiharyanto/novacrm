'use client';

import { useI18n } from '@/components/layout/preferences-provider';
import { fillPdp, type PdpContact } from '@/lib/governance/pdp';

const SECTION_KEYS = [
  ['dataTitle', 'dataBody'],
  ['purposeTitle', 'purposeBody'],
  ['basisTitle', 'basisBody'],
  ['rightsTitle', 'rightsBody'],
  ['securityTitle', 'securityBody'],
  ['cookiesTitle', 'cookiesBody'],
  ['processorsTitle', 'processorsBody'],
  ['contactTitle', 'contactBody'],
] as const;

export function PrivacyNoticeArticle({ contact }: { contact?: PdpContact }) {
  const { t } = useI18n();
  const vars = contact ?? {};

  return (
    <article className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-50">{t.pdp.noticeTitle}</h2>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-600">{t.pdp.noticeUpdated}</p>
        <p className="mt-3 text-sm leading-6 text-zinc-400">{fillPdp(t.pdp.noticeIntro, vars)}</p>
      </div>
      {SECTION_KEYS.map(([titleKey, bodyKey]) => (
        <section key={titleKey}>
          <h3 className="text-sm font-medium text-zinc-200">{t.pdp[titleKey]}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{fillPdp(t.pdp[bodyKey], vars)}</p>
        </section>
      ))}
    </article>
  );
}
