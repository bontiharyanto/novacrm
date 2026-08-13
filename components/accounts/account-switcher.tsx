'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown } from 'lucide-react';
import { setActiveAccount } from '@/lib/accounts/actions';
import type { AccountRecord } from '@/lib/accounts/schema';
import { cn } from '@/lib/utils';

export function AccountSwitcher({
  accounts,
  activeAccountId,
}: {
  accounts: AccountRecord[];
  activeAccountId?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = accounts.find((account) => account.id === activeAccountId) ?? accounts[0];

  if (accounts.length === 0) {
    return (
      <div className="px-3 py-2">
        <p className="rounded-md border border-dashed border-zinc-800 px-2.5 py-2 text-[11px] text-zinc-600">
          No accounts assigned
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <p className="px-1 pb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">Account</p>
      <label className="relative flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 transition-colors hover:border-zinc-700">
        <Building2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        <select
          value={active?.id}
          disabled={pending || accounts.length === 1}
          onChange={(event) => {
            const next = event.target.value;
            startTransition(async () => {
              await setActiveAccount(next);
              router.refresh();
            });
          }}
          className={cn(
            'min-w-0 flex-1 appearance-none bg-transparent pr-5 text-[13px] text-white outline-none',
            pending && 'opacity-60',
          )}
          aria-label="Active account"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id} className="bg-zinc-900 text-white">
              {account.code ? `${account.code} · ${account.name}` : account.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-zinc-500" />
      </label>
    </div>
  );
}
