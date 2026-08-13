'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AssetQr } from '@/components/asset/asset-qr';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { formatRelativeId } from '@/lib/utils/dates';
import {
  ASSET_STATUSES,
  type AssetMovement,
  type AssetRecord,
  type AssetStatus,
} from '@/lib/assets/schema';
import { formatIdr, getBookValue, getWarrantyLabel, getWarrantyLevel } from '@/lib/assets/depreciation';
import { displayTicketNumber } from '@/lib/tickets/process';
import { cn } from '@/lib/utils';

type AssetOption = Pick<AssetRecord, 'id' | 'name' | 'assetTag' | 'status'>;

type AssetDetailData = AssetRecord & {
  tickets: Array<{ id: string; number?: string; title: string; status: string }>;
  configurationItems: Array<{ id: string; name: string; type: string }>;
  movements: AssetMovement[];
  replacedBy?: { id: string; name: string; assetTag: string } | null;
};

const statusTone: Record<AssetStatus, 'success' | 'warning' | 'neutral' | 'danger'> = {
  active: 'success',
  in_repair: 'warning',
  retired: 'neutral',
  lost: 'danger',
};

const movementLabel: Record<AssetMovement['eventType'], string> = {
  move: 'Move',
  transfer: 'Transfer',
  replace: 'Replace',
  status: 'Status',
};

const movementTone: Record<AssetMovement['eventType'], 'info' | 'success' | 'warning' | 'neutral'> = {
  move: 'info',
  transfer: 'success',
  replace: 'warning',
  status: 'neutral',
};

function movementSummary(item: AssetMovement) {
  if (item.eventType === 'move') {
    return `${item.fromLocation || '—'} → ${item.toLocation || '—'}`;
  }
  if (item.eventType === 'transfer') {
    return `${item.fromAssignee || '—'} → ${item.toAssignee || '—'}`;
  }
  if (item.eventType === 'replace') {
    return item.relatedAssetTag
      ? `Replaced by ${item.relatedAssetTag}`
      : 'Replaced';
  }
  return `${item.fromStatus || '—'} → ${item.toStatus || '—'}`;
}

