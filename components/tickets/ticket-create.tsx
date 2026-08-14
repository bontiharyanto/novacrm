'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { TypeBadge } from '@/components/tickets/type-badge';
import { ProcessStrip } from '@/components/tickets/process-strip';
import { CommentEditor } from '@/components/tickets/comment-editor';
import {
  TICKET_TYPES,
  isTicketType,
  ticketTypeMeta,
  type TicketType,
} from '@/lib/tickets/process';
import type { TicketPriority } from '@/lib/tickets/schema';
import type { AccountRecord } from '@/lib/accounts/schema';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/layout/preferences-provider';
import { toastError, toastSuccess } from '@/components/ui/toast';

type AgentOption = { id: string; fullName: string };
type AssetOption = { id: string; name: string; assetTag: string; type: string };
type GroupOption = { id: string; name: string; kind: string };

function htmlToText(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

const PRIORITIES: Array<{ id: TicketPriority; label: string }> = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'critical', label: 'Critical' },
];

export function TicketCreate({
  currentUserId,
  accounts,
  defaultAccountId,
}: {
  currentUserId: string;
  accounts: AccountRecord[];
  defaultAccountId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const { t } = useI18n();

  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [accountId, setAccountId] = useState(defaultAccountId ?? (accounts.length === 1 ? accounts[0].id : ''));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ticketType, setTicketType] = useState<TicketType>(isTicketType(typeParam) ? typeParam : 'incident');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [requesterName, setRequesterName] = useState('Customer');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [changeType, setChangeType] = useState('normal');
  const [riskLevel, setRiskLevel] = useState('medium');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const meta = ticketTypeMeta[ticketType];
  const resolvedTitle = title.trim() || htmlToText(description).slice(0, 200);
  const backHref = ticketType ? `/tickets?type=${ticketType}` : '/tickets';
  const customerAccounts = accounts.filter((account) => account.type === 'customer');
  const internalAccounts = accounts.filter((account) => account.type === 'internal');

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === assetId),
    [assets, assetId],
  );

  useEffect(() => {
    void fetch('/api/agents')
      .then((response) => response.json())
      .then((payload) => setAgents(payload.data ?? []))
      .catch(() => setAgents([]));
  }, []);

  useEffect(() => {
    if (!accountId) {
      setAssets([]);
      setGroups([]);
      setAssetId('');
      setGroupId('');
      return;
    }
    const query = `?accountId=${encodeURIComponent(accountId)}`;
    void fetch(`/api/assets${query}`)
      .then((response) => response.json())
      .then((payload) => setAssets(payload.data ?? []))
      .catch(() => setAssets([]));
    void fetch(`/api/org/groups${query}`)
      .then((response) => response.json())
      .then((payload) => setGroups(payload.data ?? []))
      .catch(() => setGroups([]));
    setAssetId('');
    setGroupId('');
  }, [accountId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!accountId) {
      setError(t.tickets.needAccount);
      toastError(t.tickets.needAccount);
      return;
    }
    if (resolvedTitle.length < 3) {
      setError(t.tickets.needTitle);
      toastError(t.tickets.needTitle);
      return;
    }
    setIsSubmitting(true);
    setError('');

    const response = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: resolvedTitle,
        description: htmlToText(description) ? description : resolvedTitle,
        type: ticketType,
        accountId,
        requesterName,
        requesterEmail: requesterEmail || undefined,
        requesterPhone: requesterPhone || undefined,
        dueDate: dueDate || undefined,
        status: 'open',
        priority,
        assigneeId: assigneeId || undefined,
        groupId: groupId || undefined,
        assetId: assetId || undefined,
        changeType: ticketType === 'change' ? changeType : undefined,
        riskLevel: ticketType === 'change' ? riskLevel : undefined,
        plannedStart: ticketType === 'change' && plannedStart ? new Date(plannedStart).toISOString() : undefined,
        plannedEnd: ticketType === 'change' && plannedEnd ? new Date(plannedEnd).toISOString() : undefined,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.data?.id) {
      const message = payload.error ?? t.common.createFailed;
      setError(message);
      toastError(message);
      setIsSubmitting(false);
      return;
    }

    toastSuccess(t.tickets.created);
    router.push(`/tickets/${payload.data.id}`);
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex min-h-[calc(100vh-3.5rem)] flex-col"
    >
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={backHref} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
              <ArrowLeft className="h-3.5 w-3.5" /> Tickets
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-zinc-50">New {meta.label.toLowerCase()}</h1>
              <TypeBadge type={ticketType} />
            </div>
            <p className="mt-1 text-sm text-zinc-500">{meta.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => router.push(backHref)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t.tickets.creating : t.tickets.create}
            </Button>
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {TICKET_TYPES.map((type) => {
              const option = ticketTypeMeta[type];
              const selected = ticketType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTicketType(type)}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-left transition-all duration-200 ease-out hover:-translate-y-0.5',
                    selected
                      ? 'border-blue-500/40 bg-blue-500/10'
                      : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700',
                  )}
                >
                  <p className="font-mono text-[11px] text-zinc-500">{option.prefix}</p>
                  <p className="mt-1 text-sm font-medium text-zinc-50">{option.label}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-500">{option.description}</p>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <Label htmlFor="title">{t.tickets.shortDescription}</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t.tickets.shortDescription}
              required
              autoFocus
              className="mt-2 h-12 text-lg font-semibold"
            />
            <p className="mt-1.5 text-[11px] text-zinc-500">{t.tickets.shortDescriptionHint}</p>
            <p className="mb-2 mt-5 text-[11px] uppercase tracking-[0.16em] text-zinc-500">Details</p>
            <CommentEditor value={description} onChange={setDescription} minHeightClass="min-h-56" />
            {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
          </div>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="accountId">{t.accountPick.ticketAccount}</Label>
                <Select
                  id="accountId"
                  value={accountId}
                  required
                  onChange={(event) => setAccountId(event.target.value)}
                >
                  <option value="">{t.accountPick.required}</option>
                  {customerAccounts.length > 0 ? (
                    <optgroup label={t.accountPick.customer}>
                      {customerAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code ? `${account.code} · ${account.name}` : account.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {internalAccounts.length > 0 ? (
                    <optgroup label={t.accountPick.internal}>
                      {internalAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code ? `${account.code} · ${account.name}` : account.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </Select>
                <p className="text-[11px] text-zinc-500">{t.accountPick.ticketAccountHint}</p>
              </div>
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">Process</p>
                <ProcessStrip type={ticketType} status="open" />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Priority</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITIES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPriority(item.id)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ease-out hover:-translate-y-0.5',
                        priority === item.id
                          ? item.id === 'critical' || item.id === 'high'
                            ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                            : item.id === 'medium'
                              ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                              : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Assignment</p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setAssigneeId(currentUserId)}
                  disabled={!currentUserId}
                >
                  <UserPlus className="h-3.5 w-3.5" /> Assign to me
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assignee">Assignee</Label>
                <Select id="assignee" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
                  <option value="">Unassigned</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.fullName}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="group">Assignment group</Label>
                <Select id="group" value={groupId} onChange={(event) => setGroupId(event.target.value)} disabled={!accountId}>
                  <option value="">None</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due date</Label>
                <Input id="dueDate" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>
              {ticketType === 'change' ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Change type</Label>
                    <Select value={changeType} onChange={(event) => setChangeType(event.target.value)}>
                      <option value="standard">Standard</option>
                      <option value="normal">Normal</option>
                      <option value="emergency">Emergency</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Risk</Label>
                    <Select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
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
                </>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="asset">Configuration item</Label>
                <Select id="asset" value={assetId} onChange={(event) => setAssetId(event.target.value)} disabled={!accountId}>
                  <option value="">None</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.assetTag} · {asset.name}
                    </option>
                  ))}
                </Select>
                {selectedAsset ? (
                  <p className="text-[11px] text-zinc-500">{selectedAsset.type}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Requester</p>
              <div className="space-y-1.5">
                <Label htmlFor="requesterName">Name</Label>
                <Input id="requesterName" value={requesterName} onChange={(event) => setRequesterName(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="requesterEmail">Email</Label>
                <Input
                  id="requesterEmail"
                  type="email"
                  value={requesterEmail}
                  onChange={(event) => setRequesterEmail(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="requesterPhone">Phone / WhatsApp</Label>
                <Input
                  id="requesterPhone"
                  value={requesterPhone}
                  onChange={(event) => setRequesterPhone(event.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </motion.form>
  );
}
