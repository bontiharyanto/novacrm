import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { dispatchTicketNotification } from '@/lib/notifications/dispatcher';
import { sendWhatsApp } from '@/lib/integrations/whatsapp';
import { sendTelegram } from '@/lib/integrations/telegram';
import { orderedActionNodes, triggerMatches, definitionFromLegacy } from '@/lib/workflows/graph';
import type { WorkflowDefinition, WorkflowEvent } from '@/lib/workflows/schema';
import type { TicketStatus } from '@/lib/tickets/schema';
import { dispatchTicket, resolveInboundGroupId } from '@/lib/wfm/dispatch';

export type WorkflowJobPayload = {
  tenantId: string;
  ruleId: string;
  ruleName: string;
  event: WorkflowEvent;
  ticketId: string;
  ticket: {
    id: string;
    number?: string;
    title: string;
    type?: string;
    status: string;
    priority?: string;
    accountId?: string;
    requesterName?: string;
    requesterEmail?: string;
    requesterPhone?: string;
    assigneeId?: string;
    assigneeName?: string;
    assigneeChatId?: string;
    category?: string;
  };
};

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'waiting', 'hold', 'resolved', 'closed'];

export async function processWorkflowJob(payload: WorkflowJobPayload): Promise<{
  ok: boolean;
  skipped?: boolean;
  error?: string;
  results?: Array<{ action: string; ok: boolean; detail?: string }>;
}> {
  if (!hasServiceRole()) {
    return { ok: false, error: 'Service role is required to run workflows' };
  }

  const supabase = createSupabaseAdminClient();
  const { data: rule } = await supabase
    .from('workflow_rules')
    .select('*')
    .eq('id', payload.ruleId)
    .eq('tenant_id', payload.tenantId)
    .eq('is_active', true)
    .maybeSingle();

  if (!rule) {
    return { ok: true, skipped: true };
  }

  const definition = (rule.definition?.nodes?.length
    ? rule.definition
    : definitionFromLegacy(rule.event, rule.action, rule.target)) as WorkflowDefinition;

  if (!triggerMatches(definition, payload.event, payload.ticket)) {
    return { ok: true, skipped: true };
  }

  const actions = orderedActionNodes(definition, payload.event, payload.ticket);
  const results: Array<{ action: string; ok: boolean; detail?: string }> = [];

  for (const node of actions) {
    const action = node.data.action;
    const target = node.data.target?.trim() || rule.target || '';
    try {
      if (action === 'send_email') {
        const notifyEvent =
          payload.event === 'ticket.status_change' || payload.event === 'ticket.comment_add'
            ? payload.event
            : 'ticket.create';
        await dispatchTicketNotification({
          event: notifyEvent,
          ticket: {
            id: payload.ticket.id,
            number: payload.ticket.number,
            type: payload.ticket.type,
            title: payload.ticket.title,
            status: payload.ticket.status,
            requesterName: payload.ticket.requesterName,
            requesterEmail: payload.ticket.requesterEmail,
            assigneeId: payload.ticket.assigneeId,
            assigneeName: payload.ticket.assigneeName,
            tenantId: payload.tenantId,
          },
          message: `[Flow] ${payload.ruleName}`,
        });
        results.push({ action, ok: true, detail: target || 'requester' });
        continue;
      }

      if (action === 'assign') {
        const uuidTarget = /^[0-9a-f-]{36}$/i.test(target);
        if (!uuidTarget) {
          const { data: ticketRow } = await supabase
            .from('tickets')
            .select('id, group_id, assignee_id')
            .eq('id', payload.ticketId)
            .eq('tenant_id', payload.tenantId)
            .maybeSingle();
          let groupId = ticketRow?.group_id as string | null | undefined;
          if (!groupId) {
            groupId = await resolveInboundGroupId(supabase, payload.tenantId);
            if (groupId) {
              await supabase.from('tickets').update({ group_id: groupId }).eq('id', payload.ticketId).eq('tenant_id', payload.tenantId);
            }
          }
          const dispatched = await dispatchTicket(payload.tenantId, payload.ticketId, { client: supabase, force: true });
          results.push({
            action,
            ok: dispatched.ok,
            detail: dispatched.assigneeName ?? dispatched.error ?? (dispatched.skipped ? 'skipped' : 'wfm'),
          });
          continue;
        }
        const assigneeId = target;
        if (assigneeId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, telegram_chat_id')
            .eq('id', assigneeId)
            .eq('tenant_id', payload.tenantId)
            .maybeSingle();
          if (profile) {
            await supabase
              .from('tickets')
              .update({
                assignee_id: profile.id,
                assignee_name: profile.full_name,
                assignee_chat_id: profile.telegram_chat_id,
              })
              .eq('id', payload.ticketId)
              .eq('tenant_id', payload.tenantId);
            results.push({ action, ok: true, detail: profile.full_name });
          } else {
            results.push({ action, ok: false, detail: 'Assignee not found' });
          }
        } else {
          results.push({ action, ok: false, detail: 'No agent available' });
        }
        continue;
      }

      if (action === 'change_status') {
        const status = (STATUSES.includes(target as TicketStatus) ? target : 'in_progress') as TicketStatus;
        await supabase
          .from('tickets')
          .update({ status })
          .eq('id', payload.ticketId)
          .eq('tenant_id', payload.tenantId);
        results.push({ action, ok: true, detail: status });
        continue;
      }

      if (action === 'create_asset') {
        const type = /^[a-z0-9_]{1,40}$/.test(target) ? target : 'laptop';
        const tag = `AST-WF${Date.now().toString().slice(-5)}`;
        let accountId = payload.ticket.accountId;
        if (!accountId) {
          const { data: ticketRow } = await supabase
            .from('tickets')
            .select('account_id')
            .eq('id', payload.ticketId)
            .maybeSingle();
          accountId = ticketRow?.account_id ?? undefined;
        }
        if (!accountId) {
          results.push({ action, ok: false, detail: 'Ticket has no account' });
          continue;
        }
        await supabase.from('assets').insert({
          tenant_id: payload.tenantId,
          account_id: accountId,
          name: payload.ticket.title.slice(0, 80),
          asset_tag: tag,
          type,
          status: 'active',
          notes: { text: `Created by workflow ${payload.ruleName}` },
        });
        results.push({ action, ok: true, detail: tag });
        continue;
      }

      if (action === 'create_ticket') {
        results.push({ action, ok: true, detail: payload.ticketId ? 'ticket already open' : 'skipped' });
        continue;
      }

      if (action === 'send_whatsapp') {
        const phone = payload.ticket.requesterPhone;
        if (!phone) {
          results.push({ action, ok: false, detail: 'No requester phone' });
          continue;
        }
        const sent = await sendWhatsApp(
          phone,
          `[Flow] ${payload.ruleName}: ${payload.ticket.title} is ${payload.ticket.status}`,
        );
        results.push({ action, ok: sent.ok, detail: sent.error ?? phone });
        continue;
      }

      if (action === 'send_telegram') {
        const chatId = payload.ticket.assigneeChatId;
        if (!chatId) {
          results.push({ action, ok: false, detail: 'No Telegram chat' });
          continue;
        }
        const sent = await sendTelegram(
          chatId,
          `[Flow] ${payload.ruleName}: ${payload.ticket.title} is ${payload.ticket.status}`,
        );
        results.push({ action, ok: sent.ok, detail: sent.error ?? chatId });
      }
    } catch (error) {
      results.push({
        action: action ?? 'unknown',
        ok: false,
        detail: error instanceof Error ? error.message : 'failed',
      });
    }
  }

  const failed = results.some((item) => !item.ok);
  const { error: logError } = await supabase.from('workflow_runs').insert({
    tenant_id: payload.tenantId,
    rule_id: payload.ruleId,
    ticket_id: payload.ticketId,
    event: payload.event,
    status: failed ? 'failed' : 'sent',
    result: { steps: results },
  });

  if (logError) {
    return { ok: false, error: logError.message, results };
  }

  return { ok: true, results };
}
