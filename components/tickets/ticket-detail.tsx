'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Paperclip, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SlaBadge } from '@/components/tickets/sla-badge';
import { OlaBadge } from '@/components/tickets/ola-badge';
import { TicketAudit } from '@/components/tickets/ticket-audit';
import { PendingBadge } from '@/components/tickets/pending-badge';
import { TypeBadge } from '@/components/tickets/type-badge';
import { ProcessStrip } from '@/components/tickets/process-strip';
import { formatRelativeId } from '@/lib/utils/dates';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { TicketTasksPanel } from '@/components/tickets/ticket-tasks';
import { CommentEditor, CommentHtml } from '@/components/tickets/comment-editor';
import { ActivityEntry, type ActivityComment } from '@/components/tickets/activity-entry';
import { VisitReportForm } from '@/components/tickets/visit-report-form';
import { uploadTicketFile } from '@/lib/tickets/upload-client';
import { displayTicketNumber, isTicketType, TICKET_TYPES, type TicketType } from '@/lib/tickets/process';
import {
  defaultPendingReason,
  isPauseStatus,
  pendingReasonLabel,
  type TicketPendingReason,
} from '@/lib/tickets/pending';
import type { TicketPriority, TicketStatus } from '@/lib/tickets/schema';
import { dispatchTicketAction } from '@/lib/wfm/actions';
import { useI18n } from '@/components/layout/preferences-provider';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { TicketRca, type ProblemOption, type RelatedIncident } from '@/components/tickets/ticket-rca';
import { TicketMajor, type ChildTicket, type MajorOption } from '@/components/tickets/ticket-major';
import { formatGroupQueueLabel } from '@/lib/org/schema';

type TicketItem = {
  id: string;
  number?: string;
  title: string;
  description: string;
  type?: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  dueDate?: string;
  slaResponseAt?: string;
  slaResolveBy?: string;
  slaRespondedAt?: string;
  slaPausedAt?: string;
  slaResponseMinutes?: number;
  slaResolveMinutes?: number;
  olaResponseMinutes?: number;
  olaResolveMinutes?: number;
  olaResponseAt?: string;
  olaResolveBy?: string;
  groupPartyKind?: 'internal' | 'vendor' | 'principal';
  groupPartyName?: string;
  ucId?: string;
  ucName?: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  assigneeId?: string;
  assigneeName?: string;
  groupId?: string;
  groupName?: string;
  pendingReason?: TicketPendingReason;
  pendingNote?: string;
  category?: string;
  catalogItemId?: string;
  catalogAnswers?: Record<string, string>;
  assetId?: string;
  assetName?: string;
  assetTag?: string;
  accountId?: string;
  accountName?: string;
  accountCode?: string;
  createdAt: string;
  comments: ActivityComment[];
  problemId?: string;
  parentTicketId?: string;
  parentNumber?: string;
  parentTitle?: string;
  childTickets?: ChildTicket[];
  problemNumber?: string;
  problemTitle?: string;
  problemWorkaround?: string;
  workaround?: string;
  knownError?: boolean;
  aiSummary?: string;
  aiSummaryAt?: string;
  relatedIncidents?: RelatedIncident[];
  csatScore?: number;
  csatComment?: string;
  csatSource?: 'customer' | 'auto_timeout';
};

type AgentOption = {
  id: string;
  fullName: string;
  eligible?: boolean;
  reasons?: string[];
  openTickets?: number;
};
type AssetOption = { id: string; name: string; assetTag: string; type: string };
type GroupOption = {
  id: string;
  name: string;
  kind: string;
  tier?: 'l1' | 'l2' | 'l3';
  partyKind?: 'internal' | 'vendor' | 'principal';
  partyName?: string;
};

const statusTone: Record<TicketStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  open: 'info',
  in_progress: 'warning',
  waiting: 'info',
  hold: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

const priorityTone: Record<TicketPriority, 'success' | 'warning' | 'danger' | 'neutral'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

