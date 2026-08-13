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
import { addAccountMember, removeAccountMember, setActiveAccount, updateAccount } from '@/lib/accounts/actions';
import type { AccountMember, AccountMemberRole, AccountRecord } from '@/lib/accounts/schema';

export function AccountDetail({
  account,
  members,
  profiles,
  canEdit,
}: {
  account: AccountRecord;
  members: AccountMember[];
  profiles: Array<{ id: string; fullName: string; email?: string; role: string }>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(account.name);
  const [code, setCode] = useState(account.code ?? '');
  const [status, setStatus] = useState(account.status);
  const [userId, setUserId] = useState('');
  const [memberRole, setMemberRole] = useState<AccountMemberRole>('member');
  const [message, setMessage] = useState('');
  const available = profiles.filter((profile) => !members.some((member) => member.userId === profile.id));

  async function saveAccount() {
    const result = await updateAccount(account.id, { name, code, status });
    setMessage(result.error ?? 'Saved');
    router.refresh();
  }

  async function addMember() {
    if (!userId) return;
    const result = await addAccountMember(account.id, { userId, role: memberRole });
    setMessage(result.error ?? 'Member added');
    setUserId('');
    router.refresh();
  }

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/accounts" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
              <ArrowLeft className="h-3.5 w-3.5" /> Accounts
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-white">{account.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={account.type === 'internal' ? 'info' : 'neutral'}>
                {account.type === 'internal' ? 'Internal' : 'Customer'}
              </Badge>
              <span className="font-mono text-xs text-zinc-500">{account.slug}</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void setActiveAccount(account.id).then(() => router.refresh());
            }}
          >
            Work this account
          </Button>
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
            <Label htmlFor="code">Code</Label>
            <input
              id="code"
              value={code}
              disabled={!canEdit}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={status} disabled={!canEdit} onChange={(event) => setStatus(event.target.value as AccountRecord['status'])}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
        </div>
        {canEdit ? (
          <Button type="button" onClick={() => void saveAccount()}>
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
                  <th className="px-3 py-2 font-medium">Membership</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-zinc-800/80">
                    <td className="px-3 py-2.5">
                      <p className="text-white">{member.fullName ?? member.userId.slice(0, 8)}</p>
                      <p className="text-xs text-zinc-500">{member.email}</p>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">{member.role}</td>
                    <td className="px-3 py-2.5 text-right">
                      {canEdit ? (
                        <button
                          type="button"
                          className="text-xs text-zinc-500 hover:text-rose-300"
                          onClick={() => {
                            void removeAccountMember(account.id, member.id).then(() => router.refresh());
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
            Tickets, assets, and CIs created while this account is active stay in this domain. Relations cannot cross
            customers.
          </CardContent>
        </Card>
        {canEdit ? (
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Add member</p>
            <Select value={userId} onChange={(event) => setUserId(event.target.value)}>
              <option value="">Select user</option>
              {available.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.fullName} ({profile.role})
                </option>
              ))}
            </Select>
            <Select value={memberRole} onChange={(event) => setMemberRole(event.target.value as AccountMemberRole)}>
              <option value="owner">Owner</option>
              <option value="member">Member</option>
              <option value="portal">Portal</option>
            </Select>
            <Button type="button" size="sm" disabled={!userId} onClick={() => void addMember()}>
              Add
            </Button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
