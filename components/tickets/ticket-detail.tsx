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
import { PendingBadge } from '@/components/tickets/pending-badge';
import { TypeBadge } from '@/components/tickets/type-badge';
import { ProcessStrip } from '@/components/tickets/process-strip';
import { formatRelativeId } from '@/lib/utils/dates';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { CommentEditor, CommentHtml } from '@/components/tickets/comment-editor';
import { displayTicketNumber, isTicketType, TICKET_TYPES, ticketTypeMeta, type TicketType } from '@/lib/tickets/process';
import {
  defaultPendingReason,
  isPauseStatus,
  pendingReasonLabel,
  supportTierLabel,
  type TicketPendingReason,
} from '@/lib/tickets/pending';
import type { TicketPriority, TicketStatus } from '@/lib/tickets/schema';

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
  createdAt: string;
  comments: Array<{ id: string; author: string; comment: string; createdAt: string }>;
};

type AgentOption = { id: string; fullName: string };
type AssetOption = { id: string; name: string; assetTag: string; type: string };
type GroupOption = { id: string; name: string; kind: string; tier?: 'l1' | 'l2' | 'l3' };

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
    }
  }, [ticketId]);

  useEffect(() => {
    void loadTicket();
    void fetch('/api/agents')
      .then((response) => response.json())
      .then((payload) => setAgents(payload.data ?? []))
      .catch(() => setAgents([]));
    void fetch('/api/assets')
      .then((response) => response.json())
      .then((payload) => setAssets(payload.data ?? []))
      .catch(() => setAssets([]));
    void fetch('/api/org/groups')
      .then((response) => response.json())
      .then((payload) => setGroups(payload.data ?? []))
      .catch(() => setGroups([]));
  }, [loadTicket]);

  useRealtimeTable('tickets', loadTicket);
  useRealtimeTable('ticket_comments', loadTicket);

  async function patchTicket(body: Record<string, unknown>) {
    setIsSaving(true);
    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (response.ok) await loadTicket();
    setIsSaving(false);
  }

  async function handleAddComment() {
    if (!comment.trim()) return;
    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, comment }),
    });
    if (response.ok) {
      setComment('');
      setEditorKey((value) => value + 1);
      await loadTicket();
    }
  }

  async function handleUpload(file: File) {
    setIsUploading(true);
    const presign = await fetch('/api/storage/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' }),
    });
    const payload = await presign.json();
    if (!presign.ok || !payload.data?.url) {
      setIsUploading(false);
      return;
    }

    await fetch(payload.data.url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });

    await fetch(`/api/tickets/${ticketId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author,
        comment: `Attachment uploaded: ${file.name} (${payload.data.key})`,
      }),
    });

    await loadTicket();
    setIsUploading(false);
  }

  if (!ticket) {
    return (
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-[480px] w-full" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    );
  }

  const type = isTicketType(ticket.type) ? ticket.type : 'incident';

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <div>
          <Link href="/tickets" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> Tickets
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-semibold text-white">{displayTicketNumber(ticket.number, ticket.id)}</h1>
            <TypeBadge type={type} />
            <Badge tone={statusTone[ticket.status]}>{ticket.status.replace('_', ' ')}</Badge>
            <Badge tone={priorityTone[ticket.priority]}>{ticket.priority}</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-semibold text-white">{ticket.title}</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Process</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-500">
              Opened {formatRelativeId(ticket.createdAt)} by {ticket.requesterName}
            </div>
            {ticket.comments.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-zinc-400">
                  <span>{item.author}</span>
                  <span>{formatRelativeId(item.createdAt)}</span>
                </div>
                <CommentHtml html={item.comment} />
              </div>
            ))}
            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                placeholder="Agent name"
              />
              <CommentEditor key={editorKey} value={comment} onChange={setComment} />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => void handleAddComment()} disabled={!comment.trim()}>
                  Add comment
                </Button>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-blue-300">
                  <Paperclip className="h-3.5 w-3.5" />
                  {isUploading ? 'Uploading...' : 'Attach file'}
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
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Properties</CardTitle>
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
              {ticket.pendingReason ? (
                <div className="mt-1">
                  <PendingBadge reason={ticket.pendingReason} note={ticket.pendingNote} />
                </div>
              ) : null}
              <Link href="/sla" className="mt-1 inline-block text-xs text-blue-300 hover:text-blue-200">
                Agreement
              </Link>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Process</p>
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
                    {ticketTypeMeta[item].label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Requester</p>
              <p className="mt-1 text-zinc-200">{ticket.requesterName}</p>
              {ticket.requesterEmail ? <p className="text-xs text-zinc-500">{ticket.requesterEmail}</p> : null}
              {ticket.requesterPhone ? <p className="text-xs text-zinc-500">{ticket.requesterPhone}</p> : null}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Assignee</p>
              <Select className="mt-1" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
                <option value="">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.fullName}
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
                  Save assignee
                </Button>
                {currentUserId && ticket.assigneeId !== currentUserId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void patchTicket({ assigneeId: currentUserId })}
                    disabled={isSaving}
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Me
                  </Button>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Assignment group</p>
              <Select className="mt-1" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                <option value="">None</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.tier ? `${supportTierLabel[group.tier]} · ` : ''}
                    {group.name}
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
                Save group
              </Button>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Configuration item</p>
              <Select className="mt-1" value={linkedAssetId} onChange={(event) => setLinkedAssetId(event.target.value)}>
                <option value="">None</option>
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
                  Save CI
                </Button>
                {ticket.assetId ? (
                  <Link href="/assets" className="text-xs text-blue-300 hover:text-blue-200">
                    Assets
                  </Link>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Category</p>
              <p className="mt-1 text-zinc-200">{ticket.category || '—'}</p>
            </div>
            {ticket.catalogAnswers && Object.keys(ticket.catalogAnswers).length > 0 ? (
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Catalog answers</p>
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
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Due</p>
                <p className="mt-1 text-zinc-200">{new Date(ticket.dueDate).toLocaleString('id-ID')}</p>
              </div>
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
            <Button
              className="w-full"
              onClick={() =>
                void patchTicket({
                  status,
                  pendingReason: isPauseStatus(status) ? pendingReason : null,
                  pendingNote: isPauseStatus(status) ? pendingNote.trim() || null : null,
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
                    {supportTierLabel[group.tier!]} · {group.name}
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
              Internal L2/L3 stays In Progress and unassigns so the next queue can pick up. Use Hold only for vendor,
              customer wait, or change freeze.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
