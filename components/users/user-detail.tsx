'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { addGroupMember, removeGroupMember } from '@/lib/org/actions';
import { resetUserMfa } from '@/lib/auth/mfa';
import { resetUserPassword } from '@/lib/auth/password-actions';
import { updateUserAccess } from '@/lib/users/actions';
import { Input } from '@/components/ui/input';
import { formatDateLong } from '@/lib/utils/dates';
import type { DirectoryUser } from '@/lib/users/schema';
import { RoleSelect } from '@/components/users/role-select';
import type { AppRole } from '@/lib/rbac/ability';
import { localizedRole } from '@/lib/i18n/labels';
import { supportTierLabel } from '@/lib/tickets/pending';
import type { AssignmentGroup } from '@/lib/org/schema';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { useI18n } from '@/components/layout/preferences-provider';

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

export function UserDetail({
  user,
  units,
  groups,
  canEdit,
  canResetMfa,
  canResetPassword,
  actorRole,
}: {
  user: DirectoryUser;
  units: Array<{ id: string; name: string; type: string }>;
  groups: AssignmentGroup[];
  canEdit: boolean;
  canResetMfa?: boolean;
  canResetPassword?: boolean;
  actorRole: AppRole;
}) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [role, setRole] = useState<AppRole>(user.role);
  const [orgUnitId, setOrgUnitId] = useState(user.orgUnitId ?? '');
  const [groupId, setGroupId] = useState('');
  const [message, setMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const available = groups.filter((group) => !user.groups.some((item) => item.groupId === group.id));

  async function save() {
    const result = await updateUserAccess(user.id, { role, orgUnitId: orgUnitId || null });
    if (result.error) {
      setMessage(result.error);
      toastError(result.error);
    } else {
      setMessage(t.common.saved);
      toastSuccess(t.common.saved);
    }
    router.refresh();
  }

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6 p-6">
        <div>
          <Link href="/users" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> Users
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-zinc-50">{user.fullName}</h1>
            <Badge tone={roleTone[user.role]}>{localizedRole(t, user.role)}</Badge>
            {user.supportLevel ? <Badge tone="warning">{supportTierLabel[user.supportLevel]}</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-zinc-500">{user.email ?? 'No email'}</p>
          <p className="mt-2 text-xs text-zinc-500">
            {t.passwordPolicy.status}:{' '}
            <span className={user.passwordExpired ? 'text-amber-300' : 'text-zinc-300'}>
              {user.passwordExpired ? t.passwordPolicy.due : t.passwordPolicy.ok}
            </span>
            {user.passwordChangedAt ? ` · ${t.passwordPolicy.lastChanged} ${formatDateLong(user.passwordChangedAt, locale)}` : ''}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Access</Label>
            <RoleSelect value={role} actorRole={actorRole} disabled={!canEdit} onChange={setRole} />
          </div>
          <div className="space-y-1.5">
            <Label>Home unit</Label>
            <Select value={orgUnitId} disabled={!canEdit} onChange={(event) => setOrgUnitId(event.target.value)}>
              <option value="">None</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {canEdit ? (
          <Button type="button" onClick={() => void save()}>
            Save access
          </Button>
        ) : null}
        {message ? <p className="text-sm text-zinc-400">{message}</p> : null}

        <div>
          <h2 className="text-sm font-medium text-zinc-50">Support groups / level</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Group</th>
                  <th className="px-3 py-2 font-medium">Level</th>
                  <th className="px-3 py-2 font-medium">In group</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {user.groups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-zinc-500">
                      No groups. Level stays empty until assigned to L1/L2/L3.
                    </td>
                  </tr>
                ) : (
                  user.groups.map((group) => (
                    <tr key={group.membershipId} className="border-b border-zinc-800/80">
                      <td className="px-3 py-2.5">
                        <Link href={`/org/groups/${group.groupId}`} className="text-zinc-50 hover:text-blue-200">
                          {group.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400">{group.tier ? supportTierLabel[group.tier] : '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-500">{group.memberRole}</td>
                      <td className="px-3 py-2.5 text-right">
                        {canEdit ? (
                          <button
                            type="button"
                            className="text-xs text-zinc-500 hover:text-rose-300"
                            onClick={() => {
                              void removeGroupMember(group.groupId, group.membershipId).then(() => router.refresh());
                            }}
                          >
                            Remove
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <aside className="space-y-4 border-l border-zinc-800 p-6 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {user.accounts.length === 0 ? (
              <p className="text-zinc-500">No account membership.</p>
            ) : (
              user.accounts.map((account) => (
                <div key={account.accountId} className="flex items-center justify-between gap-2">
                  <Link href={`/accounts/${account.accountId}`} className="text-zinc-200 hover:text-blue-200">
                    {account.name}
                  </Link>
                  <span className="font-mono text-[10px] text-zinc-500">{account.memberRole}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        {canResetPassword ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-zinc-400">{t.passwordPolicy.reset}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs leading-5 text-zinc-500">{t.passwordPolicy.resetHint}</p>
              <Input
                type="password"
                autoComplete="new-password"
                value={tempPassword}
                onChange={(event) => setTempPassword(event.target.value)}
                placeholder={t.portal.newPassword}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={resettingPassword || tempPassword.trim().length < 8}
                onClick={() => {
                  setResettingPassword(true);
                  void resetUserPassword(user.id, tempPassword).then((result) => {
                    setResettingPassword(false);
                    if (result.error) {
                      setMessage(result.error);
                      toastError(result.error);
                      return;
                    }
                    setTempPassword('');
                    setMessage(t.passwordPolicy.resetDone);
                    toastSuccess(t.passwordPolicy.resetDone);
                    router.refresh();
                  });
                }}
              >
                {t.passwordPolicy.reset}
              </Button>
            </CardContent>
          </Card>
        ) : null}
        {canResetMfa ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-zinc-400">Authenticator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs leading-5 text-zinc-500">
                After you confirm the person&apos;s identity, clear TOTP so they can enroll again on the next login.
              </p>
              {confirmReset ? (
                <div className="space-y-2">
                  <p className="text-xs text-amber-300">This removes every authenticator on the account.</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={resetting}
                      onClick={() => {
                        setResetting(true);
                        void resetUserMfa(user.id).then((result) => {
                          setResetting(false);
                          setConfirmReset(false);
                          if (result.error) {
                            setMessage(result.error);
                            toastError(result.error);
                            return;
                          }
                          setMessage('Authenticator reset');
                          toastSuccess('Authenticator reset');
                        });
                      }}
                    >
                      {resetting ? 'Resetting...' : 'Confirm reset'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" disabled={resetting} onClick={() => setConfirmReset(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" size="sm" variant="outline" onClick={() => setConfirmReset(true)}>
                  Reset authenticator
                </Button>
              )}
            </CardContent>
          </Card>
        ) : null}
        {canEdit ? (
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Add to group</p>
            <Select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="">Select group</option>
              {available.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.tier ? `${supportTierLabel[group.tier]} · ` : ''}
                  {group.name}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              size="sm"
              disabled={!groupId}
              onClick={() => {
                void addGroupMember(groupId, { userId: user.id, role: 'member' }).then((result) => {
                  setMessage(result.error ?? 'Added to group');
                  setGroupId('');
                  router.refresh();
                });
              }}
            >
              Add · sets support level
            </Button>
            <p className="text-[11px] leading-5 text-zinc-500">
              L2/L3 is not a login role. Put the user in L2 Network or L3 Infra. Access (admin/agent) stays separate.
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
