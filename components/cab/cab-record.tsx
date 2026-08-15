'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TypeBadge } from '@/components/tickets/type-badge';
import { ProcessStrip } from '@/components/tickets/process-strip';
import { CHANGE_TYPES, RISK_LEVELS, type CabApproval, type ChangeType, type RiskLevel } from '@/lib/cab/schema';
import { changeReadyForCab } from '@/lib/cab/flow';
import { displayTicketNumber, stageLabel } from '@/lib/tickets/process';
import { formatRelativeId } from '@/lib/utils/dates';
import type { TicketRecord } from '@/lib/tickets/mappers';
import { useRealtimeTable } from '@/lib/supabase/realtime';

function toLocal(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CabRecord({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [approvals, setApprovals] = useState<CabApproval[]>([]);
  const [changeType, setChangeType] = useState<ChangeType>('normal');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('medium');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [implementationPlan, setImplementationPlan] = useState('');
  const [backoutPlan, setBackoutPlan] = useState('');
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const response = await fetch(`/api/cab/${ticketId}`);
    const payload = await response.json();
    const next = payload.data?.ticket as TicketRecord | undefined;
    setTicket(next ?? null);
    setApprovals(payload.data?.approvals ?? []);
    if (next) {
      setChangeType(next.changeType ?? 'normal');
      setRiskLevel(next.riskLevel ?? next.priority);
      setPlannedStart(toLocal(next.plannedStart));
      setPlannedEnd(toLocal(next.plannedEnd));
      setImplementationPlan(next.implementationPlan ?? '');
      setBackoutPlan(next.backoutPlan ?? '');
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable('tickets', load);
  useRealtimeTable('cab_approvals', load);

  async function savePlan() {
    setIsSaving(true);
    setError('');
    const response = await fetch(`/api/cab/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        changeType,
        riskLevel,
        plannedStart: plannedStart ? new Date(plannedStart).toISOString() : null,
        plannedEnd: plannedEnd ? new Date(plannedEnd).toISOString() : null,
        implementationPlan,
        backoutPlan,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error ?? 'Unable to save plan.');
    setIsSaving(false);
    await load();
  }

  async function submitToCab() {
    setIsSaving(true);
    await savePlan();
    const response = await fetch(`/api/cab/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submit: true }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error ?? 'Unable to submit to CAB.');
    setIsSaving(false);
    await load();
  }

  async function decide(decision: 'approved' | 'rejected' | 'deferred') {
    setIsSaving(true);
    setError('');
    if (decision === 'approved') {
      await savePlan();
    }
    const response = await fetch(`/api/cab/${ticketId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, comment }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error ?? 'Unable to record decision.');
    setComment('');
    setIsSaving(false);
    await load();
  }

  if (!ticket) {
    return <p className="p-6 text-sm text-zinc-500">Loading change...</p>;
  }

  const ready = changeReadyForCab({
    changeType,
    riskLevel,
    implementationPlan,
    backoutPlan,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="grid min-h-[calc(100vh-3.5rem)] gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="space-y-5">
        <div>
          <Link href="/cab" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> CAB
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-semibold text-zinc-50">{displayTicketNumber(ticket.number, ticket.id)}</h1>
            <TypeBadge type="change" />
            <Badge tone="info">{stageLabel('change', ticket.status)}</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-50">{ticket.title}</h2>
          {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
        </div>

        <Card>
          <CardContent className="p-4">
            <ProcessStrip type="change" status={ticket.status} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Implementation plan</p>
            <Textarea rows={6} value={implementationPlan} onChange={(event) => setImplementationPlan(event.target.value)} />
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Backout plan</p>
            <Textarea rows={4} value={backoutPlan} onChange={(event) => setBackoutPlan(event.target.value)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">CAB decisions</p>
            {approvals.length === 0 ? <p className="text-sm text-zinc-500">No votes yet.</p> : null}
            {approvals.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800 px-3 py-2">
                <div>
                  <p className="text-sm text-zinc-50">{item.approverName ?? 'Member'}</p>
                  {item.comment ? <p className="text-xs text-zinc-500">{item.comment}</p> : null}
                </div>
                <Badge tone={item.decision === 'approved' ? 'success' : item.decision === 'rejected' ? 'danger' : 'warning'}>
                  {item.decision}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Change properties</p>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={changeType} onChange={(event) => setChangeType(event.target.value as ChangeType)}>
                {CHANGE_TYPES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Risk</Label>
              <Select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value as RiskLevel)}>
                {RISK_LEVELS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Planned start</Label>
              <Input type="datetime-local" value={plannedStart} onChange={(event) => setPlannedStart(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Planned end</Label>
              <Input type="datetime-local" value={plannedEnd} onChange={(event) => setPlannedEnd(event.target.value)} />
            </div>
            <Button className="w-full" variant="outline" onClick={() => void savePlan()} disabled={isSaving}>
              Save plan
            </Button>
            {ticket.status === 'open' ? (
              <Button className="w-full" onClick={() => void submitToCab()} disabled={isSaving || !ready.ok}>
                {changeType === 'standard' ? 'Schedule (pre-approved)' : 'Submit to CAB'}
              </Button>
            ) : null}
            {!ready.ok ? (
              <p className="text-xs text-amber-400">Required before CAB: {ready.missing.join(', ')}</p>
            ) : null}
            <Link href={`/tickets/${ticket.id}`} className="block text-center text-xs text-blue-300 hover:text-blue-200">
              Open ticket record
            </Link>
          </CardContent>
        </Card>

        {ticket.status === 'waiting' ? (
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Vote</p>
              <Textarea rows={3} placeholder="Comment" value={comment} onChange={(event) => setComment(event.target.value)} />
              <Button className="w-full" onClick={() => void decide('approved')} disabled={isSaving || !ready.ok}>
                Approve
              </Button>
              <Button className="w-full" variant="outline" onClick={() => void decide('deferred')} disabled={isSaving}>
                Defer
              </Button>
              <Button className="w-full" variant="ghost" onClick={() => void decide('rejected')} disabled={isSaving}>
                Reject
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <p className="text-[11px] text-zinc-500">Opened {formatRelativeId(ticket.createdAt)}</p>
      </aside>
    </motion.div>
  );
}
