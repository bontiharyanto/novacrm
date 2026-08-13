'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { createOrgUnit } from '@/lib/org/actions';
import type { OrgUnit, OrgUnitType } from '@/lib/org/schema';

export function OrgUnitCreate({
  divisions,
  agents,
}: {
  divisions: OrgUnit[];
  agents: Array<{ id: string; fullName: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [type, setType] = useState<OrgUnitType>(searchParams.get('type') === 'division' ? 'division' : 'unit');
  const [parentId, setParentId] = useState(searchParams.get('parent') ?? '');
  const [managerId, setManagerId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    const result = await createOrgUnit({
      name: name.trim(),
      type,
      parentId: type === 'unit' ? parentId : undefined,
      managerId: managerId || undefined,
    });
    if (result.error || !result.data?.id) {
      setError(result.error ?? 'Unable to create unit.');
      setIsSubmitting(false);
      return;
    }
    router.push(`/org/units/${result.data.id}`);
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
          <h1 className="mt-1 text-xl font-semibold text-white">New {type}</h1>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={type}
              onChange={(event) => {
                setType(event.target.value as OrgUnitType);
                if (event.target.value === 'division') setParentId('');
              }}
            >
              <option value="division">Division</option>
              <option value="unit">Unit</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          {type === 'unit' ? (
            <div className="space-y-1.5">
              <Label>Parent division</Label>
              <Select value={parentId} onChange={(event) => setParentId(event.target.value)} required>
                <option value="">Select division</option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>Manager</Label>
            <Select value={managerId} onChange={(event) => setManagerId(event.target.value)}>
              <option value="">None</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.fullName}
                </option>
              ))}
            </Select>
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <Button type="submit" disabled={name.trim().length < 2 || isSubmitting || (type === 'unit' && !parentId)}>
            {isSubmitting ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>
      <aside className="border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="p-4 text-sm text-zinc-400">
            Division is the top HR layer. Unit is the home org for staff. Do not model assignment queues here — use
            groups.
          </CardContent>
        </Card>
      </aside>
    </motion.form>
  );
}
