'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, List, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CmdbGraph } from '@/components/cmdb/cmdb-graph';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import type { CmdbItem } from '@/lib/cmdb/schema';
import { formatIpSegment } from '@/lib/cmdb/schema';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'network', label: 'Network' },
  { id: 'compute', label: 'Compute' },
  { id: 'edge', label: 'End user' },
] as const;

const COMPUTE = new Set(['server', 'database', 'cluster', 'load_balancer', 'storage', 'cloud', 'service', 'application', 'business_service']);
const EDGE = new Set(['endpoint', 'printer']);

export function CmdbDashboard() {
  const [items, setItems] = useState<CmdbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'graph'>('graph');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');

  const loadItems = useCallback(async () => {
    const response = await fetch('/api/cmdb');
    const payload = await response.json();
    setItems(payload.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useRealtimeTable('cmdb_items', loadItems);
  useRealtimeTable('ip_segments', loadItems);

  const rows = useMemo(() => {
    return items.filter((item) => {
      if (filter === 'network' && item.type !== 'network') return false;
      if (filter === 'compute' && !COMPUTE.has(item.type)) return false;
      if (filter === 'edge' && !EDGE.has(item.type)) return false;
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return [item.name, item.type, item.assetTag, item.assetName, item.attributes?.site, item.attributes?.role]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [items, query, filter]);

  const relationCount = items.reduce((sum, item) => sum + item.relations.length, 0);
  const networkCount = items.filter((item) => item.type === 'network').length;
  const segments = items.flatMap((item) => item.segments ?? []);

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Configuration</p>
            <h1 className="text-2xl font-semibold text-zinc-50">CMDB</h1>
            <p className="mt-1 text-sm text-zinc-500">Topology is scoped to the active account.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-zinc-800 p-0.5">
              <Button size="sm" variant={view === 'graph' ? 'default' : 'ghost'} onClick={() => setView('graph')}>
                <LayoutGrid className="h-3.5 w-3.5" /> Graph
              </Button>
              <Button size="sm" variant={view === 'table' ? 'default' : 'ghost'} onClick={() => setView('table')}>
                <List className="h-3.5 w-3.5" /> List
              </Button>
            </div>
            <Link
              href="/import?kind=cmdb"
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900"
            >
              <Upload className="h-3.5 w-3.5" /> Import
            </Link>
            <Link
              href="/cmdb/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
            >
              <Plus className="h-3.5 w-3.5" /> New CI
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full border px-2.5 py-1 text-[11px] ${
                filter === item.id
                  ? 'border-blue-500/40 bg-blue-500/15 text-blue-200'
                  : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Skeleton className="h-[520px] w-full" />
        ) : view === 'graph' ? (
          <CmdbGraph items={rows} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter CI name, site, or type..."
                className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
              />
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Site</th>
                  <th className="px-3 py-2 font-medium">Asset</th>
                  <th className="px-3 py-2 font-medium">Relations</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                      No CIs in this account.
                    </td>
                  </tr>
                ) : (
                  rows.map((item) => (
                    <tr key={item.id} className="border-b border-zinc-800/80 hover:bg-zinc-900/80">
                      <td className="px-3 py-2.5">
                        <Link href={`/cmdb/${item.id}`} className="text-zinc-50 hover:text-blue-200">
                          {item.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-300">{item.type}</td>
                      <td className="px-3 py-2.5 text-zinc-400">{item.attributes?.site ?? '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">
                        {item.assetId ? (
                          <Link href={`/assets/${item.assetId}`} className="text-blue-300 hover:text-blue-200">
                            {item.assetTag || item.assetName}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400">{item.relations.length}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <aside className="space-y-4 border-l border-zinc-800 p-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">CIs</p>
            <p className="mt-1 text-xl font-semibold text-zinc-50">{loading ? '—' : items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Network nodes</p>
            <p className="mt-1 text-xl font-semibold text-zinc-50">{loading ? '—' : networkCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Relations</p>
            <p className="mt-1 text-xl font-semibold text-zinc-50">{loading ? '—' : relationCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">IP segments</p>
            <p className="mt-1 text-xl font-semibold text-zinc-50">{loading ? '—' : segments.length}</p>
          </CardContent>
        </Card>
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Address plan</p>
          {segments.length === 0 ? (
            <p className="text-sm text-zinc-500">No CIDR on this account yet. Add one on a network CI.</p>
          ) : (
            segments.map((segment) => (
              <Link
                key={segment.id}
                href={segment.cmdbItemId ? `/cmdb/${segment.cmdbItemId}` : '/cmdb'}
                className="block rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700"
              >
                <p className="font-mono text-xs text-zinc-50">{formatIpSegment(segment)}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{segment.name}</p>
              </Link>
            ))
          )}
        </div>
        <p className="text-sm leading-6 text-zinc-400">
          Switch account in the sidebar to open that customer&apos;s topology. Bank = WAN Indosat → FW → core → Lt.2
          AP. Garuda = XL → gudang switch. Links cannot cross accounts.
        </p>
      </aside>
    </div>
  );
}
