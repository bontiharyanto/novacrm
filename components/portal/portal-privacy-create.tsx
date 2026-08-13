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
import { Card, CardContent } from '@/components/ui/card';
import { DSAR_TYPES, type DsarType } from '@/lib/governance/schema';

export function PortalPrivacyCreate({ fullName, email }: { fullName: string; email?: string }) {
  const router = useRouter();
  const [requestType, setRequestType] = useState<DsarType>('access');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
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
      setError(payload.error ?? 'Unable to submit request');
      return;
    }
    router.push(`/portal/privacy/${payload.data.id}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="mx-auto max-w-5xl space-y-5 p-6"
    >
      <div>
        <Link href="/portal/privacy" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
          <ArrowLeft className="h-3.5 w-3.5" /> Privacy
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-white">Submit a rights request</h1>
        <p className="mt-1 text-sm text-zinc-500">Access, correct, or erase personal data held in NovaCRM. Response SLA is 30 days.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardContent className="space-y-4 p-5">
            <div>
              <Label htmlFor="type">Right</Label>
              <Select id="type" className="mt-1.5" value={requestType} onChange={(event) => setRequestType(event.target.value as DsarType)}>
                {DSAR_TYPES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="desc">Detail</Label>
              <Textarea
                id="desc"
                className="mt-1.5 min-h-40"
                placeholder="Describe the data or correction you need."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <Button type="button" onClick={() => void submit()} disabled={saving}>
              {saving ? 'Submitting...' : 'Submit request'}
            </Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardContent className="space-y-3 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Subject</p>
            <p className="text-sm text-white">{fullName}</p>
            <p className="text-xs text-zinc-500">{email ?? 'Email on file'}</p>
            <p className="text-sm text-zinc-500">{DSAR_TYPES.find((item) => item.id === requestType)?.hint}</p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
