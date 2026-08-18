'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Plus } from 'lucide-react';
import { CatalogCopyDialog } from '@/components/catalog/catalog-copy-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CatalogIcon } from '@/components/catalog/catalog-icon';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { formatRelativeId } from '@/lib/utils/dates';
import { useI18n } from '@/components/layout/preferences-provider';
import { localizedType } from '@/lib/i18n/labels';
import type { CatalogCategory, CatalogItem, CatalogVariableSet } from '@/lib/catalog/schema';

export function CatalogDashboard({ canCopyCatalog = false }: { canCopyCatalog?: boolean }) {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [sets, setSets] = useState<CatalogVariableSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyOpen, setCopyOpen] = useState(false);

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
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{t.catalog.kicker}</p>
          <h1 className="text-2xl font-semibold text-zinc-50">{t.catalog.title}</h1>
        </div>
        <div className="flex gap-2">
          {canCopyCatalog ? (
            <button
              type="button"
              onClick={() => setCopyOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
            >
              <Copy className="h-3.5 w-3.5" /> {t.catalog.copy.action}
            </button>
          ) : null}
          <Link
            href="/catalog/sets/new"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
          >
            {t.catalog.newVariableSet}
          </Link>
          <Link
            href="/catalog/new"
            className="nova-accent-btn inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5"
          >
            <Plus className="h-3.5 w-3.5" /> {t.catalog.newItem}
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: t.catalog.items, value: items.length },
          { label: t.catalog.published, value: items.filter((item) => item.isActive).length },
          { label: t.catalog.variableSets, value: sets.length },
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
            <p className="px-4 py-8 text-center text-sm text-zinc-500">{t.catalog.empty}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{t.catalog.item}</th>
                  <th className="px-3 py-2 font-medium">{t.catalog.category}</th>
                  <th className="px-3 py-2 font-medium">{t.catalog.produces}</th>
                  <th className="px-3 py-2 font-medium">{t.catalog.state}</th>
                  <th className="px-3 py-2 font-medium">{t.catalog.opened}</th>
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
                    <td className="px-3 py-2.5 text-zinc-300">{localizedType(t, item.ticketType)}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={item.isActive ? 'success' : 'neutral'}>
                        {item.isActive ? t.catalog.published : t.catalog.draft}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500">{formatRelativeId(item.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {sets.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.catalog.variableSets}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {sets.map((set) => (
              <Link
                key={set.id}
                href={`/catalog/sets/${set.id}`}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
              >
                <p className="text-sm text-zinc-50">{set.name}</p>
                <p className="text-[11px] text-zinc-500">
                  {t.catalog.variablesCount.replace('{{n}}', String(set.variables.length))}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {categories.length > 0 ? (
        <p className="text-xs text-zinc-500">
          {t.catalog.categories}: {categories.map((item) => item.name).join(' · ')}
        </p>
      ) : null}

      {canCopyCatalog ? (
        <CatalogCopyDialog open={copyOpen} onClose={() => setCopyOpen(false)} onCopied={() => void load()} />
      ) : null}
    </div>
  );
}