export function TicketDetail({ ticketId, currentUserId }: { ticketId: string; currentUserId: string }) {
  const { t } = useI18n();
  const [ticket, setTicket] = useState<TicketItem | null>(null);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [status, setStatus] = useState<TicketStatus>('open');
  const [assigneeId, setAssigneeId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [escalateGroupId, setEscalateGroupId] = useState('');
  const [pendingReason, setPendingReason] = useState<TicketPendingReason>('vendor');
  const [pendingNote, setPendingNote] = useState('');
  const [linkedAssetId, setLinkedAssetId] = useState('');
  const [ticketType, setTicketType] = useState<TicketType>('incident');
  const [comment, setComment] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [author, setAuthor] = useState('Agent');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [workaround, setWorkaround] = useState('');
  const [knownError, setKnownError] = useState(false);
  const [problemId, setProblemId] = useState('');
  const [parentTicketId, setParentTicketId] = useState('');
  const [resolveChildren, setResolveChildren] = useState(false);
  const [problems, setProblems] = useState<ProblemOption[]>([]);
  const [linkableIncidents, setLinkableIncidents] = useState<ProblemOption[]>([]);
  const [parentOptions, setParentOptions] = useState<MajorOption[]>([]);
  const [childOptions, setChildOptions] = useState<MajorOption[]>([]);

  const loadTicket = useCallback(async () => {
    const response = await fetch(`/api/tickets/${ticketId}`);
    const payload = await response.json();
    const nextTicket = payload.data as TicketItem | null;
    setTicket(nextTicket);
    if (nextTicket) {
      setStatus(nextTicket.status);
      setAssigneeId(nextTicket.assigneeId ?? '');
      setGroupId(nextTicket.groupId ?? '');
      setLinkedAssetId(nextTicket.assetId ?? '');
      setTicketType(isTicketType(nextTicket.type) ? nextTicket.type : 'incident');
      const nextType = isTicketType(nextTicket.type) ? nextTicket.type : 'incident';
      setPendingReason(nextTicket.pendingReason ?? defaultPendingReason(nextTicket.status, nextType) ?? 'vendor');
      setPendingNote(nextTicket.pendingNote ?? '');
      setWorkaround(nextTicket.workaround ?? '');
      setKnownError(Boolean(nextTicket.knownError));
      setProblemId(nextTicket.problemId ?? '');
      setParentTicketId(nextTicket.parentTicketId ?? '');
    }
  }, [ticketId]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    const accountId = ticket?.accountId;
    const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : '';
    if (!accountId) {
      setAssets([]);
      setGroups([]);
    } else {
      void fetch(`/api/assets${query}`)
        .then((response) => response.json())
        .then((payload) => setAssets(payload.data ?? []))
        .catch(() => setAssets([]));
      void fetch(`/api/org/groups${query}`)
        .then((response) => response.json())
        .then((payload) => setGroups(payload.data ?? []))
        .catch(() => setGroups([]));
    }
    void fetch(`/api/tickets/problems${query}`)
      .then((response) => response.json())
      .then((payload) => setProblems(payload.data ?? []))
      .catch(() => setProblems([]));
    const relatedQuery = new URLSearchParams();
    if (accountId) relatedQuery.set('accountId', accountId);
    relatedQuery.set('excludeId', ticketId);
    void fetch(`/api/tickets/related?kind=parents&${relatedQuery.toString()}`)
      .then((response) => response.json())
      .then((payload) => setParentOptions(payload.data ?? []))
      .catch(() => setParentOptions([]));
    void fetch(`/api/tickets/related?kind=children&${relatedQuery.toString()}`)
      .then((response) => response.json())
      .then((payload) => setChildOptions(payload.data ?? []))
      .catch(() => setChildOptions([]));
    void fetch('/api/tickets')
      .then((response) => response.json())
      .then((payload) => {
        const rows = (payload.data ?? []) as Array<ProblemOption & { type?: string; problemId?: string; accountId?: string }>;
        setLinkableIncidents(
          rows
            .filter((row) => row.type === 'incident' && !row.problemId && (!accountId || row.accountId === accountId))
            .map((row) => ({ id: row.id, number: row.number, title: row.title, status: row.status })),
        );
      })
      .catch(() => setLinkableIncidents([]));
  }, [ticket?.accountId, ticketId]);

  useEffect(() => {
    const accountId = ticket?.accountId;
    if (!accountId) {
      setAgents([]);
      return;
    }
    const params = new URLSearchParams({ accountId });
    if (groupId) params.set('groupId', groupId);
    void fetch(`/api/agents?${params.toString()}`)
      .then((response) => response.json())
      .then((payload) => setAgents(payload.data ?? []))
      .catch(() => setAgents([]));
  }, [groupId, ticket?.accountId]);

  useRealtimeTable('tickets', loadTicket);
  useRealtimeTable('ticket_comments', loadTicket);

  async function patchTicket(body: Record<string, unknown>) {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toastError(payload.error ?? t.common.saveFailed);
        return;
      }
      await loadTicket();
      const relatedQuery = new URLSearchParams();
      if (ticket?.accountId) relatedQuery.set('accountId', ticket.accountId);
      relatedQuery.set('excludeId', ticketId);
      void fetch(`/api/tickets/related?kind=parents&${relatedQuery.toString()}`)
        .then((response) => response.json())
        .then((next) => setParentOptions(next.data ?? []))
        .catch(() => undefined);
      void fetch(`/api/tickets/related?kind=children&${relatedQuery.toString()}`)
        .then((response) => response.json())
        .then((next) => setChildOptions(next.data ?? []))
        .catch(() => undefined);
      toastSuccess(t.tickets.updated);
    } catch {
      toastError(t.common.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddComment() {
    if (!comment.trim()) return;
    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, comment }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      toastError(payload.error ?? t.tickets.commentFailed);
      return;
    }
    setComment('');
    setEditorKey((value) => value + 1);
    await loadTicket();
    toastSuccess(t.tickets.commentAdded);
  }

  async function handleUpload(file: File) {
    setIsUploading(true);
    try {
      const uploaded = await uploadTicketFile(file);
      if (uploaded.error || !uploaded.data) {
        toastError(uploaded.error ?? t.tickets.uploadFailed);
        return;
      }

      const commentResponse = await fetch(`/api/tickets/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author,
          kind: 'attachment',
          attachment: uploaded.data,
        }),
      });
      if (!commentResponse.ok) {
        toastError(t.tickets.uploadFailed);
        return;
      }

      await loadTicket();
      toastSuccess(t.tickets.uploaded);
    } catch {
      toastError(t.tickets.uploadFailed);
    } finally {
      setIsUploading(false);
    }
  }

  if (!ticket) {
    return (
      <div className="grid gap-4 p-4 pb-24 md:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <Skeleton className="h-[480px] w-full" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    );
  }

  const type = isTicketType(ticket.type) ? ticket.type : 'incident';

  return (
    <div className="grid gap-4 p-4 pb-24 md:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
      <div className="space-y-5">
        <div>
          <Link href="/tickets" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> Tickets
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-semibold text-zinc-50">{displayTicketNumber(ticket.number, ticket.id)}</h1>
            <TypeBadge type={type} />
            {ticket.accountCode || ticket.accountName ? (
              <Badge tone="neutral">{ticket.accountCode ? `${ticket.accountCode} · ${ticket.accountName}` : ticket.accountName}</Badge>
            ) : null}
            <Badge tone={statusTone[ticket.status]}>{ticket.status.replace('_', ' ')}</Badge>
            <Badge tone={priorityTone[ticket.priority]}>{ticket.priority}</Badge>
            {(ticket.childTickets?.length ?? 0) > 0 ? <Badge tone="danger">{t.tickets.majorBadge}</Badge> : null}
            {ticket.parentTicketId ? <Badge tone="neutral">{t.tickets.childBadge}</Badge> : null}
          </div>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-50">{ticket.title}</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">{t.tickets.process}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProcessStrip type={type} status={ticket.status} onSelect={(next) => void patchTicket({ status: next })} />
            {type === 'change' ? (
              <Link href={`/cab/${ticket.id}`} className="mt-3 inline-flex text-xs text-blue-300 hover:text-blue-200">
                Open CAB record
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Description</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-zinc-300">
            {ticket.description ? <CommentHtml html={ticket.description} /> : 'No description provided.'}
          </CardContent>
        </Card>

        <TicketTasksPanel
          ticketId={ticketId}
          ticketType={type}
          accountId={ticket.accountId}
          groups={groups}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm text-zinc-400">AI summary</CardTitle>
              <Button
                size="sm"
                variant="outline"
                disabled={isSummarizing}
                onClick={() => {
                  setIsSummarizing(true);
                  void fetch(`/api/tickets/${ticketId}/summary`, { method: 'POST' })
                    .then(async (response) => {
                      const payload = await response.json().catch(() => ({}));
                      if (!response.ok) {
                        toastError(payload.error ?? t.common.saveFailed);
                        return;
                      }
                      toastSuccess(t.tickets.summarized);
                      await loadTicket();
                    })
                    .finally(() => setIsSummarizing(false));
                }}
              >
                {isSummarizing ? t.tickets.summarizing : t.tickets.summarize}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {ticket.aiSummary || t.tickets.summaryEmpty}
            {ticket.aiSummaryAt ? (
              <p className="mt-2 text-[11px] text-zinc-600">{formatRelativeId(ticket.aiSummaryAt)}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">{t.tickets.activity}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-500">
              Opened {formatRelativeId(ticket.createdAt)} by {ticket.requesterName}
            </div>
            {ticket.comments.map((item) => (
              <ActivityEntry key={item.id} item={item} />
            ))}
            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                placeholder={t.tickets.agentName}
              />
              <CommentEditor key={editorKey} value={comment} onChange={setComment} />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => void handleAddComment()} disabled={!comment.trim()}>
                  {t.tickets.addComment}
                </Button>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-blue-300">
                  <Paperclip className="h-3.5 w-3.5" />
                  {isUploading ? t.tickets.uploading : t.tickets.attachFile}
                  <input
                    type="file"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleUpload(file);
                      event.target.value = '';
                    }}
                  />
                </label>
              </div>
              <VisitReportForm ticketId={ticketId} author={author} onSaved={() => loadTicket()} />
            </div>
          </CardContent>
        </Card>

        <TicketAudit ticketId={ticketId} />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">{t.tickets.properties}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">SLA</p>
              <div className="mt-1">
                <SlaBadge
                  dueDate={ticket.dueDate}
                  status={ticket.status}
                  slaResponseAt={ticket.slaResponseAt}
                  slaResolveBy={ticket.slaResolveBy}
                  slaRespondedAt={ticket.slaRespondedAt}
                  slaPausedAt={ticket.slaPausedAt}
                  slaResponseMinutes={ticket.slaResponseMinutes}
                  slaResolveMinutes={ticket.slaResolveMinutes}
                />
              </div>
              {ticket.slaResponseAt ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Response {ticket.slaRespondedAt ? 'met' : 'due'}{' '}
                  {new Date(ticket.slaResponseAt).toLocaleString('id-ID')}
                </p>
              ) : null}
              {ticket.slaResolveBy || ticket.dueDate ? (
                <p className="text-xs text-zinc-500">
                  Resolve by {new Date(ticket.slaResolveBy || ticket.dueDate || '').toLocaleString('id-ID')}
                </p>
              ) : null}
              {ticket.slaPausedAt ? (
                <p className="text-xs text-sky-300">Paused {new Date(ticket.slaPausedAt).toLocaleString('id-ID')}</p>
              ) : null}
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">OLA</p>
                <div className="mt-1">
                  <OlaBadge
                    status={ticket.status}
                    olaResolveBy={ticket.olaResolveBy}
                    olaResponseAt={ticket.olaResponseAt}
                    olaResolveMinutes={ticket.olaResolveMinutes}
                    slaPausedAt={ticket.slaPausedAt}
                    ucName={ticket.ucName}
                  />
                </div>
                {ticket.ucName ? (
                  <p className="text-xs text-amber-300">
                    UC · {ticket.ucName}
                    {ticket.groupPartyName ? ` · ${ticket.groupPartyName}` : ''}
                  </p>
                ) : ticket.groupPartyKind && ticket.groupPartyKind !== 'internal' ? (
                  <p className="text-xs text-amber-300">
                    {ticket.groupPartyKind === 'principal' ? 'Principal' : 'Vendor'}
                    {ticket.groupPartyName ? ` · ${ticket.groupPartyName}` : ''}
                  </p>
                ) : null}
                {ticket.olaResolveBy ? (
                  <p className="text-xs text-zinc-500">
                    Group clock {new Date(ticket.olaResolveBy).toLocaleString('id-ID')}
                  </p>
                ) : null}
              </div>
              {ticket.pendingReason ? (
                <div className="mt-1">
                  <PendingBadge reason={ticket.pendingReason} note={ticket.pendingNote} />
                </div>
              ) : null}
              <Link href="/sla" className="mt-1 inline-block text-xs text-blue-300 hover:text-blue-200">
                {ticket.ucId ? 'SLA + UC' : 'Agreement'}
              </Link>
              {ticket.csatScore ? (
                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">CSAT</p>
                  <p className="mt-1 text-sm text-zinc-50">{ticket.csatScore}/5</p>
                  {ticket.csatSource === 'auto_timeout' ? (
                    <p className="text-xs text-zinc-500">{t.portal.csatAuto}</p>
                  ) : ticket.csatComment ? (
                    <p className="text-xs text-zinc-500">{ticket.csatComment}</p>
                  ) : null}
                </div>
              ) : ticket.status === 'resolved' || ticket.status === 'closed' ? (
                <p className="mt-3 text-xs text-zinc-500">{t.portal.csatWaiting}</p>
              ) : null}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.tickets.process}</p>
              <Select
                className="mt-1"
                value={ticketType}
                onChange={(event) => {
                  const next = event.target.value as TicketType;
                  setTicketType(next);
                  void patchTicket({ type: next });
                }}
              >
                {TICKET_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {t.tickets.type[item]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.tickets.requester}</p>
              <p className="mt-1 text-zinc-200">{ticket.requesterName}</p>
              {ticket.requesterEmail ? <p className="text-xs text-zinc-500">{ticket.requesterEmail}</p> : null}
              {ticket.requesterPhone ? <p className="text-xs text-zinc-500">{ticket.requesterPhone}</p> : null}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.tickets.assignee}</p>
              <Select className="mt-1" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
                <option value="">{t.tickets.unassigned}</option>
                {ticket.assigneeId && !agents.some((agent) => agent.id === ticket.assigneeId) ? (
                  <option value={ticket.assigneeId}>{ticket.assigneeName ?? ticket.assigneeId}</option>
                ) : null}
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.fullName}
                    {agent.eligible === false ? ` · ${(agent.reasons ?? []).join(', ') || 'unavailable'}` : ''}
                    {typeof agent.openTickets === 'number' ? ` (${agent.openTickets})` : ''}
                  </option>
                ))}
              </Select>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => void patchTicket({ assigneeId: assigneeId || null })}
                  disabled={isSaving}
                >
                  {t.tickets.saveAssignee}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() =>
                    void dispatchTicketAction(ticketId, true).then((result) => {
                      if (result.error) toastError(result.error);
                      else toastSuccess(t.tickets.updated);
                      void loadTicket();
                    })
                  }
                >
                  {t.wfm.assignNext}
                </Button>
                {currentUserId && ticket.assigneeId !== currentUserId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void patchTicket({ assigneeId: currentUserId })}
                    disabled={isSaving}
                  >
                    <UserPlus className="h-3.5 w-3.5" /> {t.tickets.me}
                  </Button>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.tickets.assignmentGroup}</p>
              <Select className="mt-1" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                <option value="">{t.tickets.none}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {formatGroupQueueLabel(group)}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => void patchTicket({ groupId: groupId || null })}
                disabled={isSaving}
              >
                {t.tickets.saveGroup}
              </Button>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.tickets.configurationItem}</p>
              <Select className="mt-1" value={linkedAssetId} onChange={(event) => setLinkedAssetId(event.target.value)}>
                <option value="">{t.tickets.none}</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.assetTag} · {asset.name}
                  </option>
                ))}
              </Select>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => void patchTicket({ assetId: linkedAssetId || null })}
                  disabled={isSaving}
                >
                  {t.tickets.saveCi}
                </Button>
                {ticket.assetId ? (
                  <Link href="/assets" className="text-xs text-blue-300 hover:text-blue-200">
                    Assets
                  </Link>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.tickets.category}</p>
              <p className="mt-1 text-zinc-200">{ticket.category || '—'}</p>
            </div>
            {ticket.catalogAnswers && Object.keys(ticket.catalogAnswers).length > 0 ? (
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.tickets.catalogAnswers}</p>
                <dl className="mt-1 space-y-1">
                  {Object.entries(ticket.catalogAnswers).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-3 text-xs">
                      <dt className="text-zinc-500">{key.replace(/_/g, ' ')}</dt>
                      <dd className="text-zinc-200">{value || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
            {ticket.dueDate ? (
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.tickets.due}</p>
                <p className="mt-1 text-zinc-200">{new Date(ticket.dueDate).toLocaleString('id-ID')}</p>
              </div>
            ) : null}
            {type === 'incident' || type === 'request' ? (
              <TicketMajor
                canBeParent={type === 'incident'}
                canBeChild={type === 'incident' || type === 'request'}
                parentTicketId={parentTicketId}
                parentNumber={ticket.parentNumber}
                parentTitle={ticket.parentTitle}
                childTickets={ticket.childTickets ?? []}
                parents={parentOptions}
                linkableChildren={childOptions}
                disabled={isSaving}
                onParentId={setParentTicketId}
                onSaveParent={() => void patchTicket({ parentTicketId: parentTicketId || null })}
                onLinkChild={(childId) => {
                  void fetch(`/api/tickets/${childId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ parentTicketId: ticket.id }),
                  }).then(async (response) => {
                    const payload = await response.json().catch(() => ({}));
                    if (!response.ok) {
                      toastError(payload.error ?? t.common.saveFailed);
                      return;
                    }
                    toastSuccess(t.tickets.updated);
                    await loadTicket();
                  });
                }}
              />
            ) : null}
            {type === 'problem' || type === 'incident' ? (
              <TicketRca
                isProblem={type === 'problem'}
                problemId={problemId}
                problemNumber={ticket.problemNumber}
                problemTitle={ticket.problemTitle}
                problemWorkaround={ticket.problemWorkaround}
                problems={problems.filter((item) => item.id !== ticket.id)}
                relatedIncidents={ticket.relatedIncidents ?? []}
                linkableIncidents={linkableIncidents}
                workaround={workaround}
                knownError={knownError}
                disabled={isSaving}
                onProblemId={setProblemId}
                onWorkaround={setWorkaround}
                onKnownError={setKnownError}
                onSaveProblem={() =>
                  void patchTicket(
                    type === 'problem'
                      ? { workaround: workaround.trim() || null, knownError }
                      : { problemId: problemId || null },
                  )
                }
                onLinkIncident={(incidentId) => {
                  void fetch(`/api/tickets/${incidentId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ problemId: ticket.id }),
                  }).then(async (response) => {
                    const payload = await response.json().catch(() => ({}));
                    if (!response.ok) {
                      toastError(payload.error ?? t.common.saveFailed);
                      return;
                    }
                    toastSuccess(t.tickets.updated);
                    await loadTicket();
                  });
                }}
              />
            ) : null}
            {ticket.status === 'resolved' || ticket.status === 'closed' ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={isSaving}
                onClick={() => {
                  void fetch('/api/knowledge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ticketId: ticket.id,
                      title: ticket.title,
                      body: ticket.aiSummary || ticket.description || ticket.title,
                      category: ticket.category,
                    }),
                  }).then(async (response) => {
                    const payload = await response.json().catch(() => ({}));
                    if (!response.ok) {
                      toastError(payload.error ?? t.common.saveFailed);
                      return;
                    }
                    toastSuccess(t.tickets.publishedKnowledge);
                  });
                }}
              >
                {t.tickets.publishKnowledge}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Update status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={status}
              onChange={(event) => {
                const next = event.target.value as TicketStatus;
                setStatus(next);
                const reason = defaultPendingReason(next, ticketType);
                if (reason) setPendingReason(reason);
              }}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting">Waiting</option>
              <option value="hold">Hold</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </Select>
            {isPauseStatus(status) ? (
              <>
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Reason</p>
                  <Select value={pendingReason} onChange={(event) => setPendingReason(event.target.value as TicketPendingReason)}>
                    <option value="customer">{pendingReasonLabel.customer}</option>
                    <option value="vendor">{pendingReasonLabel.vendor}</option>
                    <option value="change_freeze">{pendingReasonLabel.change_freeze}</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                    {pendingReason === 'vendor'
                      ? 'Vendor name'
                      : pendingReason === 'customer'
                        ? 'Customer / contact'
                        : 'Freeze note'}
                  </p>
                  <Input
                    value={pendingNote}
                    onChange={(event) => setPendingNote(event.target.value)}
                    placeholder={
                      pendingReason === 'vendor'
                        ? 'Cisco TAC · case 8821'
                        : pendingReason === 'customer'
                          ? 'Nama pemohon / yang ditunggu'
                          : 'Window Minggu 22:00'
                    }
                  />
                </div>
              </>
            ) : null}
            {(ticket.childTickets?.length ?? 0) > 0 && (status === 'resolved' || status === 'closed') ? (
              <label className="flex items-start gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={resolveChildren}
                  onChange={(event) => setResolveChildren(event.target.checked)}
                />
                <span>{t.tickets.resolveChildren}</span>
              </label>
            ) : null}
            <Button
              className="w-full"
              onClick={() =>
                void patchTicket({
                  status,
                  pendingReason: isPauseStatus(status) ? pendingReason : null,
                  pendingNote: isPauseStatus(status) ? pendingNote.trim() || null : null,
                  resolveChildren:
                    (ticket.childTickets?.length ?? 0) > 0 &&
                    (status === 'resolved' || status === 'closed') &&
                    resolveChildren,
                })
              }
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save status'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Escalate L2 / L3</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={escalateGroupId} onChange={(event) => setEscalateGroupId(event.target.value)}>
              <option value="">Select higher tier</option>
              {groups
                .filter((group) => group.tier === 'l2' || group.tier === 'l3')
                .map((group) => (
                  <option key={group.id} value={group.id}>
                    {formatGroupQueueLabel(group)}
                  </option>
                ))}
            </Select>
            <Button
              className="w-full"
              variant="outline"
              disabled={isSaving || !escalateGroupId}
              onClick={() => void patchTicket({ escalate: true, groupId: escalateGroupId })}
            >
              Escalate · SLA keeps running
            </Button>
            <p className="text-[11px] leading-5 text-zinc-500">
              L2/L3 stays In Progress. Pick an Internal, Vendor, or Principal group — that group&apos;s OLA starts.
              Use Hold only when nobody is working the ticket (wait for a case update).
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
