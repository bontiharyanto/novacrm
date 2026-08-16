import { getAiConfigForTenant } from '@/lib/settings/integrations';
import { completeAiChat } from '@/lib/integrations/ai';
import { getReportSnapshot } from '@/lib/reports/actions';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { isCustomerRole } from '@/lib/rbac/roles';
import { createTicket, listTickets } from '@/lib/tickets/actions';
import { displayTicketNumber } from '@/lib/tickets/process';
import { lastProposedIssue, looksLikeIssue, resolvePortalIntake } from '@/lib/assistant/portal-intake';
import { buildDetailTemplate, DETAIL_FIELD_LABELS, hasCompleteDetails, missingDetails } from '@/lib/assistant/portal-details';
import { listPortalEstate, relatedEstate } from '@/lib/assistant/portal-estate';
import { listPortalTicketSuggestions } from '@/lib/assistant/portal-suggestions';
import { upsertAssistantThread } from '@/lib/assistant/store';
import type { AssistantMessage } from '@/lib/assistant/schema';
import { getDictionary } from '@/lib/i18n';

type PortalPlan = {
  action: 'reply' | 'propose_ticket' | 'ask';
  type: 'incident' | 'request';
  title: string;
  description: string;
  message: string;
};

type TicketProposal = {
  type: 'incident' | 'request';
  title: string;
  description: string;
};

function parsePortalPlan(raw: string): PortalPlan | null {
  const trimmed = raw.trim();
  const jsonSlice = trimmed.startsWith('{') ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonSlice) return null;
  try {
    const parsed = JSON.parse(jsonSlice) as Record<string, unknown>;
    const action =
      parsed.action === 'propose_ticket' || parsed.action === 'create_ticket'
        ? 'propose_ticket'
        : parsed.action === 'ask'
          ? 'ask'
          : 'reply';
    return {
      action,
      type: parsed.type === 'request' ? 'request' : 'incident',
      title: typeof parsed.title === 'string' ? parsed.title.trim().slice(0, 200) : '',
      description: typeof parsed.description === 'string' ? parsed.description.trim().slice(0, 5000) : '',
      message: typeof parsed.message === 'string' ? parsed.message.trim() : '',
    };
  } catch {
    return null;
  }
}

function languageLine(locale: 'en' | 'id') {
  return locale === 'id'
    ? 'Reply entirely in Bahasa Indonesia. Keep ITSM terms (SLA, CAB, ticket numbers) as-is.'
    : 'Reply entirely in English.';
}

function staffSystemPrompt(locale: 'en' | 'id') {
  return `You are NovaCRM, an ITSM operations assistant for staff (admin/agent).
${languageLine(locale)}
Be concise and professional.
Use only the operations snapshot and ticket facts provided. If data is missing, say so.
Do not invent ticket numbers, SLA times, or asset tags.
Do not change tickets, approve changes, or send notifications — recommend the next action instead.
Never reveal API keys or secrets.

Format with Markdown. Short paragraphs. Put each bullet on its own line:
* Item one
* Item two
Bold metric names like **SLA Breached**. Never put several bullets on one line.`;
}

function portalSystemPrompt(locale: 'en' | 'id') {
  return `You are NovaCRM portal assistant for a logged-in customer.
${languageLine(locale)}
You recommend a ticket first. The server creates it only after the customer confirms.
Use only the caller's own tickets and estate (assets/CMDB) in the snapshot. Never mention other requesters, agent queues, assignment groups, or desk-wide SLA.
Never invent ticket numbers. Never create problem or change tickets. Never reveal secrets.
Never propose a ticket from a language request, greeting, thanks, a question, a catalog request, or “not in the list”.

Return JSON only:
{"action":"reply"|"propose_ticket"|"ask","type":"incident"|"request","title":"","description":"","message":""}

Rules:
- Never propose_ticket until they gave: what failed, location, who is affected, and a contact number or email.
- Never propose from “not in the list”, greetings, language, catalog questions, or “not those CIs”.
- If the issue is named but details are missing, action=ask and list the missing fields. Do not offer to create the ticket yet.
- If they ask about the catalog, reply with the catalog names from the snapshot.
- incident = unplanned interruption. request = access or service request.
- Prefer estate CIs whose name matches the issue. Do not list unrelated CIs.
- If nothing in the estate matches and details are complete, still propose. Say they can create it without a linked asset/CI.
- message is always the customer-facing reply. Do not say the ticket is already created.`;
}

