import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatRelativeId } from '@/lib/utils/dates';
import type { AccountRecord } from '@/lib/accounts/schema';

export function AccountsDashboard({
  accounts,
  canCreate,
}: {
  accounts: AccountRecord[];
  canCreate: boolean;
}) {
  const customers = accounts.filter((account) => account.type === 'customer').length;

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Configuration</p>
            <h1 className="text-2xl font-semibold text-zinc-50">Accounts</h1>
          </div>
          {canCreate ? (
            <Link
              href="/accounts/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
            >
              <Plus className="h-3.5 w-3.5" /> New customer
            </Link>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800">
          {accounts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">No accounts yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Opened</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b border-zinc-800/80 hover:bg-zinc-900/80">
                    <td className="px-3 py-2.5">
                      <Link href={`/accounts/${account.id}`} className="text-zinc-50 hover:text-blue-200">
                        {account.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={account.type === 'internal' ? 'info' : 'neutral'}>
                        {account.type === 'internal' ? 'Internal' : 'Customer'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">{account.code ?? '—'}</td>
                    <td className="px-3 py-2.5 text-zinc-500">{formatRelativeId(account.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <aside className="border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Scope</p>
        <div className="mt-4 space-y-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Accounts</p>
              <p className="mt-1 text-xl font-semibold text-zinc-50">{accounts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Customers</p>
              <p className="mt-1 text-xl font-semibold text-zinc-50">{customers}</p>
            </CardContent>
          </Card>
          <p className="text-sm leading-6 text-zinc-400">
            Each customer has its own tickets, assets, and CMDB. Switch account in the sidebar to work a different
            inventory. Internal holds operator platform CIs.
          </p>
        </div>
      </aside>
    </div>
  );
}
