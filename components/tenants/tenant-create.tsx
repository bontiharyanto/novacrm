'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { createTenant } from '@/lib/tenants/actions';
import { TENANT_PLAN_LABEL, TENANT_PLANS, TENANT_TIMEZONES, type TenantPlan } from '@/lib/tenants/schema';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

export function TenantCreate() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [supportEmail, setSupportEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState<TenantPlan>('standard');
  const [expiresAt, setExpiresAt] = useState('');
  const [graceDays, setGraceDays] = useState('7');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const previewSlug = useMemo(() => (slugTouched ? slug : slugify(name)), [name, slug, slugTouched]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    const result = await createTenant({
      name,
      slug: previewSlug,
      accentColor,
      timezone,
      supportEmail: supportEmail || undefined,
      adminName,
      adminEmail,
      adminPassword,
      subscriptionPlan,
      expiresAt: expiresAt || undefined,
      graceDays: Number(graceDays),
    });
    if (result.error || !result.data?.id) {
      const message = result.error ?? 'Could not create tenant';
      setError(message);
      toastError(message);
      setIsSubmitting(false);
      return;
    }
    toastSuccess('Tenant created');
    router.push(`/tenants/${result.data.id}`);
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="space-y-6 p-6">
        <div>
          <Link href="/tenants" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> Tenants
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-zinc-50">New tenant</h1>
          <p className="mt-1 text-sm text-zinc-500">Creates an isolated client workspace and the first admin login.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Client name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="PT Maju Sentosa"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={previewSlug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              className="font-mono"
              required
            />
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
              placeholder="support@client.com"
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
              <Input
                value={accentColor}
                onChange={(event) => setAccentColor(event.target.value)}
                className="font-mono"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-zinc-800 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Administration</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="subscriptionPlan">Plan</Label>
              <Select
                id="subscriptionPlan"
                value={subscriptionPlan}
                onChange={(event) => setSubscriptionPlan(event.target.value as TenantPlan)}
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
            <div className="space-y-2">
              <Label htmlFor="graceDays">Grace days</Label>
              <Input
                id="graceDays"
                inputMode="numeric"
                value={graceDays}
                onChange={(event) => setGraceDays(event.target.value)}
              />
            </div>
          </div>
          <p className="text-xs leading-5 text-zinc-500">
            Trial without a date gets 14 days. Standard and enterprise stay open until you set a contract end.
          </p>
        </div>

        <div className="space-y-4 rounded-lg border border-zinc-800 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">First admin</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adminName">Full name</Label>
              <Input
                id="adminName"
                value={adminName}
                onChange={(event) => setAdminName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="adminPassword">Password</Label>
              <div className="flex gap-2">
                <Input
                  id="adminPassword"
                  type="text"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  minLength={8}
                  required
                />
                <Button type="button" variant="outline" onClick={() => setAdminPassword(generatePassword())}>
                  Generate
                </Button>
              </div>
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create tenant'}
        </Button>
      </div>

      <aside className="border-t border-zinc-800 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="space-y-3 p-4 text-xs leading-5 text-zinc-500">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">What is created</p>
            <p>Internal account, Service Desk L1, office-hours SLA, and this admin as group lead.</p>
            <p>Give the password to the client admin once. They change it after first login.</p>
            <p className="font-mono text-zinc-400">/login?tenant={previewSlug || 'slug'}</p>
            <p className="font-mono text-zinc-400">/api/v1/t/{previewSlug || 'slug'}</p>
          </CardContent>
        </Card>
      </aside>
    </motion.form>
  );
}
