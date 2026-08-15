import { notifyTicketAssigned } from '@/lib/notifications/dispatcher';
import { dispatchTicket } from '@/lib/wfm/dispatch';

export type WfmDispatchJob = {
  tenantId: string;
  ticketId: string;
  force?: boolean;
};

export async function processWfmDispatchJob(payload: WfmDispatchJob) {
  const result = await dispatchTicket(payload.tenantId, payload.ticketId, { force: payload.force });
  if (!result.ok) return { ok: false, error: result.error ?? 'Dispatch failed' };
  if (!result.skipped && result.assigneeId) {
    await notifyTicketAssigned(payload.tenantId, payload.ticketId);
  }
  return { ok: true, skipped: result.skipped, assigneeId: result.assigneeId };
}
