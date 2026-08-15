'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { DEMO_TENANT_ID } from '@/lib/config/constants';
import { setTenantStatus, updateTenant } from '@/lib/tenants/actions';
import { TENANT_STATUS_LABEL, TENANT_TIMEZONES, type TenantRecord, type TenantStatus } from '@/lib/tenants/schema';

const statusTone: Record<TenantStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  paused: 'warning',
  archived: 'neutral',
};

export function TenantDetail({ tenant, currentTenantId }: { tenant: TenantRecord; currentTenantId: string }) {
  const router = useRouter();
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [accentColor, setAccentColor] = useState(tenant.accentColor);
  const [timezone, setTimezone] = useState(tenant.timezone);
  const [supportEmail, setSupportEmail] = useState(tenant.supportEmail);
  const [isSaving, setIsSaving] = useState(false);
  const [isStatusBusy, setIsStatusBusy] = useState(false);
  const [error, setError] = useState('');

  const locked = tenant.id === DEMO_TENANT_ID || tenant.id === currentTenantId;

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
          </div>
          <p className="mt-1 font-mono text-xs text-zinc-500">{tenant.slug}</p>
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

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </form>

      <aside className="space-y-4 border-t border-zinc-800 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Access</p>
            <p className="text-sm text-zinc-300">
              {tenant.adminCount} admin · {tenant.userCount} users
            </p>
            <p className="font-mono text-xs text-zinc-500">/login?tenant={tenant.slug}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Status</p>
            <p className="text-xs leading-5 text-zinc-500">
              Paused or archived tenants cannot sign in. Lab tenant and the tenant you are using stay active.
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