export function AssetDetail({ assetId }: { assetId: string }) {
  const [asset, setAsset] = useState<AssetDetailData | null>(null);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [status, setStatus] = useState<AssetStatus>('active');
  const [assignedTo, setAssignedTo] = useState('');
  const [location, setLocation] = useState('');
  const [moveNote, setMoveNote] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [replacementId, setReplacementId] = useState('');
  const [replaceNote, setReplaceNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadAsset = useCallback(async () => {
    const response = await fetch(`/api/assets/${assetId}`);
    const payload = await response.json();
    const next = payload.data as AssetDetailData | null;
    setAsset(next);
    if (next) {
      setStatus(next.status);
      setAssignedTo(next.assignedTo ?? '');
      setLocation(next.location ?? '');
    }
  }, [assetId]);

  useEffect(() => {
    void loadAsset();
  }, [loadAsset]);

  useEffect(() => {
    void fetch('/api/assets')
      .then((response) => response.json())
      .then((payload) => setAssets(payload.data ?? []))
      .catch(() => setAssets([]));
  }, []);

  useRealtimeTable('assets', loadAsset);
  useRealtimeTable('asset_movements', loadAsset);

  const replacements = useMemo(
    () => assets.filter((item) => item.id !== assetId && item.status !== 'retired'),
    [assets, assetId],
  );

  async function saveStatus() {
    setIsSaving(true);
    setMessage('');
    await fetch(`/api/assets/${assetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadAsset();
    setIsSaving(false);
  }

  async function postMovement(body: Record<string, unknown>) {
    setIsSaving(true);
    setMessage('');
    const response = await fetch(`/api/assets/${assetId}/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error) {
      setMessage(payload.error ?? 'Unable to record movement');
    } else {
      setMoveNote('');
      setTransferNote('');
      setReplaceNote('');
      setReplacementId('');
    }
    await loadAsset();
    setIsSaving(false);
  }

  if (!asset) {
    return (
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-[480px] w-full" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    );
  }

  const book = getBookValue(asset);
  const warranty = getWarrantyLevel(asset.warrantyExpiry);

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <div>
          <Link href="/assets" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> Assets
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-semibold text-white">{asset.assetTag}</h1>
            <Badge tone={statusTone[asset.status]}>{asset.status.replace('_', ' ')}</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-semibold text-white">{asset.name}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {[asset.brand, asset.model].filter(Boolean).join(' · ') || asset.type} · opened {formatRelativeId(asset.createdAt)}
          </p>
          {asset.replacedBy ? (
            <p className="mt-2 text-sm text-amber-300">
              Replaced by{' '}
              <Link href={`/assets/${asset.replacedBy.id}`} className="font-mono underline-offset-2 hover:underline">
                {asset.replacedBy.assetTag}
              </Link>{' '}
              · {asset.replacedBy.name}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Book value</p>
              <p className="mt-1 font-mono text-lg text-white">{formatIdr(book.bookValue)}</p>
              <p className="text-[11px] text-zinc-500">{book.percent}% depreciated</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Cost</p>
              <p className="mt-1 font-mono text-lg text-white">{formatIdr(asset.cost)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Warranty</p>
              <p
                className={cn(
                  'mt-1 text-lg',
                  warranty === 'expired' && 'text-rose-400',
                  warranty === 'soon' && 'text-amber-400',
                  warranty === 'ok' && 'text-white',
                  warranty === 'none' && 'text-zinc-500',
                )}
              >
                {getWarrantyLabel(asset.warrantyExpiry)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Movement history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {asset.movements.length === 0 ? (
              <p className="text-sm text-zinc-500">No moves, transfers, or replacements yet.</p>
            ) : (
              asset.movements.map((item) => (
                <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone={movementTone[item.eventType]}>{movementLabel[item.eventType]}</Badge>
                    <span className="text-[11px] text-zinc-500">{formatRelativeId(item.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-white">{movementSummary(item)}</p>
                  {item.relatedAssetId && item.eventType === 'replace' ? (
                    <Link
                      href={`/assets/${item.relatedAssetId}`}
                      className="mt-1 inline-block font-mono text-[11px] text-zinc-500 hover:text-zinc-200"
                    >
                      {item.relatedAssetTag ?? item.relatedAssetId}
                    </Link>
                  ) : null}
                  {item.note ? <p className="mt-1 text-[11px] text-zinc-500">{item.note}</p> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Linked tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {asset.tickets.length === 0 ? (
              <p className="text-sm text-zinc-500">No tickets on this asset.</p>
            ) : (
              asset.tickets.map((ticket) => (
                <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
                  <span className="text-sm text-white">{ticket.title}</span>
                  <span className="font-mono text-[11px] text-zinc-500">{displayTicketNumber(ticket.number, ticket.id)}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Configuration items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {asset.configurationItems.length === 0 ? (
              <p className="text-sm text-zinc-500">Not in CMDB yet.</p>
            ) : (
              asset.configurationItems.map((item) => (
                <Link key={item.id} href={`/cmdb/${item.id}`} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
                  <span className="text-sm text-white">{item.name}</span>
                  <span className="text-[11px] text-zinc-500">{item.type}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        {message ? <p className="text-sm text-rose-400">{message}</p> : null}

        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Status</p>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onChange={(event) => setStatus(event.target.value as AssetStatus)}>
                {ASSET_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </div>
            <Button size="sm" onClick={() => void saveStatus()} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save status'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Move location</p>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Lt. 3" />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input value={moveNote} onChange={(event) => setMoveNote(event.target.value)} placeholder="Relokasi ke lantai marketing" />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={isSaving || !location.trim()}
              onClick={() => void postMovement({ eventType: 'move', location, note: moveNote })}
            >
              Record move
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Transfer user</p>
            <div className="space-y-1.5">
              <Label>Assigned to</Label>
              <Input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Operations" />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input value={transferNote} onChange={(event) => setTransferNote(event.target.value)} placeholder="Mutasi setelah reorg" />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={isSaving || !assignedTo.trim()}
              onClick={() => void postMovement({ eventType: 'transfer', assignedTo, note: transferNote })}
            >
              Record transfer
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Replace asset</p>
            <div className="space-y-1.5">
              <Label>Replacement</Label>
              <Select value={replacementId} onChange={(event) => setReplacementId(event.target.value)}>
                <option value="">Select asset</option>
                {replacements.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.assetTag} · {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input value={replaceNote} onChange={(event) => setReplaceNote(event.target.value)} placeholder="Rusak / refresh cycle" />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={isSaving || !replacementId || asset.status === 'retired'}
              onClick={() => void postMovement({ eventType: 'replace', replacementId, note: replaceNote })}
            >
              Retire and replace
            </Button>
            <p className="text-[11px] text-zinc-600">Current asset becomes retired. Same-account replacement inherits location/user if empty.</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">QR · {asset.assetTag}</p>
            <AssetQr assetTag={asset.assetTag} name={asset.name} />
            {asset.serial ? <p className="font-mono text-xs text-zinc-500">S/N {asset.serial}</p> : null}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