function formatProposal(
  locale: 'en' | 'id',
  proposal: TicketProposal,
  related: { name: string; type: string }[],
) {
  const copy = getDictionary(locale);
  const typeLabel = proposal.type === 'incident' ? 'Incident' : 'Request';
  const estate = related.length
    ? `\n\n${copy.assistant.proposalEstate}\n${related.map((item) => `* ${item.name} (${item.type})`).join('\n')}`
    : `\n\n${copy.assistant.proposalNoEstate}`;
  return `${copy.assistant.proposal
    .replace('{{type}}', typeLabel)
    .replace('{{title}}', proposal.title)}${estate}\n\n${copy.assistant.proposalConfirm}`;
}

export async function runAssistant(
  messages: AssistantMessage[],
  threadId?: string | null,
  locale: 'en' | 'id' = 'id',
) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return { data: null, error: 'Unauthorized' };
  }

  const ai = await getAiConfigForTenant(session.profile.tenantId);
  if (!ai) {
    return {
      data: null,
      error:
        locale === 'id'
          ? 'AI belum terhubung. Buka Settings → Integrasi, lalu tes kunci AI.'
          : 'AI is not connected. Open Settings → Integrations and test the AI key.',
    };
  }

  const copy = getDictionary(locale);
  const portal = isCustomerRole(session.profile.role);

  async function persist(nextMessages: AssistantMessage[]) {
    if (portal) return { data: { id: null as string | null } };
    return upsertAssistantThread({ id: threadId, messages: nextMessages });
  }

  if (portal) {
    const intake = resolvePortalIntake(messages);
    if (intake?.kind === 'confirm') {
      const proposed = lastProposedIssue(messages.slice(0, -1));
      if (!proposed) {
        const content = copy.assistant.intakeNeedIssue;
        const saved = await persist([...messages, { role: 'assistant', content }]);
        return { data: { content, threadId: saved.data?.id ?? null, intake: true }, error: null };
      }
      const estate = await listPortalEstate();
      const related = relatedEstate(proposed.title, estate);
      const note = related.length
        ? ''
        : locale === 'id'
          ? '\n\n[Ask AI] Tidak ada aset/CI yang cocok di akun pelanggan. Desk menindaklanjuti tanpa tautan CMDB.'
          : '\n\n[Ask AI] No matching asset/CI on the requester account. Desk will follow up without a CMDB link.';
      const created = await createTicket({
        title: proposed.title,
        description: `${proposed.description || proposed.title}${note}`,
        type: proposed.type,
        status: 'open',
        priority: proposed.type === 'incident' ? 'high' : 'medium',
        requesterName: session.profile.fullName,
      });
      const content = created.data
        ? copy.assistant.ticketCreated
            .replace('{{number}}', displayTicketNumber(created.data.number, created.data.id))
            .replace('{{url}}', `/portal/${created.data.id}`)
        : created.error ?? copy.assistant.ticketCreateFailed;
      const saved = await persist([...messages, { role: 'assistant', content }]);
      return {
        data: {
          content,
          threadId: saved.data?.id ?? null,
          intake: false,
          ticketId: created.data?.id ?? null,
        },
        error: null,
      };
    }
    if (intake?.kind === 'details') {
      const missing = missingDetails(intake.description);
      const fields = missing.length ? missing : (['location', 'impact', 'contact'] as const);
      const template = buildDetailTemplate([...fields], locale);
      const list = fields.map((field) => `* ${DETAIL_FIELD_LABELS[locale][field]}`).join('\n');
      const content = `${copy.assistant.intakeDetails}\n\n${list}\n\n${copy.assistant.intakeTemplateHint}\n\n\`\`\`\n${template}\n\`\`\``;
      const saved = await persist([...messages, { role: 'assistant', content }]);
      return { data: { content, threadId: saved.data?.id ?? null, intake: true, detailTemplate: template }, error: null };
    }
    if (intake?.kind === 'propose') {
      const estate = await listPortalEstate();
      const related = relatedEstate(intake.title, estate);
      const proposal: TicketProposal = {
        type: intake.type,
        title: intake.title,
        description: intake.description || intake.title,
      };
      const content = formatProposal(locale, proposal, related);
      const saved = await persist([...messages, { role: 'assistant', content }]);
      return {
        data: { content, threadId: saved.data?.id ?? null, intake: true, proposal },
        error: null,
      };
    }
    if (intake?.kind === 'catalog') {
      const items = await listPortalTicketSuggestions(locale);
      const list = items.map((item) => `* ${item.label}`).join('\n') || '—';
      const content = `${copy.assistant.catalogList}\n\n${list}`;
      const saved = await persist([...messages, { role: 'assistant', content }]);
      return { data: { content, threadId: saved.data?.id ?? null, intake: true }, error: null };
    }
    if (intake?.kind === 'ask') {
      const content = copy.assistant.intakeAsk;
      const saved = await persist([...messages, { role: 'assistant', content }]);
      return { data: { content, threadId: saved.data?.id ?? null, intake: true }, error: null };
    }
    if (intake?.kind === 'meta') {
      const content =
        intake.topic === 'language'
          ? copy.assistant.intakeLanguage
          : intake.topic === 'need_issue'
            ? copy.assistant.intakeNotInList
            : copy.assistant.intakeNeedIssue;
      const saved = await persist([...messages, { role: 'assistant', content }]);
      return { data: { content, threadId: saved.data?.id ?? null, intake: true }, error: null };
    }
  }

  const snapshot = portal
    ? {
        mine: (await listTickets()).slice(0, 20).map((row) => ({
          number: row.number,
          title: row.title,
          type: row.type,
          status: row.status,
          updatedAt: row.updatedAt,
        })),
        catalog: (await listPortalTicketSuggestions(locale)).map((item) => item.label),
        estate: (await listPortalEstate()).items.map((item) => ({
          name: item.name,
          type: item.type,
          domain: item.domain,
        })),
      }
    : await (async () => {
        const report = await getReportSnapshot({ range: '7' });
        return report
          ? {
              periodDays: report.rangeDays,
              kpis: report.kpis,
              byPriority: report.byPriority,
              byStatus: report.byStatus,
              aging: (report.aging ?? []).slice(0, 8).map((row) => ({
                number: row.number,
                title: row.title,
                status: row.status,
                ageDays: row.ageDays,
              })),
            }
          : { note: 'No report snapshot for the active account.' };
      })();

  const result = await completeAiChat({
    apiKey: ai.apiKey,
    baseUrl: ai.baseUrl,
    model: ai.model,
    json: portal,
    messages: [
      {
        role: 'system',
        content: `${portal ? portalSystemPrompt(locale) : staffSystemPrompt(locale)}\n\nSnapshot:\n${JSON.stringify(snapshot)}`,
      },
      ...messages.slice(-12).map((item) => ({ role: item.role, content: item.content.slice(0, 4000) })),
    ],
  });

  if (!result.ok) {
    return { data: null, error: result.error };
  }

  let content = result.content;
  let proposal: TicketProposal | undefined;
  if (portal) {
    const plan = parsePortalPlan(result.content);
    if (plan?.action === 'propose_ticket' && looksLikeIssue(plan.title) && hasCompleteDetails(plan.description || plan.title)) {
      const estate = await listPortalEstate();
      const related = relatedEstate(plan.title, estate);
      proposal = {
        type: plan.type,
        title: plan.title,
        description: plan.description || plan.title,
      };
      content = formatProposal(locale, proposal, related);
    } else if (plan?.action === 'propose_ticket') {
      content = plan.message || copy.assistant.intakeDetails;
    } else if (plan?.message) {
      content = plan.message;
    }
  }
  const saved = await persist([...messages, { role: 'assistant', content }]);

  return {
    data: { content, threadId: saved.data?.id ?? null, intake: Boolean(proposal), proposal, ticketId: null },
    error: null,
  };
}
