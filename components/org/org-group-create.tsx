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
import { Card, CardContent } from '@/components/ui/card';
import { createAssignmentGroup } from '@/lib/org/actions';
import type { AssignmentGroupKind, SupportTier } from '@/lib/org/schema';

export function OrgGroupCreate() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AssignmentGroupKind>('assignment');
  const [tier, setTier] = useState<SupportTier | ''>('l1');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    const result = await createAssignmentGroup({ name: name.trim(), kind, tier: tier || null });
    if (result.error || !result.data?.id) {
      setError(result.error ?? 'Unable to create group.');
      setIsSubmitting(false);
      return;
    }
    router.push(`/org/groups/${result.data.id}`);
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
          <Link href="/org" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> Organization
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-zinc-50">New assignment group</h1>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="L1 Jakarta" required />
          </div>
          <div className="space-y-1.5">
            <Label>Kind</Label>
            <Select value={kind} onChange={(event) => setKind(event.target.value as AssignmentGroupKind)}>
              <option value="assignment">Assignment</option>
              <option value="cab">CAB</option>
              <option value="fulfillment">Fulfillment</option>
              <option value="oncall">On-call</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Support tier</Label>
            <Select value={tier} onChange={(event) => setTier(event.target.value as SupportTier | '')}>
              <option value="">None</option>
              <option value="l1">L1</option>
              <option value="l2">L2</option>
              <option value="l3">L3</option>
            </Select>
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <Button type="submit" disabled={name.trim().length < 2 || isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create group'}
          </Button>
        </div>
      </div>
      <aside className="border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="p-4 text-sm text-zinc-400">
            Groups are queues for the active account. You are added as lead. Staff can belong to many groups across
            units.
          </CardContent>
        </Card>
      </aside>
    </motion.form>
  );
}
