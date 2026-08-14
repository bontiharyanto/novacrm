'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown } from 'lucide-react';
import { setActiveAccount } from '@/lib/accounts/actions';
import { ACCOUNT_ALL, type AccountRecord } from '@/lib/accounts/schema';
import { useI18n } from '@/components/layout/preferences-provider';
import { cn } from '@/lib/utils';

export function AccountSwitcher({
  accounts,
  activeAccountId,
}: {
  accounts: AccountRecord[];
  activeAccountId?: string | null;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const active = accounts.find((account) => account.id === activeAccountId) ?? null;
  const value = active?.id ?? (accounts.length > 1 ? ACCOUNT_ALL : activeAccountId ?? '');

  if (accounts.length === 0) {
    return (
      <div className="px-3 pb-2">
        <p className="rounded-md border border-dashed border-zinc-800/80 px-2.5 py-2 text-[11px] leading-4 text-zinc-600">
          {t.common.noAccounts}
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 pb-2">
      <label className="relative flex h-8 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/70 px-2 transition-colors duration-200 ease-out hover:border-zinc-700">
        <Building2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        <select
          value={value}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value;
            startTransition(async () => {
              await setActiveAccount(next);
              router.refresh();
            });
          }}
          className={cn(
            'min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-5 text-[13px] text-zinc-100 outline-none',
            pending && 'opacity-60',
          )}
          aria-label={t.common.accountFilter}
        >
          {accounts.length > 1 ? (
            <option value={ACCOUNT_ALL} className="bg-zinc-900 text-zinc-50">
              {t.accountPick.allAccounts}
            </option>
          ) : null}
          {accounts.map((account) => (
            <option key={account.id} value={account.id} className="bg-zinc-900 text-zinc-50">
              {account.code ? `${account.code} · ${account.name}` : account.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-zinc-500" />
      </label>
    </div>
  );
}
