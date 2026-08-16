'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GovernanceNav } from '@/components/governance/governance-nav';
import { LAWFUL_BASES, type LawfulBasis, type PrivacySettings } from '@/lib/governance/schema';

export function PrivacySettingsForm() {
  const [dpoName, setDpoName] = useState('');
  const [dpoEmail, setDpoEmail] = useState('');
  const [dpoPhone, setDpoPhone] = useState('');
  const [controllerName, setControllerName] = useState('');
  const [controllerAddress, setControllerAddress] = useState('');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [lawfulBasisDefault, setLawfulBasisDefault] = useState<LawfulBasis>('contract');
  const [crossBorderAllowed, setCrossBorderAllowed] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetch('/api/governance/settings')
      .then((response) => response.json())
      .then((payload) => {
        const item = payload.data as PrivacySettings | null;
        if (item) {
          setDpoName(item.dpoName ?? '');
          setDpoEmail(item.dpoEmail ?? '');
          setDpoPhone(item.dpoPhone ?? '');
          setControllerName(item.controllerName ?? '');
          setControllerAddress(item.controllerAddress ?? '');
          setNoticeTitle(item.noticeTitle ?? '');
          setNoticeBody(item.noticeBody ?? '');
          setLawfulBasisDefault(item.lawfulBasisDefault);
          setCrossBorderAllowed(item.crossBorderAllowed);
          setIsPublished(item.isPublished);
        }
        setLoading(false);
      });
  }, []);

  async function save(nextPublished?: boolean) {
    const published = nextPublished ?? isPublished;
    if (nextPublished !== undefined) setIsPublished(nextPublished);
    setSaving(true);
    setError('');
    setSaved(false);
    const response = await fetch('/api/governance/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dpoName,
        dpoEmail,
        dpoPhone,
        controllerName,
        controllerAddress,
        noticeTitle,
        noticeBody,
        lawfulBasisDefault,
        crossBorderAllowed,
        isPublished: published,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok || payload.error) {
      setError(payload.error ?? 'Unable to save');
      return;
    }
    setSaved(true);
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Controller · DPO · notice</p>
          <h1 className="text-2xl font-semibold text-zinc-50">Privacy notice</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Portal Privacy, consent checkboxes, and the public notice stay off until you enable them here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={isPublished ? 'success' : 'warning'}>{isPublished ? 'Enabled on portal' : 'Disabled'}</Badge>
          <GovernanceNav />
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-medium text-zinc-100">Portal privacy module</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Off for now. Turn on to show Privacy in the customer portal and require consent on intake forms.
            </p>
          </div>
          <Button
            type="button"
            variant={isPublished ? 'outline' : 'default'}
            disabled={saving}
            onClick={() => void save(!isPublished)}
          >
            {isPublished ? 'Disable on portal' : 'Enable on portal'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardContent className="space-y-4 p-5">
            <div>
              <Label htmlFor="title">Notice title</Label>
              <Input id="title" className="mt-1.5" value={noticeTitle} onChange={(event) => setNoticeTitle(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="body">Notice body</Label>
              <Textarea id="body" className="mt-1.5 min-h-[320px]" value={noticeBody} onChange={(event) => setNoticeBody(event.target.value)} />
            </div>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            {saved ? <p className="text-sm text-emerald-400">Saved</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving...' : 'Save draft'}
              </Button>
              <Button type="button" disabled={saving} onClick={() => void save(true)}>
                Save and enable
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardContent className="space-y-4 p-5">
            <div>
              <Label htmlFor="controller">Controller</Label>
              <Input id="controller" className="mt-1.5" value={controllerName} onChange={(event) => setControllerName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" className="mt-1.5" value={controllerAddress} onChange={(event) => setControllerAddress(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="dpo">DPO name</Label>
              <Input id="dpo" className="mt-1.5" value={dpoName} onChange={(event) => setDpoName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="dpoEmail">DPO email</Label>
              <Input id="dpoEmail" className="mt-1.5" value={dpoEmail} onChange={(event) => setDpoEmail(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="dpoPhone">DPO phone</Label>
              <Input id="dpoPhone" className="mt-1.5" value={dpoPhone} onChange={(event) => setDpoPhone(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="basis">Default lawful basis</Label>
              <Select
                id="basis"
                className="mt-1.5"
                value={lawfulBasisDefault}
                onChange={(event) => setLawfulBasisDefault(event.target.value as LawfulBasis)}
              >
                {LAWFUL_BASES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={crossBorderAllowed}
                onChange={(event) => setCrossBorderAllowed(event.target.checked)}
              />
              Allow cross-border transfer
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} />
              Enable Privacy on portal
            </label>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
