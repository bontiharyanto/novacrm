'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Landmark } from 'lucide-react';
import { setActiveAccount } from '@/lib/accounts/actions';
import { ACCOUNT_ALL, type AccountRecord } from '@/lib/accounts/schema';
import { NovaMark } from '@/components/brand/nova-mark';
import { Button } from '@/components/ui/button';
import { PreferenceControls } from '@/components/layout/preference-controls';
import { useI18n } from '@/components/layout/preferences-provider';
import { cn } from '@/lib/utils';

export function SelectAccountForm({
  accounts,
  lastAccountId,
  nextPath,
}: {
  accounts: AccountRecord[];
  lastAccountId?: string | null;
  nextPath: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [selected, setSelected] = useState(
    lastAccountId === ACCOUNT_ALL || (lastAccountId && accounts.some((item) => item.id === lastAccountId))
      ? lastAccountId
      : ACCOUNT_ALL,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function continueWith(accountId: string) {
    startTransition(async () => {
      const result = await setActiveAccount(accountId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.replace(nextPath);
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-lg space-y-4">
      <div className="flex justify-end">
        <PreferenceControls compact />
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex justify-center">
          <NovaMark size={48} />
        </div>
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">NovaCRM</p>
        <h1 className="mt-3 text-center text-xl font-semibold text-zinc-50">{t.accountPick.title}</h1>
        <p className="mt-1 text-center text-sm text-zinc-500">{t.accountPick.subtitle}</p>

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={() => setSelected(ACCOUNT_ALL)}
            className={cn(
              'flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
              selected === ACCOUNT_ALL ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700',
            )}
          >
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-zinc-50">{t.accountPick.allAccounts}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">{t.accountPick.allAccountsHint}</span>
            </span>
          </button>
          {accounts.map((account) => {
            const active = selected === account.id;
            const last = lastAccountId === account.id;
            return (
              <button
                key={account.id}
                type="button"
                onClick={() => setSelected(account.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
                  active ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700',
                )}
              >
                {account.type === 'internal' ? (
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                ) : (
                  <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-zinc-50">
                      {account.code ? `${account.code} · ${account.name}` : account.name}
                    </span>
                    {last ? (
                      <span className="rounded-full border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                        {t.accountPick.lastUsed}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {account.type === 'internal' ? t.accountPick.internal : t.accountPick.customer}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

        <Button
          className="mt-5 w-full"
          disabled={!selected || pending}
          onClick={() => selected && continueWith(selected)}
        >
          {pending ? t.accountPick.pending : t.accountPick.continue}
        </Button>
      </div>
    </div>
  );
}
