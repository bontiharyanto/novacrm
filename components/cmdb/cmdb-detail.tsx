'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { displayTicketNumber } from '@/lib/tickets/process';
import { DEFAULT_CI_CLASSES, formatCiClassLabel, type CiClass } from '@/lib/cmdb/classes';
import { createIpSegment } from '@/lib/cmdb/actions';
import { formatIpSegment, type CmdbItem } from '@/lib/cmdb/schema';
import type { CmdbImpact } from '@/lib/cmdb/impact';

type CmdbDetailData = CmdbItem & { impact: CmdbImpact };

export function CmdbDetail({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [item, setItem] = useState<CmdbDetailData | null>(null);
  const [classes, setClasses] = useState<CiClass[]>(DEFAULT_CI_CLASSES);
  const [cidr, setCidr] = useState('');
  const [vlan, setVlan] = useState('');
  const [gateway, setGateway] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const loadItem = useCallback(async () => {
    const response = await fetch(`/api/cmdb/${itemId}`);
    const payload = await response.json();
    setItem(payload.data ?? null);
  }, [itemId]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  useEffect(() => {
    void fetch('/api/cmdb/classes')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.data?.length) setClasses(payload.data);
      })
      .catch(() => undefined);
  }, []);

  useRealtimeTable('cmdb_items', loadItem);
  useRealtimeTable('tickets', loadItem);
  useRealtimeTable('ip_segments', loadItem);

  if (!item) {
    return (
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-[420px] w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  const impactCount = item.impact.relatedCis.length + item.impact.tickets.length;
  const hostIp = item.attributes.ip;

  async function addSegment() {
    const result = await createIpSegment({
      cidr,
      vlan,
      gateway,
      name: name || cidr,
      cmdbItemId: itemId,
    });
    setMessage(result.error ?? 'Segment added');
    if (!result.error) {
      setCidr('');
      setVlan('');
      setGateway('');
      setName('');
      router.refresh();
      void loadItem();
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5 p-6">
        <div>
          <Link href="/cmdb" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> CMDB
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-zinc-50">{item.name}</h1>
            <Badge tone="info">{formatCiClassLabel(item.type, classes)}</Badge>
            {hostIp ? <Badge tone="neutral">{hostIp}</Badge> : null}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">IP segments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {item.segments.length === 0 ? (
              <p className="text-sm text-zinc-500">No CIDR attached. Add a user / WiFi / mgmt segment in the side panel.</p>
            ) : (
              item.segments.map((segment) => (
                <div key={segment.id} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                  <p className="font-mono text-sm text-zinc-50">{formatIpSegment(segment)}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    {segment.name}
                    {segment.gateway ? ` · gw ${segment.gateway}` : ''}
                    {segment.purpose ? ` · ${segment.purpose}` : ''}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Impact if this CI is down</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-400">
              {impactCount === 0
                ? 'No related CIs or open tickets.'
                : `${item.impact.relatedCis.length} related CIs · ${item.impact.tickets.length} open tickets · ${item.impact.assets.length} assets`}
            </p>
            {item.impact.relatedCis.length > 0 ? (
              <div className="space-y-2">
                {item.impact.relatedCis.map((ci) => (
                  <Link key={ci.id} href={`/cmdb/${ci.id}`} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
                    <span className="text-sm text-zinc-50">{ci.name}</span>
                    <span className="text-[11px] text-zinc-500">{ci.type}</span>
                  </Link>
                ))}
              </div>
            ) : null}
            {item.impact.tickets.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Related tickets</p>
                {item.impact.tickets.map((ticket) => (
                  <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
                    <span className="text-sm text-zinc-50">{ticket.title}</span>
                    <span className="font-mono text-[11px] text-zinc-500">{displayTicketNumber(ticket.number, ticket.id)}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Relations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {item.relations.length === 0 ? (
              <p className="text-sm text-zinc-500">No outbound relations.</p>
            ) : (
              item.relations.map((relation) => (
                <Link
                  key={`${relation.targetId}-${relation.type}`}
                  href={`/cmdb/${relation.targetId}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700"
                >
                  <span className="text-sm text-zinc-50">{relation.type.replace('_', ' ')}</span>
                  <span className="font-mono text-[11px] text-zinc-500">{relation.targetId.slice(0, 8)}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4 border-l border-zinc-800 p-6">
        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Linked asset</p>
            {item.assetId ? (
              <Link href={`/assets/${item.assetId}`} className="text-sm text-blue-300 hover:text-blue-200">
                {item.assetTag || item.assetName}
              </Link>
            ) : (
              <p className="text-sm text-zinc-500">None</p>
            )}
            {Object.entries(item.attributes)
              .filter(([key]) => key !== 'ip')
              .map(([key, value]) => (
                <div key={key}>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{key}</p>
                  <p className="text-sm text-zinc-50">{value}</p>
                </div>
              ))}
          </CardContent>
        </Card>
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Add IP segment</p>
          <div className="space-y-1.5">
            <Label htmlFor="segName">Name</Label>
            <Input id="segName" value={name} onChange={(event) => setName(event.target.value)} placeholder="Users Lt.2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="segCidr">CIDR</Label>
            <Input id="segCidr" value={cidr} onChange={(event) => setCidr(event.target.value)} placeholder="10.20.2.0/24" className="font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="segVlan">VLAN</Label>
              <Input id="segVlan" value={vlan} onChange={(event) => setVlan(event.target.value)} placeholder="20" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="segGw">Gateway</Label>
              <Input id="segGw" value={gateway} onChange={(event) => setGateway(event.target.value)} placeholder="10.20.2.1" className="font-mono" />
            </div>
          </div>
          <Button type="button" size="sm" disabled={!cidr.trim()} onClick={() => void addSegment()}>
            Add segment
          </Button>
          {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
        </div>
      </aside>
    </div>
  );
}
