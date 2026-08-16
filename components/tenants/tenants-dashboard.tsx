'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TENANT_STATUS_LABEL, type TenantRecord, type TenantStatus } from '@/lib/tenants/schema';

const statusTone: Record<TenantStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  paused: 'warning',
  archived: 'neutral',
};

export function TenantsDashboard({ tenants }: { tenants: TenantRecord[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | TenantStatus>('all');

  const rows = useMemo(() => {
    return tenants.filter((tenant) => {
      if (filter !== 'all' && tenant.status !== filter) return false;
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return [tenant.name, tenant.slug, tenant.supportEmail, tenant.status].join(' ').toLowerCase().includes(needle);
    });
  }, [tenants, query, filter]);

  const activeCount = tenants.filter((tenant) => tenant.status === 'active').length;

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Platform</p>
            <h1 className="text-2xl font-semibold text-zinc-50">Tenants</h1>
            <p className="mt-1 text-sm text-zinc-500">One tenant per client. Data stays isolated by tenant_id.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/tenants/audit"
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
            >
              Isolation audit
            </Link>
            <Link
              href="/tenants/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
            >
              <Plus className="h-3.5 w-3.5" /> New tenant
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'paused', 'archived'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-md border px-2.5 py-1 text-xs ${
                filter === item
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-200'
                  : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'
              }`}
            >
              {item === 'all' ? 'All' : TENANT_STATUS_LABEL[item]}
            </button>
          ))}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or slug"
            className="ml-auto h-8 w-56 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
          />
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Tenant</th>
                <th className="px-3 py-2 font-medium">Slug</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Admins</th>
                <th className="px-3 py-2 font-medium">Users</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tenant) => (
                <tr key={tenant.id} className="border-t border-zinc-800/80 hover:bg-zinc-900/60">
                  <td className="px-3 py-2.5">
                    <Link href={`/tenants/${tenant.id}`} className="font-medium text-zinc-50 hover:text-blue-200">
                      {tenant.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">{tenant.slug}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={statusTone[tenant.status]}>{TENANT_STATUS_LABEL[tenant.status]}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">{tenant.adminCount}</td>
                  <td className="px-3 py-2.5 text-zinc-300">{tenant.userCount}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-sm text-zinc-500">
                    No tenants match.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="border-t border-zinc-800 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Summary</p>
            <p className="text-sm text-zinc-300">
              {activeCount} active · {tenants.length} total
            </p>
            <p className="text-xs leading-5 text-zinc-500">
              New tenant gets an Internal account, Service Desk L1 group, office-hours SLA, and one admin login. Sign
              out, then log in as that admin to work the client desk.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
