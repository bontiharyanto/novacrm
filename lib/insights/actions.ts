'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAccountId } from '@/lib/accounts/scope';
import { getAiConfigForTenant } from '@/lib/settings/integrations';
import { completeAiChat } from '@/lib/integrations/ai';
import {
  INSIGHT_KINDS,
  insightKindSchema,
  type InsightCard,
  type InsightKind,
  type InsightsBoard,
} from '@/lib/insights/schema';
import { gatherInsightSignals } from '@/lib/insights/signals';
import { audienceForRole, composeNarrative, payloadForKind, snapshotCard } from '@/lib/insights/copy';
import { parseNarrative, sanitizeInsightCard } from '@/lib/insights/parse';

function insightSystemPrompt(locale: 'en' | 'id') {
  const language =
    locale === 'id'
      ? 'Write title, summary, and body entirely in Bahasa Indonesia. Do not use English sentences. Keep ITSM terms (SLA, CAB, ticket numbers) as-is.'
      : 'Write title, summary, and body entirely in English.';
  return `You are NovaCRM Insights. Write short professional ITSM briefs for staff.
Use only the provided signals. Those numbers are ground truth — never contradict them.
If slaBreached is 7, say 7 are breached. Never claim the queue is healthy when a count is above zero.
Never invent ticket numbers, names, emails, or phone numbers. No PII. No secrets.
${language}
title: one line, include the live counts.
summary: one sentence describing the metric, same language as title.
body: 2-4 plain sentences. Never empty. Never JSON. No markdown fences.
severity: info | success | warning | danger — danger if any breach or over-cap.
Return a JSON object only.`;
}

function mapRow(row: {
  kind: string;
  title: string;
  summary: string;
  body: string;
  severity: string;
  source: string;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  latency_ms: number | null;
  created_at: string;
}): InsightCard | null {
  const kind = insightKindSchema.safeParse(row.kind);
  if (!kind.success) return null;
  const severity =
    row.severity === 'success' || row.severity === 'warning' || row.severity === 'danger' ? row.severity : 'info';
  const source = row.source === 'ai' ? 'ai' : 'snapshot';
  return {
    kind: kind.data,
    title: row.title,
    summary: row.summary,
    body: row.body,
    severity,
    source,
    model: row.model,
    tokensIn: row.tokens_in ?? 0,
    tokensOut: row.tokens_out ?? 0,
    latencyMs: row.latency_ms ?? 0,
    generatedAt: row.created_at,
  };
}

async function loadStored(kind: InsightKind, tenantId: string, accountId: string | null) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('ai_insights')
    .select('kind, title, summary, body, severity, source, model, tokens_in, tokens_out, latency_ms, created_at')
    .eq('tenant_id', tenantId)
    .eq('kind', kind)
    .order('created_at', { ascending: false })
    .limit(1);
  query = accountId ? query.eq('account_id', accountId) : query.is('account_id', null);
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return mapRow(data);
}

async function persistCard(
  card: InsightCard,
  tenantId: string,
  accountId: string | null,
  userId: string,
  payload: unknown,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('ai_insights').insert({
    tenant_id: tenantId,
    account_id: accountId,
    kind: card.kind,
    title: card.title,
    summary: card.summary,
    body: card.body,
    severity: card.severity,
    source: card.source,
    model: card.model,
    tokens_in: card.tokensIn,
    tokens_out: card.tokensOut,
    latency_ms: card.latencyMs,
    payload,
    created_by: userId,
  });
  if (error) return;
}

