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
import { addGroupMember, removeGroupMember, updateAssignmentGroup } from '@/lib/org/actions';
import type { AssignmentGroup, AssignmentGroupKind, GroupMemberRole, SupportTier } from '@/lib/org/schema';
import { supportTierLabel } from '@/lib/tickets/pending';

const kindLabel: Record<AssignmentGroupKind, string> = {
  assignment: 'Assignment',
  cab: 'CAB',
  fulfillment: 'Fulfillment',
  oncall: 'On-call',
};

export function OrgGroupDetail({
  group,
  agents,
  canEdit,
}: {
  group: AssignmentGroup;
  agents: Array<{ id: string; fullName: string }>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [kind, setKind] = useState(group.kind);
  const [tier, setTier] = useState<SupportTier | ''>(group.tier ?? '');
  const [isActive, setIsActive] = useState(group.isActive);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<GroupMemberRole>('member');
  const [message, setMessage] = useState('');
  const available = agents.filter((agent) => !group.members.some((member) => member.userId === agent.id));

  async function save() {
    const result = await updateAssignmentGroup(group.id, { name, kind, isActive, tier: tier || null });
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
            <h1 className="text-xl font-semibold text-white">{group.name}</h1>
            <Badge tone="info">{kindLabel[group.kind]}</Badge>
            {group.tier ? <Badge>{supportTierLabel[group.tier]}</Badge> : null}
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
          <div className="space-y-1.5">
            <Label>Kind</Label>
            <Select value={kind} disabled={!canEdit} onChange={(event) => setKind(event.target.value as AssignmentGroupKind)}>
              <option value="assignment">Assignment</option>
              <option value="cab">CAB</option>
              <option value="fulfillment">Fulfillment</option>
              <option value="oncall">On-call</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Support tier</Label>
            <Select value={tier} disabled={!canEdit} onChange={(event) => setTier(event.target.value as SupportTier | '')}>
              <option value="">None</option>
              <option value="l1">L1</option>
              <option value="l2">L2</option>
              <option value="l3">L3</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={isActive ? 'active' : 'paused'} disabled={!canEdit} onChange={(event) => setIsActive(event.target.value === 'active')}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </Select>
          </div>
        </div>
        {canEdit ? (
          <Button type="button" onClick={() => void save()}>
            Save
          </Button>
        ) : null}
        {message ? <p className="text-sm text-zinc-400">{message}</p> : null}

        <div>
          <h2 className="text-sm font-medium text-white">Members</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {group.members.map((member) => (
                  <tr key={member.id} className="border-b border-zinc-800/80">
                    <td className="px-3 py-2.5 text-white">{member.fullName ?? member.userId.slice(0, 8)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">{member.role}</td>
                    <td className="px-3 py-2.5 text-right">
                      {canEdit ? (
                        <button
                          type="button"
                          className="text-xs text-zinc-500 hover:text-rose-300"
                          onClick={() => {
                            void removeGroupMember(group.id, member.id).then(() => router.refresh());
                          }}
                        >
                          Remove
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <aside className="space-y-4 border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="p-4 text-sm text-zinc-400">
            Tickets queued to this group stay on the current account. People can be in this group even if their home
            unit is elsewhere.
          </CardContent>
        </Card>
        {canEdit ? (
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Add member</p>
            <Select value={userId} onChange={(event) => setUserId(event.target.value)}>
              <option value="">Select staff</option>
              {available.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.fullName}
                </option>
              ))}
            </Select>
            <Select value={role} onChange={(event) => setRole(event.target.value as GroupMemberRole)}>
              <option value="lead">Lead</option>
              <option value="member">Member</option>
            </Select>
            <Button
              type="button"
              size="sm"
              disabled={!userId}
              onClick={() => {
                void addGroupMember(group.id, { userId, role }).then((result) => {
                  setMessage(result.error ?? 'Member added');
                  setUserId('');
                  router.refresh();
                });
              }}
            >
              Add
            </Button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
