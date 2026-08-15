'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { UC_COVERAGE_LABEL, UC_PARTY_LABEL, type UnderpinningContract } from '@/lib/uc/schema';

function minutesLabel(value: number) {
  if (value >= 60 && value % 60 === 0) return `${value / 60}h`;
  if (value >= 60) return `${Math.floor(value / 60)}h ${value % 60}m`;
  return `${value}m`;
}

export function UcPanel({
  contracts,
  canEdit,
}: {
  contracts: UnderpinningContract[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  useRealtimeTable('underpinning_contracts', refresh);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Vendor / principal</p>
          <CardTitle className="text-base">Underpinning contracts</CardTitle>
          <p className="mt-1 text-xs text-zinc-500">
            Formal UC sits above group OLA minutes. Link a vendor group at Organization.
          </p>
        </div>
        {canEdit ? (
          <Link
            href="/sla/uc/new"
            className="inline-flex items-center rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-blue-500"
          >
            New UC
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {contracts.length === 0 ? (
          <p className="rounded-lg border border-zinc-800 px-3 py-6 text-center text-sm text-zinc-500">
            No vendor contracts yet. Group minutes still apply as fallback.
          </p>
        ) : (
          contracts.map((contract) => {
            const high = contract.targets.find((item) => item.ticketType === 'incident' && item.priority === 'high');
            return (
              <Link
                key={contract.id}
                href={`/sla/uc/${contract.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 px-3 py-2.5 transition-transform duration-200 hover:-translate-y-0.5 hover:border-zinc-700"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-100">{contract.name}</p>
                  <p className="font-mono text-[11px] text-zinc-500">{contract.contractNumber}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <Badge tone={contract.partyKind === 'principal' ? 'info' : 'warning'}>
                    {UC_PARTY_LABEL[contract.partyKind]} · {contract.partyName}
                  </Badge>
                  <Badge tone={contract.isActive ? 'success' : 'neutral'}>
                    {contract.isActive ? UC_COVERAGE_LABEL[contract.coverage] : 'Inactive'}
                  </Badge>
                  {high ? (
                    <span className="font-mono text-[10px] text-zinc-500">
                      INC high {minutesLabel(high.responseMinutes)}/{minutesLabel(high.resolveMinutes)}
                    </span>
                  ) : null}
                  <span className="text-[10px] text-zinc-600">{contract.linkedGroupCount} groups</span>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
