'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { isTenantAdminRole, parseAppRole } from '@/lib/rbac/roles';
import { isLocale } from '@/lib/preferences';
import { getAiConfigForTenant } from '@/lib/settings/integrations';
import { completeAiChat } from '@/lib/integrations/ai';
import {
  defaultNotificationCopy,
  storedNotificationTemplatesSchema,
  TEMPLATE_PLACEHOLDERS,
  type StoredNotificationTemplates,
} from '@/lib/notifications/copy';
import { z } from 'zod';

const suggestionSchema = z.object({
  summary: z.string().trim().min(20).max(2000),
  templates: storedNotificationTemplatesSchema,
});

function canEditTemplates(role: string) {
  const parsed = parseAppRole(role);
  return isTenantAdminRole(parsed) && canRole(parsed, 'update', 'NotificationSettings');
}

function extractJsonObject(content: string): unknown | null {
  const trimmed = content.trim().replace(/^\uFEFF/, '');
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const attempts = [candidate];
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start >= 0 && end > start) attempts.push(candidate.slice(start, end + 1));
  for (const raw of attempts) {
    try {
      return JSON.parse(raw);
    } catch {
      try {
        return JSON.parse(raw.replace(/,\s*([}\]])/g, '$1'));
      } catch {
        continue;
      }
    }
  }
  return null;
}

function systemPrompt(locale: 'id' | 'en') {
  const language =
    locale === 'id'
      ? 'Tulis summary dan semua nilai template dalam Bahasa Indonesia. Istilah ITSM (SLA, CSAT, Incident, Problem, Change, CAB) tetap.'
      : 'Write the summary and every template value in English. Keep ITSM terms (SLA, CSAT, Incident, Problem, Change, CAB).';
  return `You are NovaCRM notification copywriter for a professional ITSM desk (Linear + ServiceNow tone).
${language}
Improve customer and assignee notification templates. Do not invent company names, people, emails, or phone numbers.
Keep these placeholders exactly when the field needs them: ${TEMPLATE_PLACEHOLDERS.join(' ')}
Rules:
- hello must include {{name}}
- created / statusChanged / commentAdded / assigned must include {{number}}
- csat and viewDetails must include {{url}}
- viewDetails tells the reader the ticket details are at the URL
- assigned is for the agent, not the customer
- telegramFallback and whatsappFallback stay short (max 3 lines)
- byType overrides only when the process needs a different tone (incident urgent, problem root-cause, request fulfillment, change CAB)
- complaint uses the request process
Return JSON only: { "summary": string, "templates": { ...keys, "byType": { "incident", "problem", "request", "change" } } }
summary: 3-5 sentences — current tone, gaps, and what you changed.`;
}

export async function suggestNotificationTemplates(locale: string, current: StoredNotificationTemplates) {
  const session = await getSessionProfile();
  if (!session || !canEditTemplates(session.profile.role)) {
    return { data: null, error: 'Hanya admin yang dapat meminta saran template.' };
  }
  if (!isLocale(locale)) {
    return { data: null, error: 'Locale tidak valid.' };
  }

  const ai = await getAiConfigForTenant(session.profile.tenantId);
  if (!ai) {
    return { data: null, error: 'Hubungkan AI di Settings → Integrasi terlebih dahulu.' };
  }

  const parsedCurrent = storedNotificationTemplatesSchema.safeParse(current ?? {});
  const stored = parsedCurrent.success ? parsedCurrent.data : {};
  const defaults = defaultNotificationCopy(locale);

  const messages = [
    { role: 'system' as const, content: systemPrompt(locale) },
    {
      role: 'user' as const,
      content: JSON.stringify({
        locale,
        defaults,
        currentDraft: stored,
        processes: ['incident', 'problem', 'request', 'change'],
      }),
    },
  ];

  let result = await completeAiChat({
    apiKey: ai.apiKey,
    baseUrl: ai.baseUrl,
    model: ai.model,
    maxTokens: 1600,
    json: true,
    messages,
  });
  if (!result.ok) {
    result = await completeAiChat({
      apiKey: ai.apiKey,
      baseUrl: ai.baseUrl,
      model: ai.model,
      maxTokens: 1600,
      messages,
    });
  }
  if (!result.ok) {
    return { data: null, error: result.error };
  }

  const raw = extractJsonObject(result.content);
  const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  const nestedTemplates =
    record && record.templates && typeof record.templates === 'object' && !Array.isArray(record.templates)
      ? record.templates
      : null;
  const { summary, templates: _ignored, ...flatTemplates } = record ?? {};
  const parsed = suggestionSchema.safeParse({
    summary,
    templates: nestedTemplates ?? flatTemplates,
  });
  if (!parsed.success) {
    return { data: null, error: 'AI tidak mengembalikan template yang valid. Coba lagi.' };
  }

  return {
    data: {
      summary: parsed.data.summary,
      templates: parsed.data.templates,
      model: result.model,
    },
    error: null,
  };
}
