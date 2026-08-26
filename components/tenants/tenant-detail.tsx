'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ImageIcon, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { BrandMark } from '@/components/brand/nova-mark';
import { expiryToDateInput, tenantAccessState } from '@/lib/tenants/lifecycle';
import { setTenantStatus, updateTenant } from '@/lib/tenants/actions';
import { uploadTenantLogo } from '@/lib/tenants/upload-logo';
import { quotasForPlan } from '@/lib/tenants/quotas';
import {
  TENANT_PLAN_LABEL,
  TENANT_PLANS,
  TENANT_STATUS_LABEL,
  TENANT_TIMEZONES,
  type TenantRecord,
  type TenantStatus,
} from '@/lib/tenants/schema';
import { TenantPlanGuide } from '@/components/tenants/tenant-plan-guide';
import { formatDateLong } from '@/lib/utils/dates';

const statusTone: Record<TenantStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  paused: 'warning',
  archived: 'neutral',
};

export function TenantDetail({
  tenant,
  currentTenantId,
  logoUrl: initialLogoUrl,
}: {
  tenant: TenantRecord;
  currentTenantId: string;
  logoUrl?: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [accentColor, setAccentColor] = useState(tenant.accentColor);
  const [timezone, setTimezone] = useState(tenant.timezone);
  const [supportEmail, setSupportEmail] = useState(tenant.supportEmail);
  const [subscriptionPlan, setSubscriptionPlan] = useState(tenant.subscriptionPlan);
  const [expiresAt, setExpiresAt] = useState(expiryToDateInput(tenant.expiresAt));
  const [graceDays, setGraceDays] = useState(String(tenant.graceDays));
  const [autoPauseOnExpiry, setAutoPauseOnExpiry] = useState(tenant.autoPauseOnExpiry);
  const [isProtected, setIsProtected] = useState(tenant.isProtected);
  const [passwordRotationEnabled, setPasswordRotationEnabled] = useState(tenant.passwordRotationEnabled);
  const [passwordMaxAgeDays, setPasswordMaxAgeDays] = useState(String(tenant.passwordMaxAgeDays));
  const [maxAccounts, setMaxAccounts] = useState(String(tenant.maxAccounts));
  const [maxAgents, setMaxAgents] = useState(String(tenant.maxAgents));
  const [maxTicketsPerMonth, setMaxTicketsPerMonth] = useState(String(tenant.maxTicketsPerMonth));
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLogoUrl ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLogoBusy, setIsLogoBusy] = useState(false);
  const [isStatusBusy, setIsStatusBusy] = useState(false);
  const [error, setError] = useState('');

  const locked = tenant.isProtected || tenant.id === currentTenantId;
  const access = tenantAccessState(tenant);

  useEffect(() => {
    setLogoPreview(initialLogoUrl ?? null);
  }, [initialLogoUrl]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    const result = await updateTenant(tenant.id, {
      name,
      slug,
      accentColor,
      timezone,
      supportEmail: supportEmail || undefined,
      subscriptionPlan,
      expiresAt,
      graceDays: Number(graceDays),
      autoPauseOnExpiry,
      isProtected,
      passwordRotationEnabled,
      passwordMaxAgeDays: Number(passwordMaxAgeDays),
      maxAccounts: Number(maxAccounts),
      maxAgents: Number(maxAgents),
      maxTicketsPerMonth: Number(maxTicketsPerMonth),
    });
    if (result.error) {
      setError(result.error);
      toastError(result.error);
      setIsSaving(false);
      return;
    }
    toastSuccess('Saved');
    setIsSaving(false);
    router.refresh();
  }

  async function handleStatus(status: TenantStatus) {
    setIsStatusBusy(true);
    const result = await setTenantStatus(tenant.id, status);
    if (result.error) {
      toastError(result.error);
      setIsStatusBusy(false);
      return;
    }
    toastSuccess(`Tenant ${TENANT_STATUS_LABEL[status].toLowerCase()}`);
    setIsStatusBusy(false);
    router.refresh();
  }

  async function handleLogoFile(file: File | undefined) {
    if (!file) return;
    setIsLogoBusy(true);
    const uploaded = await uploadTenantLogo(tenant.id, file);
    if (uploaded.error || !uploaded.data) {
      toastError(uploaded.error ?? 'Upload failed');
      setIsLogoBusy(false);
      return;
    }
    const result = await updateTenant(tenant.id, { logoObjectKey: uploaded.data.key });
    if (result.error) {
      toastError(result.error);
      setIsLogoBusy(false);
      return;
    }
    setLogoPreview(URL.createObjectURL(file));
    toastSuccess('Logo updated');
    setIsLogoBusy(false);
    router.refresh();
  }

  async function handleClearLogo() {
    setIsLogoBusy(true);
    const result = await updateTenant(tenant.id, { logoObjectKey: null });
    if (result.error) {
      toastError(result.error);
      setIsLogoBusy(false);
      return;
    }
    setLogoPreview(null);
    toastSuccess('Logo cleared');
    setIsLogoBusy(false);
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      <form onSubmit={handleSave} className="space-y-6 p-6">
        <div>
          <Link href="/tenants" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> Tenants
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-zinc-50">{tenant.name}</h1>
            <Badge tone={statusTone[tenant.status]}>{TENANT_STATUS_LABEL[tenant.status]}</Badge>
            <Badge tone="neutral">{TENANT_PLAN_LABEL[tenant.subscriptionPlan]}</Badge>
            {tenant.isProtected ? <Badge tone="info">Protected</Badge> : null}
            {access === 'expiring' ? <Badge tone="warning">Expiring</Badge> : null}
            {access === 'grace' ? <Badge tone="warning">Grace</Badge> : null}
          </div>
          <p className="mt-1 font-mono text-xs text-zinc-500">{tenant.slug}</p>
        </div>

        <div className="space-y-3 rounded-lg border border-zinc-800 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Brand logo</p>
          <p className="text-xs leading-5 text-zinc-500">
            Shown in the desk sidebar and customer portal. PNG, JPEG, WebP, or SVG · max 1 MB. Co-brand with NovaCRM —
            not a full white-label wipe.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-14 w-28 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950/80 px-2">
              <BrandMark size={36} logoUrl={logoPreview} logoAlt={tenant.name} />
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(event) => {
                  void handleLogoFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <Button type="button" variant="outline" disabled={isLogoBusy} onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {isLogoBusy ? 'Uploading…' : 'Upload'}
              </Button>
              {logoPreview || tenant.logoObjectKey ? (
                <Button type="button" variant="outline" disabled={isLogoBusy} onClick={() => void handleClearLogo()}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Clear
                </Button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <ImageIcon className="h-3.5 w-3.5" /> Default Nova mark
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" value={slug} onChange={(event) => setSlug(event.target.value)} className="font-mono" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select id="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {TENANT_TIMEZONES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support email</Label>
            <Input
              id="supportEmail"
              type="email"
              value={supportEmail}
              onChange={(event) => setSupportEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accentColor">Accent</Label>
            <div className="flex items-center gap-2">
              <input
                id="accentColor"
                type="color"
                value={accentColor}
                onChange={(event) => setAccentColor(event.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-zinc-800 bg-zinc-950"
              />
              <Input value={accentColor} onChange={(event) => setAccentColor(event.target.value)} className="font-mono" />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-zinc-800 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Administration</p>
          <p className="text-xs leading-5 text-zinc-500">
            Contract end is stored on the tenant. Empty date means no expiry. After the end date plus grace days, login
            is blocked. Auto-pause never deletes data.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="subscriptionPlan">Plan</Label>
              <Select
                id="subscriptionPlan"
                value={subscriptionPlan}
                onChange={(event) => {
                  const next = event.target.value as typeof subscriptionPlan;
                  setSubscriptionPlan(next);
                }}
              >
                {TENANT_PLANS.map((item) => (
                  <option key={item} value={item}>
                    {TENANT_PLAN_LABEL[item]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Contract end</Label>
              <Input id="expiresAt" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
            </div>
          </div>
          <TenantPlanGuide plan={subscriptionPlan} />
          <div className="space-y-3 rounded-md border border-zinc-800/80 bg-zinc-950/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Usage quotas</p>
              <Button
                type="button"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() => {
                  const next = quotasForPlan(subscriptionPlan);
                  setMaxAccounts(String(next.maxAccounts));
                  setMaxAgents(String(next.maxAgents));
                  setMaxTicketsPerMonth(String(next.maxTicketsPerMonth));
                }}
              >
                Apply plan defaults
              </Button>
            </div>
            <p className="text-xs leading-5 text-zinc-500">
              Stored caps for this tenant (not invoice amounts). Create user / account / ticket enforce these limits.
              Soft-warn UI comes later.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="maxAccounts">Max accounts</Label>
                <Input
                  id="maxAccounts"
                  inputMode="numeric"
                  value={maxAccounts}
                  onChange={(event) => setMaxAccounts(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAgents">Max agents</Label>
                <Input
                  id="maxAgents"
                  inputMode="numeric"
                  value={maxAgents}
                  onChange={(event) => setMaxAgents(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTicketsPerMonth">Max tickets / month</Label>
                <Input
                  id="maxTicketsPerMonth"
                  inputMode="numeric"
                  value={maxTicketsPerMonth}
                  onChange={(event) => setMaxTicketsPerMonth(event.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="graceDays">Grace days</Label>
              <Input
                id="graceDays"
                inputMode="numeric"
                value={graceDays}
                onChange={(event) => setGraceDays(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordMaxAgeDays">Password max age</Label>
              <Input
                id="passwordMaxAgeDays"
                inputMode="numeric"
                value={passwordMaxAgeDays}
                onChange={(event) => setPasswordMaxAgeDays(event.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={autoPauseOnExpiry}
              onChange={(event) => setAutoPauseOnExpiry(event.target.checked)}
            />
            Auto-pause after grace
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input type="checkbox" checked={isProtected} onChange={(event) => setIsProtected(event.target.checked)} />
            Protected (skip expiry and pause lock)
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={passwordRotationEnabled}
              onChange={(event) => setPasswordRotationEnabled(event.target.checked)}
            />
            Password rotation
          </label>
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </form>

      <aside className="space-y-4 border-t border-zinc-800 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Quotas</p>
            <p className="font-mono text-xs text-zinc-300">
              {tenant.maxAccounts} accounts · {tenant.maxAgents} agents · {tenant.maxTicketsPerMonth} tickets/mo
            </p>
            <p className="text-xs leading-5 text-zinc-500">
              Stored caps for this tenant (not invoice amounts). Create user / account / ticket paths enforce these
              limits.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Access</p>
            <p className="text-sm text-zinc-300">
              {tenant.adminCount} admin · {tenant.userCount} users
            </p>
            <p className="text-xs text-zinc-500">
              Contract: {tenant.expiresAt ? formatDateLong(tenant.expiresAt) : 'No expiry'} · grace {tenant.graceDays}d
            </p>
            <p className="font-mono text-xs text-zinc-500">{tenant.loginUrl}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Backend</p>
            <p className="break-all font-mono text-xs text-zinc-300">{tenant.backendUrl}</p>
            <p className="text-xs leading-5 text-zinc-500">
              OpenAPI 3 path template: /api/v1/t/{'{tenant}'}. Webhooks: {tenant.backendUrl}/webhooks/generic
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(tenant.backendUrl);
                toastSuccess('Backend URL copied');
              }}
            >
              Copy backend URL
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Status</p>
            <p className="text-xs leading-5 text-zinc-500">
              Paused or archived tenants cannot sign in. Protected tenants and the tenant you are using stay active.
            </p>
            <div className="flex flex-wrap gap-2">
              {tenant.status !== 'active' ? (
                <Button type="button" disabled={isStatusBusy} onClick={() => void handleStatus('active')}>
                  Resume
                </Button>
              ) : null}
              {tenant.status === 'active' ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isStatusBusy || locked}
                  onClick={() => void handleStatus('paused')}
                >
                  Pause
                </Button>
              ) : null}
              {tenant.status !== 'archived' ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isStatusBusy || locked}
                  onClick={() => void handleStatus('archived')}
                >
                  Archive
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </aside>
    </motion.div>
  );
}
