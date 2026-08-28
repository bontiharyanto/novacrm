'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { DirectoryUser } from '@/lib/users/schema';
import { supportTierLabel } from '@/lib/tickets/pending';
import { useI18n } from '@/components/layout/preferences-provider';
import { localizedRole } from '@/lib/i18n/labels';
import { isCustomerRole, type AppRole } from '@/lib/rbac/roles';

const roleTone: Record<AppRole, 'danger' | 'info' | 'warning' | 'neutral'> = {
  superadmin: 'danger',
  admin: 'danger',
  manager: 'warning',
  supervisor: 'warning',
  pm_delivery: 'info',
  dco: 'info',
  team_lead: 'info',
  agent: 'info',
  customer: 'neutral',
};

const levelTone: Record<string, 'success' | 'warning' | 'danger'> = {
  l1: 'success',
  l2: 'warning',
  l3: 'danger',
};

export function UsersDashboard({ users, canCreate }: { users: DirectoryUser[]; canCreate: boolean }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'staff' | 'portal'>('all');

  const rows = useMemo(() => {
    return users.filter((user) => {
      if (filter === 'staff' && isCustomerRole(user.role)) return false;
      if (filter === 'portal' && !isCustomerRole(user.role)) return false;
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return [user.fullName, user.email ?? '', user.role, user.orgUnitName ?? '', user.supportLevel ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [users, query, filter]);

  const staffCount = users.filter((user) => !isCustomerRole(user.role)).length;
  const l2Count = users.filter((user) => user.supportLevel === 'l2' || user.supportLevel === 'l3').length;

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Configuration</p>
            <h1 className="text-2xl font-semibold text-zinc-50">Users</h1>
            <p className="mt-1 text-sm text-zinc-500">Access is the app role. Level is L1/L2/L3 from assignment groups.</p>
          </div>
          <div className="flex items-center gap-2">
            {canCreate ? (
              <Link
                href="/import?kind=users"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900"
              >
                <Upload className="h-3.5 w-3.5" /> Import
              </Link>
            ) : null}
            {canCreate ? (
              <Link
                href="/users/new"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
              >
                <Plus className="h-3.5 w-3.5" /> New user
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'staff', 'portal'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full border px-2.5 py-1 text-[11px] ${
                filter === item
                  ? 'border-blue-500/40 bg-blue-500/15 text-blue-200'
                  : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
              }`}
            >
              {item === 'all' ? 'All' : item === 'staff' ? 'Staff' : 'Portal'}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter name, email, role, level..."
              className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            />
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Access</th>
                <th className="px-3 py-2 font-medium">Level</th>
                <th className="px-3 py-2 font-medium">Home unit</th>
                <th className="px-3 py-2 font-medium">Groups</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                    No users match this filter.
                  </td>
                </tr>
              ) : (
                rows.map((user) => (
                  <tr key={user.id} className="border-b border-zinc-800/80 hover:bg-zinc-900/80">
                    <td className="px-3 py-2.5">
                      <Link href={`/users/${user.id}`} className="text-zinc-50 hover:text-blue-200">
                        {user.fullName}
                      </Link>
                      <p className="text-xs text-zinc-500">{user.email ?? '—'}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={roleTone[user.role]}>{localizedRole(t, user.role)}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {user.supportLevel ? (
                        <Badge tone={levelTone[user.supportLevel]}>{supportTierLabel[user.supportLevel]}</Badge>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400">{user.orgUnitName ?? '—'}</td>
                    <td className="px-3 py-2.5 text-zinc-500">{user.groups.map((group) => group.name).join(', ') || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="space-y-4 border-l border-zinc-800 p-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Staff</p>
            <p className="mt-1 text-xl font-semibold text-zinc-50">{staffCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">L2 / L3</p>
            <p className="mt-1 text-xl font-semibold text-zinc-50">{l2Count}</p>
          </CardContent>
        </Card>
        <p className="text-sm leading-6 text-zinc-400">
          <span className="text-zinc-200">Access</span> = admin / agent / customer. Customer is portal only.
          <br />
          <span className="text-zinc-200">Level</span> = highest group tier (L1, L2, L3). Add the person to L2 Network
          or L3 Infra to raise the level.
        </p>
      </aside>
    </div>
  );
}
