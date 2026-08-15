'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CatalogIcon } from '@/components/catalog/catalog-icon';
import { Skeleton } from '@/components/ui/skeleton';
import type { CatalogCategory, CatalogItem } from '@/lib/catalog/schema';
import { useI18n } from '@/components/layout/preferences-provider';
import type { TicketType } from '@/lib/tickets/process';

export function CatalogBrowse() {
  const { t } = useI18n();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [active, setActive] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/catalog')
      .then((response) => response.json())
      .then((payload) => {
        setItems((payload.data ?? []).filter((item: CatalogItem) => item.isActive));
        setCategories(payload.categories ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (active === 'all' ? items : items.filter((item) => item.categoryId === active)),
    [active, items],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Service catalog</p>
        <h1 className="text-2xl font-semibold text-zinc-50">Request something</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActive('all')}
          className={`rounded-full border px-3 py-1 text-xs ${
            active === 'all' ? 'border-blue-500/40 bg-blue-500/15 text-blue-200' : 'border-zinc-800 text-zinc-400'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActive(category.id)}
            className={`rounded-full border px-3 py-1 text-xs ${
              active === category.id ? 'border-blue-500/40 bg-blue-500/15 text-blue-200' : 'border-zinc-800 text-zinc-400'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/portal/catalog/${item.id}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-700"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-md border border-zinc-800 bg-zinc-950 p-2 text-blue-300">
                  <CatalogIcon id={item.icon} />
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-50">{item.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.shortDescription || t.tickets.typeHint[item.ticketType as TicketType]}
                  </p>
                </div>
              </div>
            </Link>
          ))}
          {filtered.length === 0 ? <p className="text-sm text-zinc-500">No items in this category.</p> : null}
        </div>
      )}
    </div>
  );
}
