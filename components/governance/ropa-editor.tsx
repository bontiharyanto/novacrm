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
import { Card, CardContent } from '@/components/ui/card';
import { GovernanceNav } from '@/components/governance/governance-nav';
import {
  DATA_CATEGORIES,
  DATA_SUBJECTS,
  LAWFUL_BASES,
  type LawfulBasis,
  type ProcessingActivity,
  type RopaStatus,
} from '@/lib/governance/schema';
import { cn } from '@/lib/utils';

function ToggleSet({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ id: string; label: string }>;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = value.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() =>
              onChange(active ? value.filter((item) => item !== option.id) : [...value, option.id])
            }
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ease-out hover:-translate-y-0.5',
              active
                ? 'border-blue-500/40 bg-blue-500/15 text-blue-200'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function RopaEditor({ activityId }: { activityId?: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [lawfulBasis, setLawfulBasis] = useState<LawfulBasis>('contract');
  const [dataCategories, setDataCategories] = useState<string[]>(['identity', 'contact']);
  const [dataSubjects, setDataSubjects] = useState<string[]>(['customer']);
  const [recipients, setRecipients] = useState('');
  const [retentionDays, setRetentionDays] = useState(365);
  const [crossBorder, setCrossBorder] = useState(false);
  const [securityMeasures, setSecurityMeasures] = useState('');
  const [status, setStatus] = useState<RopaStatus>('draft');
  const [number, setNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activityId) return;
    void fetch(`/api/governance/ropa/${activityId}`)
      .then((response) => response.json())
      .then((payload) => {
        const item = payload.data as ProcessingActivity | null;
        if (!item) return;
        setName(item.name);
        setPurpose(item.purpose);
        setLawfulBasis(item.lawfulBasis);
        setDataCategories(item.dataCategories);
        setDataSubjects(item.dataSubjects);
        setRecipients(item.recipients ?? '');
        setRetentionDays(item.retentionDays);
        setCrossBorder(item.crossBorder);
        setSecurityMeasures(item.securityMeasures ?? '');
        setStatus(item.status);
        setNumber(item.number);
      });
  }, [activityId]);

  async function save() {
    setSaving(true);
    setError('');
    const response = await fetch(activityId ? `/api/governance/ropa/${activityId}` : '/api/governance/ropa', {
      method: activityId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        purpose,
        lawfulBasis,
        dataCategories,
        dataSubjects,
        recipients,
        retentionDays,
        crossBorder,
        securityMeasures,
        status,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok || payload.error) {
      setError(payload.error ?? 'Unable to save');
      return;
    }
    router.push(activityId ? `/governance/ropa/${payload.data.id}` : `/governance/ropa/${payload.data.id}`);
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-5 p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/governance/ropa" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> RoPA
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-50">{activityId ? number || 'Processing activity' : 'New processing activity'}</h1>
        </div>
        <GovernanceNav />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardContent className="space-y-4 p-5">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" className="mt-1.5" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea id="purpose" className="mt-1.5 min-h-28" value={purpose} onChange={(event) => setPurpose(event.target.value)} />
            </div>
            <div>
              <Label>Data categories</Label>
              <div className="mt-2">
                <ToggleSet options={DATA_CATEGORIES} value={dataCategories} onChange={setDataCategories} />
              </div>
            </div>
            <div>
              <Label>Data subjects</Label>
              <div className="mt-2">
                <ToggleSet options={DATA_SUBJECTS} value={dataSubjects} onChange={setDataSubjects} />
              </div>
            </div>
            <div>
              <Label htmlFor="measures">Security measures</Label>
              <Textarea
                id="measures"
                className="mt-1.5 min-h-24"
                value={securityMeasures}
                onChange={(event) => setSecurityMeasures(event.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving...' : 'Save activity'}
            </Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardContent className="space-y-4 p-5">
            <div>
              <Label htmlFor="basis">Lawful basis</Label>
              <Select
                id="basis"
                className="mt-1.5"
                value={lawfulBasis}
                onChange={(event) => setLawfulBasis(event.target.value as LawfulBasis)}
              >
                {LAWFUL_BASES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-[11px] text-zinc-600">{LAWFUL_BASES.find((item) => item.id === lawfulBasis)?.hint}</p>
            </div>
            <div>
              <Label htmlFor="retention">Retention (days)</Label>
              <Input
                id="retention"
                type="number"
                className="mt-1.5"
                value={retentionDays}
                onChange={(event) => setRetentionDays(Number(event.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="recipients">Recipients / processors</Label>
              <Input id="recipients" className="mt-1.5" value={recipients} onChange={(event) => setRecipients(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select id="status" className="mt-1.5" value={status} onChange={(event) => setStatus(event.target.value as RopaStatus)}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="retired">Retired</option>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={crossBorder} onChange={(event) => setCrossBorder(event.target.checked)} />
              Cross-border transfer
            </label>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
