import { getAiConfigForTenant } from '@/lib/settings/integrations';
import { completeAiChat } from '@/lib/integrations/ai';
import { getReportSnapshot } from '@/lib/reports/actions';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';

const SYSTEM = `You are NovaCRM, an ITSM operations assistant for staff (admin/agent).
Answer in the same language as the user. Be concise and professional.
Use only the operations snapshot and ticket facts provided. If data is missing, say so.
Do not invent ticket numbers, SLA times, or asset tags.
Do not change tickets, approve changes, or send notifications — recommend the next action instead.
Never reveal API keys or secrets.`;

export async function runAssistant(messages: Array<{ role: 'user' | 'assistant'; content: string }>) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Ticket')) {
    return { data: null, error: 'Unauthorized' };
  }

  const ai = await getAiConfigForTenant(session.profile.tenantId);
  if (!ai) {
    return { data: null, error: 'AI is not connected. Open Settings → Integrations and test the AI key.' };
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
      { role: 'system', content: `${SYSTEM}\n\nOperations snapshot (last 7 days):\n${JSON.stringify(snapshot)}` },
      ...messages.slice(-12).map((item) => ({ role: item.role, content: item.content.slice(0, 4000) })),
    ],
  });

  if (!result.ok) {
    return { data: null, error: result.error };
  }
  return { data: { content: result.content }, error: null };
}
