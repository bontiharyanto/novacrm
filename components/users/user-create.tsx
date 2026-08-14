'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { createDirectoryUser } from '@/lib/users/actions';
import { RoleSelect } from '@/components/users/role-select';
import type { AppRole } from '@/lib/rbac/ability';
import { isCustomerRole } from '@/lib/rbac/roles';
import type { AccountRecord } from '@/lib/accounts/schema';
import type { AssignmentGroup } from '@/lib/org/schema';
import { supportTierLabel } from '@/lib/tickets/pending';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { useI18n } from '@/components/layout/preferences-provider';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

export function UserCreate({
  accounts,
  units,
  groups,
  actorRole,
}: {
  accounts: AccountRecord[];
  units: Array<{ id: string; name: string; type: string }>;
  groups: AssignmentGroup[];
  actorRole: AppRole;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<AppRole>('agent');
  const [password, setPassword] = useState('');
  const [accountId, setAccountId] = useState(accounts.find((item) => item.type === 'internal')?.id ?? accounts[0]?.id ?? '');
  const [orgUnitId, setOrgUnitId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const accountOptions = useMemo(() => {
    if (isCustomerRole(role)) return accounts.filter((item) => item.type === 'customer');
    return accounts;
  }, [accounts, role]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    const result = await createDirectoryUser({
      fullName,
      email,
      phone,
      role,
      password,
      accountId,
      orgUnitId,
      groupId: isCustomerRole(role) ? undefined : groupId,
    });
    if (result.error || !result.data?.id) {
      const message = result.error ?? t.common.createFailed;
      setError(message);
      toastError(message);
      setIsSubmitting(false);
      return;
    }
    toastSuccess(t.common.created);
    router.push(`/users/${result.data.id}`);
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
          <Link href="/users" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> Users
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-zinc-50">New user</h1>
          <p className="mt-1 text-sm text-zinc-500">Creates a login, access role, and account membership.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Andi Pratama"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="andi@novacrm.app"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Access</Label>
            <RoleSelect
              id="role"
              value={role}
              actorRole={actorRole}
              onChange={(next) => {
                setRole(next);
                if (isCustomerRole(next)) {
                  const firstCustomer = accounts.find((item) => item.type === 'customer');
                  setAccountId(firstCustomer?.id ?? '');
                  setGroupId('');
                  setOrgUnitId('');
                }
              }}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="password">Temporary password</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="text"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="font-mono"
                required
                minLength={8}
              />
              <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
                Generate
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accountId">Account</Label>
            <Select id="accountId" value={accountId} onChange={(event) => setAccountId(event.target.value)} required>
              <option value="">Select account</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>
          {role !== 'customer' ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="orgUnitId">Home unit</Label>
                <Select id="orgUnitId" value={orgUnitId} onChange={(event) => setOrgUnitId(event.target.value)}>
                  <option value="">None</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="groupId">Support group / level</Label>
                <Select id="groupId" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                  <option value="">None — add later</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.tier ? `${supportTierLabel[group.tier]} · ` : ''}
                      {group.name}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          ) : null}
        </div>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <Button type="submit" disabled={fullName.trim().length < 2 || !email || !password || !accountId || isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create user'}
        </Button>
      </div>

      <aside className="border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="space-y-3 p-4 text-sm leading-6 text-zinc-400">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Access vs level</p>
            <p>
              <span className="text-zinc-200">Access</span> is the login role. Staff can sign in to the desk. Customer
              is portal only.
            </p>
            <p>
              <span className="text-zinc-200">Level</span> comes from the support group (L1 / L2 / L3). Skip it here if
              you will assign groups on the user record.
            </p>
            <p>Copy the temporary password before you leave this page. The user can sign in immediately.</p>
          </CardContent>
        </Card>
      </aside>
    </motion.form>
  );
}
