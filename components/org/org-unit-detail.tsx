'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { updateOrgUnit } from '@/lib/org/actions';
import type { OrgUnit } from '@/lib/org/schema';

export function OrgUnitDetail({
  unit,
  divisions,
  agents,
  canEdit,
}: {
  unit: OrgUnit;
  divisions: OrgUnit[];
  agents: Array<{ id: string; fullName: string }>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(unit.name);
  const [parentId, setParentId] = useState(unit.parentId ?? '');
  const [managerId, setManagerId] = useState(unit.managerId ?? '');
  const [message, setMessage] = useState('');

  async function save() {
    const result = await updateOrgUnit(unit.id, {
      name,
      parentId: unit.type === 'unit' ? parentId : undefined,
      managerId: managerId || undefined,
    });
    setMessage(result.error ?? 'Saved');
    router.refresh();
  }

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6 p-6">
        <div>
          <Link href="/org" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> Organization
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="text-xl font-semibold text-zinc-50">{unit.name}</h1>
            <Badge tone={unit.type === 'division' ? 'info' : 'neutral'}>{unit.type}</Badge>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <input
              id="name"
              value={name}
              disabled={!canEdit}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          {unit.type === 'unit' ? (
            <div className="space-y-1.5">
              <Label>Division</Label>
              <Select value={parentId} disabled={!canEdit} onChange={(event) => setParentId(event.target.value)}>
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
            <Select value={managerId} disabled={!canEdit} onChange={(event) => setManagerId(event.target.value)}>
              <option value="">None</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.fullName}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {canEdit ? (
          <Button type="button" onClick={() => void save()}>
            Save
          </Button>
        ) : null}
        {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
      </div>
      <aside className="border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="p-4 text-sm text-zinc-400">
            Manager line on this unit is the default business approver for internal requests. Assignment still goes to
            a group, not this unit.
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
