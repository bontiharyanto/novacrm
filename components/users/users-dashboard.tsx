'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { deleteDirectoryUser } from '@/lib/users/actions';
import type { DirectoryUser } from '@/lib/users/schema';
import { supportTierLabel } from '@/lib/tickets/pending';
import { useI18n } from '@/components/layout/preferences-provider';
import { localizedRole } from '@/lib/i18n/labels';
import { isCustomerRole, type AppRole } from '@/lib/rbac/roles';
import { toastError, toastSuccess } from '@/components/ui/toast';

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

export function UsersDashboard({
  users,
  canCreate,
  canDelete,
}: {
  users: DirectoryUser[];
  canCreate: boolean;
  canDelete: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'staff' | 'portal'>('all');
  const [pending, setPending] = useState<DirectoryUser | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    const result = await deleteDirectoryUser(pending.id);
    setDeleting(false);
    if (result.error) {
      toastError(result.error);
      return;
    }
    toastSuccess(t.users.deleted);
    setPending(null);
    router.refresh();
  }

  return (
    <div className="nova-page-split">
      <div className="nova-page">
        <PageHeader
          kicker={t.users.kicker}
          title={t.users.title}
          description={t.users.subtitle}
          actions={
            canCreate ? (
              <>
                <Link
                  href="/import?kind=users"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-zinc-800 px-2 text-[12px] text-zinc-300 hover:bg-zinc-900"
                >
                  <Upload className="h-3.5 w-3.5" /> Import
                </Link>
                <Link
                  href="/users/new"
                  className="nova-accent-btn inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> {t.users.newUser}
                </Link>
              </>
            ) : null
          }
        />

        <div className="flex flex-wrap gap-1.5">
          {(['all', 'staff', 'portal'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-md border px-2 py-0.5 text-[11px] ${
                filter === item
                  ? 'border-blue-500/40 bg-blue-500/15 text-blue-200'
                  : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
              }`}
            >
              {item === 'all' ? 'All' : item === 'staff' ? 'Staff' : 'Portal'}
            </button>
          ))}
        </div>

        <div className="nova-table-wrap">
          <div className="border-b border-zinc-800 bg-zinc-900 px-2.5 py-1.5">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter name, email, role, level..."
              className="w-full bg-transparent text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600"
            />
          </div>
          <table className="nova-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Access</th>
                <th>Level</th>
                <th>Home unit</th>
                <th>Groups</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No users match this filter.
                  </td>
                </tr>
              ) : (
                rows.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-900/80">
                    <td>
                      <Link href={`/users/${user.id}`} className="text-zinc-50 hover:text-blue-200">
                        {user.fullName}
                      </Link>
                      <p className="text-[11px] text-zinc-500">{user.email ?? '—'}</p>
                    </td>
                    <td>
                      <Badge tone={roleTone[user.role]}>{localizedRole(t, user.role)}</Badge>
                    </td>
                    <td>
                      {user.supportLevel ? (
                        <Badge tone={levelTone[user.supportLevel]}>{supportTierLabel[user.supportLevel]}</Badge>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="text-zinc-400">{user.orgUnitName ?? '—'}</td>
                    <td className="text-zinc-500">{user.groups.map((group) => group.name).join(', ') || '—'}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/users/${user.id}`} className="text-[11px] text-zinc-400 hover:text-zinc-100">
                          Edit
                        </Link>
                        {canDelete ? (
                          <button
                            type="button"
                            className="text-[11px] text-zinc-500 hover:text-rose-300"
                            onClick={() => setPending(user)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="nova-aside">
        <Card>
          <CardContent className="nova-stat">
            <p className="nova-stat-label">Staff</p>
            <p className="nova-stat-value">{staffCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="nova-stat">
            <p className="nova-stat-label">L2 / L3</p>
            <p className="nova-stat-value">{l2Count}</p>
          </CardContent>
        </Card>
        <p className="text-[13px] leading-5 text-zinc-400">
          <span className="text-zinc-200">Access</span> = admin / agent / customer. Customer is portal only.
          <br />
          <span className="text-zinc-200">Level</span> = highest group tier (L1, L2, L3).
        </p>
      </aside>
      <Dialog open={Boolean(pending)} title={t.users.deleteTitle} onClose={() => (deleting ? undefined : setPending(null))}>
        <p className="text-sm leading-6 text-zinc-400">
          {pending ? `${pending.fullName} · ${pending.email ?? '—'}` : ''}
        </p>
        <p className="mt-2 text-[13px] leading-5 text-zinc-500">{t.users.deleteHint}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" disabled={deleting} onClick={() => setPending(null)}>
            {t.common.cancel}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={deleting} onClick={() => void confirmDelete()}>
            {deleting ? t.common.saving : t.users.deleteUser}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