export async function getInsightsBoard(): Promise<InsightsBoard | null> {
  const session = await getSessionProfile();
  if (!session || !(await canAccessConfiguredCapability('read', 'OperationsInsights'))) return null;

  const signals = await gatherInsightSignals();
  if (!signals) return null;

  const scoped = await requireAccountId(session);
  const cards = await Promise.all(
    INSIGHT_KINDS.map(async (kind) => {
      const stored = await loadStored(kind, session.profile.tenantId, scoped.accountId);
      if (!stored) return snapshotCard(kind, signals);
      const cleaned = sanitizeInsightCard(stored);
      const narrative = composeNarrative(kind, signals, {
        title: cleaned.title,
        summary: cleaned.summary,
        body: cleaned.body,
        severity: cleaned.severity,
      });
      return { ...cleaned, ...narrative };
    }),
  );

  return {
    cards,
    aiConfigured: signals.aiConfigured,
    viewingAll: signals.viewingAll,
    accountCode: signals.accountCode,
    role: signals.role,
  };
}

export async function generateInsight(
  kindInput: InsightKind,
  localeOverride?: 'en' | 'id',
): Promise<{ data: InsightCard | null; error: string | null }> {
  const kind = insightKindSchema.parse(kindInput);
  const session = await getSessionProfile();
  if (!session || !(await canAccessConfiguredCapability('read', 'OperationsInsights'))) {
    return { data: null, error: 'Unauthorized' };
  }

  const signals = await gatherInsightSignals();
  if (!signals) return { data: null, error: 'Unable to load desk signals' };
  if (localeOverride) signals.locale = localeOverride;

  const scoped = await requireAccountId(session);
  const fallback = composeNarrative(kind, signals, null);
  const payload = payloadForKind(kind, signals);
  const ai = await getAiConfigForTenant(session.profile.tenantId);

  let card: InsightCard = {
    kind,
    ...fallback,
    source: 'snapshot',
    model: 'snapshot',
    tokensIn: 0,
    tokensOut: 0,
    latencyMs: 0,
    generatedAt: new Date().toISOString(),
  };

  if (ai) {
    const messages = [
      { role: 'system' as const, content: insightSystemPrompt(signals.locale) },
      {
        role: 'user' as const,
        content: JSON.stringify({
          locale: signals.locale,
          language: signals.locale === 'id' ? 'Bahasa Indonesia' : 'English',
          role: signals.role,
          audience: audienceForRole(signals.role, signals.locale),
          kind,
          viewingAll: signals.viewingAll,
          accountCode: signals.accountCode,
          groundTruth: payload,
        }),
      },
    ];
    let result = await completeAiChat({
      apiKey: ai.apiKey,
      baseUrl: ai.baseUrl,
      model: ai.model,
      maxTokens: 700,
      json: true,
      messages,
    });
    if (!result.ok) {
      result = await completeAiChat({
        apiKey: ai.apiKey,
        baseUrl: ai.baseUrl,
        model: ai.model,
        maxTokens: 700,
        messages,
      });
    }
    if (result.ok) {
      const narrative = composeNarrative(kind, signals, parseNarrative(result.content));
      card = {
        kind,
        ...narrative,
        source: 'ai',
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs: result.latencyMs,
        generatedAt: new Date().toISOString(),
      };
    } else {
      card = {
        ...card,
        body: fallback.body,
        latencyMs: result.latencyMs,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
      };
    }
  }

  await persistCard(card, session.profile.tenantId, scoped.accountId, session.userId, payload);
  return { data: card, error: null };
}

export async function generateAllInsights(
  localeOverride?: 'en' | 'id',
): Promise<{ data: InsightCard[] | null; error: string | null }> {
  const session = await getSessionProfile();
  if (!session || !(await canAccessConfiguredCapability('read', 'OperationsInsights'))) {
    return { data: null, error: 'Unauthorized' };
  }
  const signals = await gatherInsightSignals();
  const results = await Promise.all(INSIGHT_KINDS.map((kind) => generateInsight(kind, localeOverride)));
  const cards = INSIGHT_KINDS.map((kind, index) => results[index].data ?? (signals ? snapshotCard(kind, signals) : null)).filter(
    (row): row is InsightCard => Boolean(row),
  );
  if (!cards.length) {
    return { data: null, error: results.find((row) => row.error)?.error ?? 'Unable to generate insights' };
  }
  return { data: cards, error: null };
}
