'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DSAR_TYPES, type DsarType } from '@/lib/governance/schema';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { useI18n } from '@/components/layout/preferences-provider';
import { localizedDsarHint, localizedDsarType } from '@/lib/i18n/labels';
import { PdpConsentField } from '@/components/shared/pdp-consent-field';

export function PortalPrivacyCreate({ fullName, email }: { fullName: string; email?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [requestType, setRequestType] = useState<DsarType>('access');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [consented, setConsented] = useState(false);
  const rightsClause = requestType === 'erasure' ? 'erasure' : requestType === 'objection' ? 'withdraw' : null;

  async function submit() {
    if (rightsClause && !consented) {
      setError(t.pdp.consentRequired);
      return;
    }
    setSaving(true);
    setError('');
    const response = await fetch('/api/governance/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType,
        subjectName: fullName,
        subjectEmail: email ?? '',
        description,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok || payload.error) {
      const message = payload.error ?? t.common.createFailed;
      setError(message);
      toastError(message);
      return;
    }
    toastSuccess(t.common.created);
    router.push(`/portal/privacy/${payload.data.id}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="mx-auto max-w-3xl space-y-6 p-4 pb-safe md:p-8"
    >
      <div>
        <Link href="/portal/privacy" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
          <ArrowLeft className="h-3.5 w-3.5" /> {t.portal.privacy}
        </Link>
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-zinc-50">{t.portal.submitRights}</h1>
        <p className="mt-1.5 text-sm text-zinc-500">{t.portal.rightsHint}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <section className="space-y-4 nova-surface rounded-xl border p-5 lg:col-span-8">
          <div>
            <Label htmlFor="type">{t.portal.right}</Label>
            <Select
              id="type"
              className="mt-1.5"
              value={requestType}
              onChange={(event) => {
                setRequestType(event.target.value as DsarType);
                setConsented(false);
                setError('');
              }}
            >
              {DSAR_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {localizedDsarType(t, item.id)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="desc">{t.portal.details}</Label>
            <Textarea
              id="desc"
              className="mt-1.5 min-h-40"
              placeholder={t.portal.detailsPlaceholder}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          {rightsClause ? (
            <PdpConsentField
              variant={rightsClause}
              checked={consented}
              onChange={setConsented}
              privacyHref="/portal/privacy"
            />
          ) : null}
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <Button type="button" onClick={() => void submit()} disabled={saving || (Boolean(rightsClause) && !consented)}>
            {saving ? t.portal.submitting : t.portal.submitRequest}
          </Button>
        </section>
        <aside className="nova-surface rounded-xl border p-5 lg:col-span-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.portal.subject}</p>
          <p className="mt-2 text-sm text-zinc-50">{fullName}</p>
          <p className="mt-1 text-xs text-zinc-500">{email ?? t.portal.emailOnFile}</p>
          <p className="mt-4 text-sm leading-6 text-zinc-500">{localizedDsarHint(t, requestType)}</p>
        </aside>
      </div>
    </motion.div>
  );
}
