'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { formatRelativeId } from '@/lib/utils/dates';
import { ASSET_STATUSES, type AssetRecord, type AssetStatus } from '@/lib/assets/schema';
import { DEFAULT_ASSET_TYPES, formatAssetTypeLabel, type AssetTypeOption } from '@/lib/assets/types';
import { formatIdr, getBookValue, getWarrantyLabel, getWarrantyLevel } from '@/lib/assets/depreciation';
import { cn } from '@/lib/utils';

const statusTone: Record<AssetStatus, 'success' | 'warning' | 'neutral' | 'danger'> = {
  active: 'success',
  in_repair: 'warning',
  retired: 'neutral',
  lost: 'danger',
};

export function AssetDashboard() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [types, setTypes] = useState<AssetTypeOption[]>(DEFAULT_ASSET_TYPES);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<string | 'all'>('all');
  const [status, setStatus] = useState<AssetStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAssets = useCallback(async () => {
    const response = await fetch('/api/assets');
    const payload = await response.json();
    setAssets(payload.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    void fetch('/api/assets/types')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.data?.length) setTypes(payload.data);
      })
      .catch(() => undefined);
  }, []);

  useRealtimeTable('assets', loadAssets);
  useRealtimeTable('asset_types', () => {
    void fetch('/api/assets/types')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.data?.length) setTypes(payload.data);
      })
      .catch(() => undefined);
  });

  const warrantyAlerts = assets.filter((asset) => {
    const level = getWarrantyLevel(asset.warrantyExpiry);
    return level === 'soon' || level === 'expired';
  }).length;

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assets.filter((asset) => {
      if (type !== 'all' && asset.type !== type) return false;
      if (status !== 'all' && asset.status !== status) return false;
      if (!needle) return true;
      return [asset.name, asset.assetTag, asset.brand, asset.model, asset.serial, asset.assignedTo, asset.location]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [assets, type, status, query]);

  async function handleImport(file: File) {
    const response = await fetch('/api/assets/import', {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: await file.text(),
    });
    const payload = await response.json();
    if (!response.ok) {
      setImportMessage(payload.error ?? 'Import failed');
      return;
    }
    setImportMessage(`${payload.data?.length ?? 0} assets imported`);
    await loadAssets();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">ITAM</p>
          <h1 className="text-2xl font-semibold text-white">Assets</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImport(file);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900"
          >
            <Upload className="h-3.5 w-3.5" /> Import CSV
          </button>
          <Link
            href="/assets/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" /> New asset
          </Link>
        </div>
      </div>

      {importMessage ? <p className="text-xs text-zinc-400">{importMessage}</p> : null}

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: 'Total', value: assets.length, className: 'text-zinc-500' },
          { label: 'Active', value: assets.filter((asset) => asset.status === 'active').length, className: 'text-emerald-400' },
          { label: 'In repair', value: assets.filter((asset) => asset.status === 'in_repair').length, className: 'text-amber-400' },
          { label: 'Warranty risk', value: warrantyAlerts, className: 'text-rose-400' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className={`text-[11px] uppercase tracking-[0.16em] ${stat.className}`}>{stat.label}</p>
              <p className="mt-1 text-xl font-semibold text-white">{loading ? '—' : stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={type === 'all'} onClick={() => setType('all')}>
          All types
        </FilterChip>
        {types.map((item) => (
          <FilterChip key={item.slug} active={type === item.slug} onClick={() => setType(item.slug)}>
            {item.label}
          </FilterChip>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={status === 'all'} onClick={() => setStatus('all')} muted>
          All status
        </FilterChip>
        {ASSET_STATUSES.map((item) => (
          <FilterChip key={item} active={status === item} onClick={() => setStatus(item)} muted>
            {item.replace('_', ' ')}
          </FilterChip>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter tag, name, serial..."
              className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Tag</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Assigned</th>
                  <th className="px-3 py-2 font-medium">Book value</th>
                  <th className="px-3 py-2 font-medium">Warranty</th>
                  <th className="px-3 py-2 font-medium">Opened</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-zinc-500">
                      No assets match this filter.
                    </td>
                  </tr>
                ) : (
                  rows.map((asset) => {
                    const warranty = getWarrantyLevel(asset.warrantyExpiry);
                    const book = getBookValue(asset);
                    return (
                      <tr key={asset.id} className="border-b border-zinc-800/80 hover:bg-zinc-900/80">
                        <td className="px-3 py-2.5">
                          <Link href={`/assets/${asset.id}`} className="font-mono text-xs text-blue-300 hover:text-blue-200">
                            {asset.assetTag}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <Link href={`/assets/${asset.id}`} className="text-white hover:text-blue-200">
                            {asset.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-zinc-300">{formatAssetTypeLabel(asset.type, types)}</td>
                        <td className="px-3 py-2.5">
                          <Badge tone={statusTone[asset.status]}>{asset.status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-zinc-300">{asset.assignedTo || 'Unassigned'}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-zinc-300">{formatIdr(book.bookValue)}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              'text-xs',
                              warranty === 'expired' && 'text-rose-400',
                              warranty === 'soon' && 'text-amber-400',
                              warranty === 'ok' && 'text-zinc-400',
                              warranty === 'none' && 'text-zinc-600',
                            )}
                          >
                            {getWarrantyLabel(asset.warrantyExpiry)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-zinc-500">{formatRelativeId(asset.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-[11px] text-zinc-600">
        CSV headers: name, type, status, brand, model, serial, purchaseDate, warrantyExpiry, cost, location, assignedTo
      </p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  muted,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-[11px] font-medium capitalize transition-all duration-200 ease-out hover:-translate-y-0.5',
        active
          ? muted
            ? 'border-zinc-600 bg-zinc-800 text-white'
            : 'border-blue-500/40 bg-blue-500/15 text-blue-200'
          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200',
      )}
    >
      {children}
    </button>
  );
}
