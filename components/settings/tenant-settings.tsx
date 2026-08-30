'use client';

import { useRef, useState } from 'react';
import { ImageIcon, Upload, Trash2 } from 'lucide-react';
import { BrandMark } from '@/components/brand/nova-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { useI18n } from '@/components/layout/preferences-provider';
import { TENANT_TIMEZONES } from '@/lib/tenants/schema';
import { upsertTenantConfig, type TenantConfig } from '@/lib/tenants/config';
import { uploadTenantLogo } from '@/lib/tenants/upload-logo';

export function TenantSettings({ config, logoUrl }: { config: TenantConfig; logoUrl?: string | null }) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(config.name);
  const [accentColor, setAccentColor] = useState(config.accentColor);
  const [timezone, setTimezone] = useState(config.timezone);
  const [supportEmail, setSupportEmail] = useState(config.supportEmail);
  const [logoPreview, setLogoPreview] = useState<string | null>(logoUrl ?? null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    const result = await upsertTenantConfig({ name, accentColor, timezone, supportEmail });
    setSavingProfile(false);
    if (result.error) {
      toastError(result.error);
      return;
    }
    toastSuccess(t.common.saved);
  }

  async function saveLogo(file: File | undefined) {
    if (!file) return;
    setSavingLogo(true);
    const uploaded = await uploadTenantLogo(config.id, file);
    if (uploaded.error || !uploaded.data) {
      toastError(uploaded.error ?? 'Upload failed');
      setSavingLogo(false);
      return;
    }
    const result = await upsertTenantConfig({ logoObjectKey: uploaded.data.key });
    if (result.error) {
      toastError(result.error);
      setSavingLogo(false);
      return;
    }
    setLogoPreview(URL.createObjectURL(file));
    toastSuccess('Logo updated');
    setSavingLogo(false);
  }

  async function clearLogo() {
    setSavingLogo(true);
    const result = await upsertTenantConfig({ logoObjectKey: null });
    setSavingLogo(false);
    if (result.error) {
      toastError(result.error);
      return;
    }
    setLogoPreview(null);
    toastSuccess('Logo cleared');
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-safe md:p-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Tenant administration</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">{t.nav.tenantSettings}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage this tenant&apos;s branding and contact details. Plan, quota, contract, and lifecycle remain platform controls.
        </p>
      </header>

      <section className="nova-surface rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Workspace identity</p>
            <p className="mt-1 text-sm text-zinc-400">These settings apply only to the current tenant.</p>
          </div>
          <span className="rounded-md border border-zinc-800 px-2 py-1 font-mono text-[11px] text-zinc-500">{config.slug}</span>
        </div>
        <form onSubmit={saveProfile} className="mt-5 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Name</Label>
              <Input id="tenant-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-timezone">Timezone</Label>
              <Select id="tenant-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                {TENANT_TIMEZONES.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-support-email">Support email</Label>
              <Input
                id="tenant-support-email"
                type="email"
                value={supportEmail}
                onChange={(event) => setSupportEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-accent">Accent</Label>
              <div className="flex items-center gap-2">
                <input
                  id="tenant-accent"
                  type="color"
                  value={accentColor}
                  onChange={(event) => setAccentColor(event.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-zinc-800 bg-zinc-950"
                />
                <Input value={accentColor} onChange={(event) => setAccentColor(event.target.value)} className="font-mono" />
              </div>
            </div>
          </div>
          <div className="flex justify-end border-t border-zinc-800/80 pt-4">
            <Button type="submit" disabled={savingProfile}>{savingProfile ? t.common.saving : t.common.save}</Button>
          </div>
        </form>
      </section>

      <section className="nova-surface rounded-xl border p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Brand logo</p>
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          Shown in the desk sidebar and customer portal. PNG, JPEG, WebP, or SVG · max 1 MB.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-28 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950/80 px-2">
            <BrandMark size={36} logoUrl={logoPreview} logoAlt={config.name} />
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(event) => {
                void saveLogo(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <Button type="button" variant="outline" disabled={savingLogo} onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
            </Button>
            {logoPreview || config.logoObjectKey ? (
              <Button type="button" variant="outline" disabled={savingLogo} onClick={() => void clearLogo()}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                <ImageIcon className="h-3.5 w-3.5" /> Default Nova mark
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
