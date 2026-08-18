'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { WfmNav } from '@/components/wfm/wfm-nav';
import { useI18n } from '@/components/layout/preferences-provider';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { formatDateLong, formatRelativeId } from '@/lib/utils/dates';
import {
  acceptShiftSwap,
  approveShiftSwap,
  createShiftSwap,
  rejectShiftSwap,
} from '@/lib/wfm/swap-actions';
import type { WfmRosterEntry, WfmShiftSwap, WfmSwapStatus } from '@/lib/wfm/schema';

type Staff = { id: string; fullName: string };
type Group = { id: string; name: string };

const statusTone: Record<WfmSwapStatus, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  pending_peer: 'info',
  pending_lead: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

export function WfmSwaps({
  swaps,
  groups,
  staff,
  roster,
  currentUserId,
  canRequest,
  canApprove,
}: {
  swaps: WfmShiftSwap[];
  groups: Group[];
  staff: Staff[];
  roster: WfmRosterEntry[];
  currentUserId: string;
  canRequest: boolean;
  canApprove: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  useRealtimeTable('wfm_shift_swaps', refresh);

  const statusLabel: Record<WfmSwapStatus, string> = {
    pending_peer: t.wfm.swapStatusPendingPeer,
    pending_lead: t.wfm.swapStatusPendingLead,
    approved: t.wfm.swapStatusApproved,
    rejected: t.wfm.swapStatusRejected,
    cancelled: t.wfm.swapStatusCancelled,
  };

  const counterparts = staff.filter((person) => person.id !== currentUserId);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [counterpartId, setCounterpartId] = useState(counterparts[0]?.id ?? '');
  const [requesterDate, setRequesterDate] = useState('');
  const [counterpartDate, setCounterpartDate] = useState('');
  const [note, setNote] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const myDates = useMemo(
    () =>
      roster
        .filter((entry) => entry.userId === currentUserId && (!groupId || entry.groupId === groupId))
        .sort((a, b) => a.workDate.localeCompare(b.workDate)),
    [roster, currentUserId, groupId],
  );
  const theirDates = useMemo(
    () =>
      roster
        .filter((entry) => entry.userId === counterpartId && (!groupId || entry.groupId === groupId))
        .sort((a, b) => a.workDate.localeCompare(b.workDate)),
    [roster, counterpartId, groupId],
  );

  async function submitRequest() {
    if (!groupId || !counterpartId || !requesterDate || !counterpartDate) {
      toastError(t.wfm.swapFailed);
      return;
    }
    setPendingId('create');
    try {
      const result = await createShiftSwap({
        groupId,
        counterpartId,
        requesterDate,
        counterpartDate,
        note,
      });
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess(t.wfm.swapCreated);
      setNote('');
      router.refresh();
    } catch {
      toastError(t.wfm.swapFailed);
    } finally {
      setPendingId(null);
    }
  }

  async function runAction(id: string, kind: 'accept' | 'reject' | 'approve') {
    setPendingId(id);
    try {
      const payload = { id, note: decisionNote };
      const result =
        kind === 'accept'
          ? await acceptShiftSwap(payload)
          : kind === 'approve'
            ? await approveShiftSwap(payload)
            : await rejectShiftSwap(payload);
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess(
        kind === 'accept' ? t.wfm.swapAccepted : kind === 'approve' ? t.wfm.swapApproved : t.wfm.swapRejected,
      );
      setDecisionNote('');
      router.refresh();
    } catch {
      toastError(t.wfm.swapFailed);
    } finally {
      setPendingId(null);
    }
  }

  function dateLabel(value: string) {
    return formatDateLong(`${value}T12:00:00`, locale);
  }

  return (
    <div className="space-y-8 p-6">
      <WfmNav />
      <p className="text-sm text-zinc-500">
        {t.wfm.swapsHint}
        {canApprove ? (
          <>
            {' '}
            <Link href="/reports" className="text-zinc-300 transition-colors hover:text-zinc-50">
              {t.wfm.swapsReportLink}
            </Link>
          </>
        ) : null}
      </p>

      {canRequest ? (
        <section className="rounded-xl border border-zinc-800 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-50">{t.wfm.swapRequest}</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="">{t.nav.organization}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
            <Select value={counterpartId} onChange={(event) => setCounterpartId(event.target.value)}>
              <option value="">{t.wfm.swapPeer}</option>
              {counterparts.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName}
                </option>
              ))}
            </Select>
            <Select value={requesterDate} onChange={(event) => setRequesterDate(event.target.value)}>
              <option value="">{t.wfm.swapMyDate}</option>
              {myDates.map((entry) => (
                <option key={entry.id} value={entry.workDate}>
                  {entry.workDate} · {entry.templateName}
                </option>
              ))}
            </Select>
            <Select value={counterpartDate} onChange={(event) => setCounterpartDate(event.target.value)}>
              <option value="">{t.wfm.swapTheirDate}</option>
              {theirDates.map((entry) => (
                <option key={entry.id} value={entry.workDate}>
                  {entry.workDate} · {entry.templateName}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            className="mt-3"
            rows={2}
            maxLength={240}
            placeholder={t.wfm.swapNote}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="mt-3">
            <Button size="sm" disabled={pendingId === 'create'} onClick={() => void submitRequest()}>
              {t.wfm.swapSubmit}
            </Button>
          </div>
        </section>
      ) : null}

      <section>
        {canApprove ? (
          <Textarea
            className="mb-3 max-w-xl"
            rows={2}
            maxLength={240}
            placeholder={t.wfm.swapDecisionNote}
            value={decisionNote}
            onChange={(event) => setDecisionNote(event.target.value)}
          />
        ) : null}
        {swaps.length === 0 ? (
          <p className="rounded-xl border border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
            {t.wfm.swapEmpty}
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{t.wfm.agent}</th>
                  <th className="px-3 py-2 font-medium">{t.wfm.swapPeer}</th>
                  <th className="px-3 py-2 font-medium">{t.wfm.swapMyDate}</th>
                  <th className="px-3 py-2 font-medium">{t.wfm.swapTheirDate}</th>
                  <th className="px-3 py-2 font-medium">{t.wfm.status}</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {swaps.map((swap) => {
                  const busy = pendingId === swap.id;
                  const isPeer = swap.counterpartId === currentUserId && swap.status === 'pending_peer';
                  const isOwner =
                    swap.requesterId === currentUserId &&
                    (swap.status === 'pending_peer' || swap.status === 'pending_lead');
                  const isLead = canApprove && (swap.status === 'pending_peer' || swap.status === 'pending_lead');
                  return (
                    <tr key={swap.id} className="border-b border-zinc-800/80 last:border-0">
                      <td className="px-3 py-2.5 text-zinc-50">
                        {swap.requesterName}
                        <p className="font-mono text-[11px] text-zinc-500">
                          {formatRelativeId(swap.createdAt, locale)}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-300">{swap.counterpartName}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">
                        {dateLabel(swap.requesterDate)}
                        <p className="text-zinc-500">
                          {swap.requesterTemplateName} {swap.requesterHours}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">
                        {dateLabel(swap.counterpartDate)}
                        <p className="text-zinc-500">
                          {swap.counterpartTemplateName} {swap.counterpartHours}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={statusTone[swap.status]}>{statusLabel[swap.status]}</Badge>
                        {swap.groupName ? (
                          <p className="mt-1 text-[11px] text-zinc-500">{swap.groupName}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap justify-end gap-1">
                          {isPeer ? (
                            <>
                              <Button size="sm" disabled={busy} onClick={() => void runAction(swap.id, 'accept')}>
                                {t.wfm.swapAccept}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => void runAction(swap.id, 'reject')}
                              >
                                {t.wfm.swapReject}
                              </Button>
                            </>
                          ) : null}
                          {isOwner && !isPeer ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => void runAction(swap.id, 'reject')}
                            >
                              {t.wfm.swapCancel}
                            </Button>
                          ) : null}
                          {isLead && swap.status === 'pending_lead' ? (
                            <>
                              <Button size="sm" disabled={busy} onClick={() => void runAction(swap.id, 'approve')}>
                                {t.wfm.swapApprove}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => void runAction(swap.id, 'reject')}
                              >
                                {t.wfm.swapReject}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
