'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TypeBadge } from '@/components/tickets/type-badge';
import type { CatalogItem } from '@/lib/catalog/schema';
import { useI18n } from '@/components/layout/preferences-provider';
import { PdpConsentField } from '@/components/shared/pdp-consent-field';
import { usePrivacyEnabled } from '@/components/portal/privacy-module';

export function RecordProducer({ itemId }: { itemId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const privacyEnabled = usePrivacyEnabled();
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [consented, setConsented] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    void fetch(`/api/catalog/${itemId}`)
      .then((response) => response.json())
      .then((payload) => {
        const next = payload.data as CatalogItem | null;
        if (!next?.id) {
          setLoadState('missing');
          return;
        }
        setItem(next);
        const initial: Record<string, string | boolean> = {};
        for (const variable of next.mergedVariables ?? []) {
          initial[variable.key] = variable.type === 'checkbox' ? false : '';
        }
        setAnswers(initial);
        setLoadState('ready');
      })
      .catch(() => setLoadState('missing'));
  }, [itemId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item || (privacyEnabled && !consented)) {
      if (privacyEnabled && !consented) setError(t.pdp.consentRequired);
      return;
    }
    setIsSubmitting(true);
    setError('');
    const response = await fetch(`/api/catalog/${item.id}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.data?.id) {
      setError(t.portal.submitFailed);
      setIsSubmitting(false);
      return;
    }
    router.push(`/portal/${payload.data.id}`);
  }

  if (loadState === 'loading') {
    return <p className="mx-auto max-w-3xl p-4 text-sm text-zinc-500 md:p-8">{t.common.loading}</p>;
  }

  if (loadState === 'missing' || !item) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
        <p className="text-sm text-zinc-400">{t.catalog.itemMissing}</p>
        <Link href="/portal/catalog" className="text-sm text-blue-300 hover:text-blue-200">
          {t.portal.catalog}
        </Link>
      </div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="mx-auto max-w-3xl space-y-6 p-4 pb-safe md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/portal/catalog" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> {t.portal.catalog}
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <h1 className="text-[28px] font-semibold tracking-tight text-zinc-50">{item.name}</h1>
            <TypeBadge type={item.ticketType} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {item.shortDescription || t.tickets.typeHint[item.ticketType]}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => router.push('/portal/catalog')}>
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={isSubmitting || (privacyEnabled && !consented)}>
            {isSubmitting ? t.portal.submitting : t.portal.submitRequest}
          </Button>
        </div>
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <div className="nova-surface space-y-4 rounded-xl border p-5">
        {item.mergedVariables.length === 0 ? (
          <p className="text-sm text-zinc-400">
            {t.tickets.type[item.ticketType]}
          </p>
        ) : (
          item.mergedVariables.map((variable) => (
            <div key={variable.key} className="space-y-1.5">
              <Label>
                {variable.label}
                {variable.required ? <span className="text-rose-400"> *</span> : null}
              </Label>
              {variable.type === 'textarea' ? (
                <Textarea
                  required={variable.required}
                  value={String(answers[variable.key] ?? '')}
                  onChange={(event) => setAnswers((current) => ({ ...current, [variable.key]: event.target.value }))}
                />
              ) : variable.type === 'select' ? (
                <Select
                  required={variable.required}
                  value={String(answers[variable.key] ?? '')}
                  onChange={(event) => setAnswers((current) => ({ ...current, [variable.key]: event.target.value }))}
                >
                  <option value="">Select</option>
                  {(variable.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              ) : variable.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={Boolean(answers[variable.key])}
                    onChange={(event) => setAnswers((current) => ({ ...current, [variable.key]: event.target.checked }))}
                  />
                  Confirm
                </label>
              ) : (
                <Input
                  required={variable.required}
                  placeholder={variable.placeholder}
                  value={String(answers[variable.key] ?? '')}
                  onChange={(event) => setAnswers((current) => ({ ...current, [variable.key]: event.target.value }))}
                />
              )}
            </div>
          ))
        )}
        {privacyEnabled ? (
          <PdpConsentField
            variant="process"
            checked={consented}
            onChange={setConsented}
            privacyHref="/portal/privacy"
          />
        ) : null}
      </div>
      <div className="sticky bottom-0 z-10 -mx-4 flex gap-2 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 pb-safe backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
        <Button type="button" variant="ghost" className="md:hidden" onClick={() => router.push('/portal/catalog')}>
          {t.common.cancel}
        </Button>
        <Button type="submit" className="flex-1 md:hidden" disabled={isSubmitting || (privacyEnabled && !consented)}>
          {isSubmitting ? t.portal.submitting : t.portal.submitRequest}
        </Button>
      </div>
    </motion.form>
  );
}
