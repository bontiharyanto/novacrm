import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatRelativeId } from '@/lib/utils/dates';
import type { AccountRecord } from '@/lib/accounts/schema';
import { AccountDeleteButton } from '@/components/accounts/account-delete-button';

export function AccountsDashboard({
  accounts,
  canCreate,
  canDelete,
}: {
  accounts: AccountRecord[];
  canCreate: boolean;
  canDelete?: boolean;
}) {
  const customers = accounts.filter((account) => account.type === 'customer').length;

  return (
    <div className="nova-page-split">
      <div className="nova-page">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">Configuration</p>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-50 md:text-xl">Accounts</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/import?kind=accounts"
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900"
            >
              <Upload className="h-3.5 w-3.5" /> Import
            </Link>
            {canCreate ? (
              <Link
                href="/accounts/new"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
              >
                <Plus className="h-3.5 w-3.5" /> New customer
              </Link>
            ) : null}
          </div>
        </div>

        <div className="nova-table-wrap">
          {accounts.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-zinc-500">No accounts yet.</p>
          ) : (
            <table className="nova-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Code</th>
                  <th>Opened</th>
                  {canDelete ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-zinc-900/80">
                    <td>
                      <Link href={`/accounts/${account.id}`} className="text-zinc-50 hover:text-blue-200">
                        {account.name}
                      </Link>
                    </td>
                    <td>
                      <Badge tone={account.type === 'internal' ? 'info' : 'neutral'}>
                        {account.type === 'internal' ? 'Internal' : 'Customer'}
                      </Badge>
                    </td>
                    <td className="font-mono text-xs text-zinc-400">{account.code ?? '—'}</td>
                    <td className="text-zinc-500">{formatRelativeId(account.createdAt)}</td>
                    {canDelete ? (
                      <td className="text-right">
                        <AccountDeleteButton account={account} />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <aside className="nova-aside border-t bg-zinc-900/40 lg:border-t-0">
        <p className="nova-stat-label">Scope</p>
        <div className="space-y-3">
          <Card>
            <CardContent className="nova-stat">
              <p className="nova-stat-label">Accounts</p>
              <p className="nova-stat-value">{accounts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="nova-stat">
              <p className="nova-stat-label">Customers</p>
              <p className="nova-stat-value">{customers}</p>
            </CardContent>
          </Card>
          <p className="text-[13px] leading-5 text-zinc-400">
            Each customer has its own tickets, assets, and CMDB. Switch account in the sidebar to work a different
            inventory. Internal holds operator platform CIs.
          </p>
        </div>
      </aside>
    </div>
  );
}
