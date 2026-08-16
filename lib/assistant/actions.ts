import { getAiConfigForTenant } from '@/lib/settings/integrations';
import { completeAiChat } from '@/lib/integrations/ai';
import { getReportSnapshot } from '@/lib/reports/actions';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { isCustomerRole } from '@/lib/rbac/roles';
import { createTicket, listTickets } from '@/lib/tickets/actions';
import { displayTicketNumber } from '@/lib/tickets/process';
import { resolvePortalIntake } from '@/lib/assistant/portal-intake';
import { upsertAssistantThread } from '@/lib/assistant/store';
import type { AssistantMessage } from '@/lib/assistant/schema';

type PortalPlan = {
  action: 'reply' | 'create_ticket' | 'ask';
  type: 'incident' | 'request';
  title: string;
  description: string;
  message: string;
};

function parsePortalPlan(raw: string): PortalPlan | null {
  const trimmed = raw.trim();
  const jsonSlice = trimmed.startsWith('{') ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonSlice) return null;
  try {
    const parsed = JSON.parse(jsonSlice) as Record<string, unknown>;
    const action = parsed.action === 'create_ticket' || parsed.action === 'ask' ? parsed.action : 'reply';
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
You can create a ticket for them. The server assigns the real ticket number after create.
Use only the caller's own tickets in the snapshot. Never mention other requesters, agent queues, assignment groups, or desk-wide SLA.
Never invent ticket numbers. Never create problem or change tickets. Never reveal secrets.

Return JSON only:
{"action":"reply"|"create_ticket"|"ask","type":"incident"|"request","title":"","description":"","message":""}

Rules:
- create_ticket when they want a ticket and title is a specific issue (3+ characters), e.g. "VPN tidak connect".
- ask when they say "buat tiket" / "create a ticket" but give no issue — ask what is broken or what they need.
- incident = unplanned interruption. request = access or service request.
- message is always the customer-facing reply. Do not put a ticket number in message.`;
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

  const portal = isCustomerRole(session.profile.role);
  if (portal) {
    const intake = resolvePortalIntake(messages);
    if (intake?.kind === 'create') {
      const created = await createTicket({
        title: intake.title,
        description: intake.description || intake.title,
        type: intake.type,
        status: 'open',
        priority: intake.type === 'incident' ? 'high' : 'medium',
        requesterName: session.profile.fullName,
      });
      const content = created.data
        ? locale === 'id'
          ? `Tiket **${displayTicketNumber(created.data.number, created.data.id)}** sudah dibuat. [Buka tiket](/portal/${created.data.id})`
          : `Ticket **${displayTicketNumber(created.data.number, created.data.id)}** is created. [Open ticket](/portal/${created.data.id})`
        : created.error ??
          (locale === 'id' ? 'Tiket belum bisa dibuat. Coba lagi atau gunakan Permintaan baru.' : 'The ticket could not be created.');
      const saved = await upsertAssistantThread({
        id: threadId,
        messages: [...messages, { role: 'assistant', content }],
      });
      return { data: { content, threadId: saved.data?.id ?? threadId ?? null, intake: false }, error: null };
    }
    if (intake?.kind === 'ask') {
      const content =
        locale === 'id'
          ? intake.type === 'request'
            ? 'Siap. Tulis judul request-nya, contoh: reset password email.'
            : 'Siap. Tulis singkat gangguan-nya, contoh: VPN tidak connect dari kantor.'
          : intake.type === 'request'
            ? 'Ready. Send a short request title, for example: reset email password.'
            : 'Ready. Describe the incident, for example: VPN cannot connect from the office.';
      const saved = await upsertAssistantThread({
        id: threadId,
        messages: [...messages, { role: 'assistant', content }],
      });
      return { data: { content, threadId: saved.data?.id ?? threadId ?? null, intake: true }, error: null };
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
  if (portal) {
    const plan = parsePortalPlan(result.content);
    if (plan?.action === 'create_ticket' && plan.title.length >= 3) {
      const created = await createTicket({
        title: plan.title,
        description: plan.description || plan.title,
        type: plan.type,
        status: 'open',
        priority: plan.type === 'incident' ? 'high' : 'medium',
        requesterName: session.profile.fullName,
      });
      if (created.error || !created.data) {
        content =
          plan.message ||
          (locale === 'id' ? 'Tiket belum bisa dibuat. Coba lagi atau gunakan Permintaan baru.' : 'The ticket could not be created. Try again or use New request.');
        if (created.error) {
          content = `${content}\n\n${created.error}`;
        }
      } else {
        const number = displayTicketNumber(created.data.number, created.data.id);
        const createdLine =
          locale === 'id'
            ? `Tiket **${number}** sudah dibuat. [Buka tiket](/portal/${created.data.id})`
            : `Ticket **${number}** is created. [Open ticket](/portal/${created.data.id})`;
        content = [plan.message, createdLine].filter(Boolean).join('\n\n');
      }
    } else if (plan?.message) {
      content = plan.message;
    }
  }
  const saved = await upsertAssistantThread({
    id: threadId,
    messages: [...messages, { role: 'assistant', content }],
  });

  return {
    data: { content, threadId: saved.data?.id ?? threadId ?? null, intake: false },
    error: null,
  };
}
