'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CatalogIcon } from '@/components/catalog/catalog-icon';
import { CatalogOtherForm } from '@/components/catalog/catalog-other-form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { CatalogCategory, CatalogItem } from '@/lib/catalog/schema';
import { useI18n } from '@/components/layout/preferences-provider';
import type { TicketType } from '@/lib/tickets/process';

export function CatalogBrowse() {
  const { t } = useI18n();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [active, setActive] = useState('all');
  const [query, setQuery] = useState('');
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

  const filtered = useMemo(() => {
    const hay = query.trim().toLowerCase();
    return items.filter((item) => {
      if (active !== 'all' && item.categoryId !== active) return false;
      if (!hay) return true;
      return [item.name, item.shortDescription, item.categoryName, item.slug]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(hay));
    });
  }, [active, items, query]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-safe md:p-8">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-zinc-50">{t.catalog.requestSomething}</h1>
        <p className="mt-1.5 text-sm text-zinc-500">{t.catalog.kicker}</p>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t.catalog.search}
        className="h-10 max-w-md"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActive('all')}
          className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
            active === 'all' ? 'nova-accent-chip' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
          }`}
        >
          {t.catalog.all}
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActive(category.id)}
            className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
              active === category.id ? 'nova-accent-chip' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
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
              className="nova-surface rounded-xl border p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-500"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-md border border-zinc-800 bg-zinc-950 p-2 nova-accent-icon">
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
          {filtered.length === 0 ? (
            <p className="col-span-full py-6 text-center text-sm text-zinc-500">
              {items.length === 0 ? t.catalog.emptyPublishHint : t.catalog.emptyCategory}
            </p>
          ) : null}
        </div>
      )}

      <CatalogOtherForm compact />
    </div>
  );
}
