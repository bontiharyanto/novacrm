'use client';

import { useState } from 'react';
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
import { DATA_CATEGORIES, type BreachSeverity } from '@/lib/governance/schema';
import { cn } from '@/lib/utils';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { useI18n } from '@/components/layout/preferences-provider';

export function BreachCreate() {
  const router = useRouter();
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<BreachSeverity>('medium');
  const [affectedCount, setAffectedCount] = useState(0);
  const [dataCategories, setDataCategories] = useState<string[]>(['identity']);
  const [notifyAuthority, setNotifyAuthority] = useState(true);
  const [notifySubjects, setNotifySubjects] = useState(false);
  const [containment, setContainment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setSaving(true);
    setError('');
    const response = await fetch('/api/governance/breaches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        severity,
        affectedCount,
        dataCategories,
        notifyAuthority,
        notifySubjects,
        containment,
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
    router.push(`/governance/breaches/${payload.data.id}`);
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
          <Link href="/governance/breaches" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> Breach register
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-50">Log personal data breach</h1>
        </div>
        <GovernanceNav />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardContent className="space-y-4 p-5">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" className="mt-1.5" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="desc">What happened</Label>
              <Textarea id="desc" className="mt-1.5 min-h-28" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div>
              <Label>Data categories affected</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DATA_CATEGORIES.map((item) => {
                  const active = dataCategories.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setDataCategories(
                          active ? dataCategories.filter((id) => id !== item.id) : [...dataCategories, item.id],
                        )
                      }
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ease-out hover:-translate-y-0.5',
                        active
                          ? 'border-blue-500/40 bg-blue-500/15 text-blue-200'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400',
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="containment">Containment</Label>
              <Textarea
                id="containment"
                className="mt-1.5 min-h-24"
                value={containment}
                onChange={(event) => setContainment(event.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <Button type="button" onClick={() => void submit()} disabled={saving || title.length < 3}>
              {saving ? 'Saving...' : 'Create record'}
            </Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardContent className="space-y-4 p-5">
            <div>
              <Label htmlFor="severity">Severity</Label>
              <Select
                id="severity"
                className="mt-1.5"
                value={severity}
                onChange={(event) => setSeverity(event.target.value as BreachSeverity)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="count">Affected people</Label>
              <Input
                id="count"
                type="number"
                className="mt-1.5"
                value={affectedCount}
                onChange={(event) => setAffectedCount(Number(event.target.value))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={notifyAuthority} onChange={(event) => setNotifyAuthority(event.target.checked)} />
              Notify authority within 72h
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={notifySubjects} onChange={(event) => setNotifySubjects(event.target.checked)} />
              Notify data subjects
            </label>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
