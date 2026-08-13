'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CatalogIcon } from '@/components/catalog/catalog-icon';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { formatRelativeId } from '@/lib/utils/dates';
import { ticketTypeMeta } from '@/lib/tickets/process';
import type { CatalogCategory, CatalogItem, CatalogVariableSet } from '@/lib/catalog/schema';

export function CatalogDashboard() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [sets, setSets] = useState<CatalogVariableSet[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch('/api/catalog');
    const payload = await response.json();
    setItems(payload.data ?? []);
    setCategories(payload.categories ?? []);
    setSets(payload.sets ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('catalog_items', load);

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Service catalog</p>
          <h1 className="text-2xl font-semibold text-zinc-50">Catalog items</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/catalog/sets/new"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
          >
            New variable set
          </Link>
          <Link
            href="/catalog/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" /> New item
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: 'Items', value: items.length },
          { label: 'Published', value: items.filter((item) => item.isActive).length },
          { label: 'Variable sets', value: sets.length },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{stat.label}</p>
              <p className="mt-1 text-xl font-semibold text-zinc-50">{loading ? '—' : stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">No catalog items yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Produces</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 font-medium">Opened</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-800/80 hover:bg-zinc-900/80">
                    <td className="px-3 py-2.5">
                      <Link href={`/catalog/${item.id}`} className="flex items-center gap-2 text-zinc-50 hover:text-blue-200">
                        <CatalogIcon id={item.icon} className="h-3.5 w-3.5 text-zinc-400" />
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300">{item.categoryName ?? '—'}</td>
                    <td className="px-3 py-2.5 text-zinc-300">{ticketTypeMeta[item.ticketType].label}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={item.isActive ? 'success' : 'neutral'}>{item.isActive ? 'published' : 'draft'}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500">{formatRelativeId(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {sets.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">Variable sets</p>
          <div className="grid gap-2 md:grid-cols-2">
            {sets.map((set) => (
              <Link
                key={set.id}
                href={`/catalog/sets/${set.id}`}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
              >
                <p className="text-sm text-zinc-50">{set.name}</p>
                <p className="text-[11px] text-zinc-500">{set.variables.length} variables</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {categories.length > 0 ? (
        <p className="text-xs text-zinc-500">
          Categories: {categories.map((item) => item.name).join(' · ')}
        </p>
      ) : null}
    </div>
  );
}
