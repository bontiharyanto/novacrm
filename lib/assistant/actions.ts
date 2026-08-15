import { getAiConfigForTenant } from '@/lib/settings/integrations';
import { completeAiChat } from '@/lib/integrations/ai';
import { getReportSnapshot } from '@/lib/reports/actions';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { upsertAssistantThread } from '@/lib/assistant/store';
import type { AssistantMessage } from '@/lib/assistant/schema';

function assistantSystemPrompt(locale: 'en' | 'id') {
  const language =
    locale === 'id'
      ? 'Reply entirely in Bahasa Indonesia. Keep ITSM terms (SLA, CAB, ticket numbers) as-is.'
      : 'Reply entirely in English.';
  return `You are NovaCRM, an ITSM operations assistant for staff (admin/agent).
${language}
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

  const report = await getReportSnapshot({ range: '7' });
  const snapshot = report
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

  const result = await completeAiChat({
    apiKey: ai.apiKey,
    baseUrl: ai.baseUrl,
    model: ai.model,
    messages: [
      {
        role: 'system',
        content: `${assistantSystemPrompt(locale)}\n\nOperations snapshot (last 7 days):\n${JSON.stringify(snapshot)}`,
      },
      ...messages.slice(-12).map((item) => ({ role: item.role, content: item.content.slice(0, 4000) })),
    ],
  });

  if (!result.ok) {
    return { data: null, error: result.error };
  }

  const content = result.content;
  const saved = await upsertAssistantThread({
    id: threadId,
    messages: [...messages, { role: 'assistant', content }],
  });

  return {
    data: { content, threadId: saved.data?.id ?? threadId ?? null },
    error: null,
  };
}
