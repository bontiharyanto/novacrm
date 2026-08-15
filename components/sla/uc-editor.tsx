'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { createUnderpinningContract, updateUnderpinningContract } from '@/lib/uc/actions';
import {
  defaultUcTargets,
  UC_PARTY_LABEL,
  type UcCoverage,
  type UcPartyKind,
  type UcTargetInput,
  type UnderpinningContract,
} from '@/lib/uc/schema';
import { TICKET_TYPES, ticketTypeMeta } from '@/lib/tickets/process';
import type { TicketPriority, TicketType } from '@/lib/tickets/schema';

const PRIORITIES: TicketPriority[] = ['critical', 'high', 'medium', 'low'];

function cellKey(type: TicketType, priority: TicketPriority) {
  return `${type}:${priority}`;
}

function minutesLabel(value: number) {
  if (value >= 60 && value % 60 === 0) return `${value / 60}h`;
  if (value >= 60) return `${Math.floor(value / 60)}h ${value % 60}m`;
  return `${value}m`;
}

export function UcEditor({
  contract,
  canEdit,
}: {
  contract?: UnderpinningContract | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const isNew = !contract;
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [name, setName] = useState(contract?.name ?? '');
  const [contractNumber, setContractNumber] = useState(contract?.contractNumber ?? '');
  const [partyKind, setPartyKind] = useState<UcPartyKind>(contract?.partyKind ?? 'vendor');
  const [partyName, setPartyName] = useState(contract?.partyName ?? '');
  const [coverage, setCoverage] = useState<UcCoverage>(contract?.coverage ?? '24x7');
  const [startsOn, setStartsOn] = useState(contract?.startsOn ?? '');
  const [endsOn, setEndsOn] = useState(contract?.endsOn ?? '');
  const [contactEmail, setContactEmail] = useState(contract?.contactEmail ?? '');
  const [contactPhone, setContactPhone] = useState(contract?.contactPhone ?? '');
  const [serviceScope, setServiceScope] = useState(contract?.serviceScope ?? '');
  const [penaltyNotes, setPenaltyNotes] = useState(contract?.penaltyNotes ?? '');
  const [isActive, setIsActive] = useState(contract?.isActive ?? true);
  const [targets, setTargets] = useState<Record<string, { response: number; resolve: number }>>(() => {
    const seed = contract?.targets.length ? contract.targets : defaultUcTargets(contract?.partyKind ?? 'vendor');
    const next: Record<string, { response: number; resolve: number }> = {};
    for (const type of TICKET_TYPES) {
      for (const priority of PRIORITIES) {
        const found = seed.find((item) => item.ticketType === type && item.priority === priority);
        next[cellKey(type, priority)] = {
          response: found?.responseMinutes ?? 240,
          resolve: found?.resolveMinutes ?? 1440,
        };
      }
    }
    return next;
  });

  const sample = useMemo(() => {
    const high = targets[cellKey('incident', 'high')];
    return high ? `INC high ${minutesLabel(high.response)} / ${minutesLabel(high.resolve)}` : '';
  }, [targets]);

  function applyPartyDefaults(nextKind: UcPartyKind) {
    setPartyKind(nextKind);
    if (contract) return;
    const pack = defaultUcTargets(nextKind);
    setTargets((current) => {
      const next = { ...current };
      for (const item of pack) {
        next[cellKey(item.ticketType, item.priority)] = {
          response: item.responseMinutes,
          resolve: item.resolveMinutes,
        };
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const payloadTargets: UcTargetInput[] = TICKET_TYPES.flatMap((ticketType) =>
      PRIORITIES.map((priority) => ({
        ticketType,
        priority,
        responseMinutes: targets[cellKey(ticketType, priority)].response,
        resolveMinutes: targets[cellKey(ticketType, priority)].resolve,
      })),
    );
    const body = {
      name,
      contractNumber,
      partyKind,
      partyName,
      coverage,
      startsOn: startsOn || undefined,
      endsOn: endsOn || undefined,
      contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined,
      serviceScope: serviceScope || undefined,
      penaltyNotes: penaltyNotes || undefined,
      isActive,
      targets: payloadTargets,
    };
    const result = isNew
      ? await createUnderpinningContract(body)
      : await updateUnderpinningContract(contract.id, body);
    setSaving(false);
    setMessage(result.error ?? 'Saved');
    if (!result.error && result.data) {
      router.push(`/sla/uc/${result.data.id}`);
      router.refresh();
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/sla" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
              <ArrowLeft className="h-3.5 w-3.5" /> SLA
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-zinc-50">
              {isNew ? 'New underpinning contract' : contract.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{sample}</p>
          </div>
          {canEdit ? (
            <Button onClick={() => void save()} disabled={saving || name.trim().length < 2}>
              {saving ? 'Saving...' : isNew ? 'Create contract' : 'Save contract'}
            </Button>
          ) : null}
        </div>
        {message ? <p className="text-xs text-zinc-400">{message}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="uc-name">Name</Label>
            <Input id="uc-name" value={name} disabled={!canEdit} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uc-number">Contract number</Label>
            <Input
              id="uc-number"
              value={contractNumber}
              disabled={!canEdit}
              onChange={(event) => setContractNumber(event.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Party</Label>
            <Select
              value={partyKind}
              disabled={!canEdit}
              onChange={(event) => applyPartyDefaults(event.target.value as UcPartyKind)}
            >
              <option value="vendor">Vendor (TAC / OEM)</option>
              <option value="principal">Principal (ISP / carrier)</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uc-party">{partyKind === 'principal' ? 'Principal name' : 'Vendor name'}</Label>
            <Input
              id="uc-party"
              value={partyName}
              disabled={!canEdit}
              onChange={(event) => setPartyName(event.target.value)}
              placeholder={partyKind === 'principal' ? 'Indosat' : 'Fortinet'}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Coverage</Label>
            <Select
              value={coverage}
              disabled={!canEdit}
              onChange={(event) => setCoverage(event.target.value as UcCoverage)}
            >
              <option value="24x7">24×7</option>
              <option value="business_hours">Business hours</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={isActive ? 'active' : 'inactive'}
              disabled={!canEdit}
              onChange={(event) => setIsActive(event.target.value === 'active')}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uc-start">Starts</Label>
            <Input id="uc-start" type="date" value={startsOn} disabled={!canEdit} onChange={(event) => setStartsOn(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uc-end">Ends</Label>
            <Input id="uc-end" type="date" value={endsOn} disabled={!canEdit} onChange={(event) => setEndsOn(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uc-email">Contact email</Label>
            <Input id="uc-email" type="email" value={contactEmail} disabled={!canEdit} onChange={(event) => setContactEmail(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uc-phone">Contact phone</Label>
            <Input id="uc-phone" value={contactPhone} disabled={!canEdit} onChange={(event) => setContactPhone(event.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="uc-scope">Service scope</Label>
          <textarea
            id="uc-scope"
            value={serviceScope}
            disabled={!canEdit}
            onChange={(event) => setServiceScope(event.target.value)}
            rows={3}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="uc-penalty">Penalty / credit notes</Label>
          <textarea
            id="uc-penalty"
            value={penaltyNotes}
            disabled={!canEdit}
            onChange={(event) => setPenaltyNotes(event.target.value)}
            rows={3}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-zinc-900 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="px-3 py-2">Type</th>
                {PRIORITIES.map((priority) => (
                  <th key={priority} className="px-3 py-2">
                    {priority} resp / resolve
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TICKET_TYPES.map((type) => (
                <tr key={type} className="border-t border-zinc-800">
                  <td className="px-3 py-2 text-zinc-300">{ticketTypeMeta[type].label}</td>
                  {PRIORITIES.map((priority) => {
                    const key = cellKey(type, priority);
                    const cell = targets[key];
                    return (
                      <td key={key} className="px-3 py-2">
                        <div className="flex gap-1">
                          <input
                            type="number"
                            min={1}
                            disabled={!canEdit}
                            value={cell.response}
                            onChange={(event) =>
                              setTargets((current) => ({
                                ...current,
                                [key]: { ...current[key], response: Number(event.target.value) || 1 },
                              }))
                            }
                            className="w-16 rounded border border-zinc-800 bg-zinc-950 px-1.5 py-1 font-mono text-xs text-zinc-100"
                          />
                          <input
                            type="number"
                            min={1}
                            disabled={!canEdit}
                            value={cell.resolve}
                            onChange={(event) =>
                              setTargets((current) => ({
                                ...current,
                                [key]: { ...current[key], resolve: Number(event.target.value) || 1 },
                              }))
                            }
                            className="w-16 rounded border border-zinc-800 bg-zinc-950 px-1.5 py-1 font-mono text-xs text-zinc-100"
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="border-t border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-500 lg:border-l lg:border-t-0">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How UC applies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-400">
            <p>
              Customer <span className="text-zinc-200">SLA</span> stays on the account. Internal groups keep flat{' '}
              <span className="text-zinc-200">OLA</span> minutes.
            </p>
            <p>
              Link this contract on a vendor/principal group at <Link href="/org" className="text-blue-300">/org</Link>.
              Escalate starts the UC clock for that type × priority.
            </p>
            {contract ? (
              <p>
                <Badge tone={contract.partyKind === 'principal' ? 'info' : 'warning'}>
                  {UC_PARTY_LABEL[contract.partyKind]}
                </Badge>{' '}
                {contract.linkedGroupCount} linked groups.
              </p>
            ) : (
              <p>New contracts get a default matrix. Edit cells before save.</p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
