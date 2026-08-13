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
import { DSAR_TYPES, type DsarType } from '@/lib/governance/schema';

export function DsarCreate() {
  const router = useRouter();
  const [requestType, setRequestType] = useState<DsarType>('access');
  const [subjectName, setSubjectName] = useState('');
  const [subjectEmail, setSubjectEmail] = useState('');
  const [subjectPhone, setSubjectPhone] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setSaving(true);
    setError('');
    const response = await fetch('/api/governance/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType, subjectName, subjectEmail, subjectPhone, description }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok || payload.error) {
      setError(payload.error ?? 'Unable to create request');
      return;
    }
    router.push(`/governance/requests/${payload.data.id}`);
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
          <Link href="/governance/requests" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> DSAR
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-50">Log data subject request</h1>
        </div>
        <GovernanceNav />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardContent className="space-y-4 p-5">
            <div>
              <Label htmlFor="name">Subject name</Label>
              <Input id="name" className="mt-1.5" value={subjectName} onChange={(event) => setSubjectName(event.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" className="mt-1.5" value={subjectEmail} onChange={(event) => setSubjectEmail(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" className="mt-1.5" value={subjectPhone} onChange={(event) => setSubjectPhone(event.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="desc">Request detail</Label>
              <Textarea id="desc" className="mt-1.5 min-h-32" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <Button type="button" onClick={() => void submit()} disabled={saving || subjectName.length < 2}>
              {saving ? 'Saving...' : 'Create request'}
            </Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardContent className="space-y-3 p-5">
            <Label htmlFor="type">Right</Label>
            <Select id="type" value={requestType} onChange={(event) => setRequestType(event.target.value as DsarType)}>
              {DSAR_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
            <p className="text-sm text-zinc-500">{DSAR_TYPES.find((item) => item.id === requestType)?.hint}</p>
            <p className="text-xs text-zinc-600">SLA starts at 30 days from create. Identity verification is the next stage.</p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
