'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { useI18n } from '@/components/layout/preferences-provider';

export function PortalSiteSettings({
  initialSite = '',
  initialClientIp = '',
}: {
  initialSite?: string;
  initialClientIp?: string;
}) {
  const { t } = useI18n();
  const [site, setSite] = useState(initialSite);
  const [clientIp, setClientIp] = useState(initialClientIp);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const response = await fetch('/api/portal/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site, clientIp }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      toastError(payload.error ?? t.common.saveFailed);
      return;
    }
    toastSuccess(t.portal.siteSaved);
  }

  return (
    <div className="nova-surface space-y-4 rounded-xl border p-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.portal.siteTitle}</p>
        <p className="mt-1 text-sm text-zinc-500">{t.portal.siteHint}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="portal-site">{t.portal.siteLabel}</Label>
        <Input
          id="portal-site"
          value={site}
          onChange={(event) => setSite(event.target.value)}
          placeholder={t.portal.sitePlaceholder}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="portal-client-ip">{t.portal.clientIpLabel}</Label>
        <Input
          id="portal-client-ip"
          value={clientIp}
          onChange={(event) => setClientIp(event.target.value)}
          placeholder={t.portal.clientIpPlaceholder}
          className="font-mono"
        />
        <p className="text-[11px] text-zinc-500">{t.portal.clientIpHint}</p>
      </div>
      <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
        {busy ? t.common.saving : t.portal.siteSave}
      </Button>
    </div>
  );
}
