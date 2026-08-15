import type { SupabaseClient } from '@supabase/supabase-js';
import { getAiConfigForTenant } from '@/lib/settings/integrations';
import { completeAiChat } from '@/lib/integrations/ai';
import type { Locale } from '@/lib/preferences';
import { getPreferences } from '@/lib/preferences/server';
import {
  staffReviewAiSchema,
  type StaffReviewAiAssessment,
  type StaffReviewSnapshot,
} from '@/lib/reviews/schema';

type TicketFact = {
  id: string;
  number?: string | null;
  title?: string | null;
  type?: string | null;
  status?: string | null;
  priority?: string | null;
  resolved_at?: string | null;
  created_at?: string | null;
  sla_resolve_by?: string | null;
  pending_reason?: string | null;
};

export type ReviewSignals = StaffReviewSnapshot & {
  ticketsOpen: number;
  ticketsHold: number;
  avgResolveHours: number | null;
  sample: Array<{ number: string; type: string; status: string; priority: string; title: string }>;
};

function inRange(value: string | null | undefined, from: Date, to: Date) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return time >= from.getTime() && time <= to.getTime();
}

function clampScore(value: number) {
  return Math.min(5, Math.max(1, Math.round(value)));
}

export function snapshotFromSignals(signals: ReviewSignals): StaffReviewSnapshot {
  return {
    ticketsClosed: signals.ticketsClosed,
    csatAvg: signals.csatAvg,
    csatCount: signals.csatCount,
    slaBreaches: signals.slaBreaches,
  };
}

export async function gatherReviewSignals(
  supabase: SupabaseClient,
  tenantId: string,
  subjectId: string,
  periodStart: string,
  periodEnd: string,
): Promise<ReviewSignals> {
  const from = new Date(`${periodStart}T00:00:00`);
  const to = new Date(`${periodEnd}T23:59:59`);
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, number, title, type, status, priority, resolved_at, created_at, sla_resolve_by, pending_reason')
    .eq('tenant_id', tenantId)
    .eq('assignee_id', subjectId);

  const rows = ((tickets ?? []) as TicketFact[]).filter(
    (ticket) => inRange(ticket.resolved_at, from, to) || inRange(ticket.created_at, from, to),
  );
  const closed = rows.filter(
    (ticket) =>
      (ticket.status === 'resolved' || ticket.status === 'closed') && inRange(ticket.resolved_at, from, to),
  );
  const slaBreaches = rows.filter((ticket) => {
    if (!ticket.sla_resolve_by) return false;
    const deadline = new Date(ticket.sla_resolve_by).getTime();
    const done = ticket.resolved_at ? new Date(ticket.resolved_at).getTime() : Date.now();
    return done > deadline;
  }).length;
  const ticketsOpen = rows.filter((ticket) => !['resolved', 'closed'].includes(ticket.status ?? '')).length;
  const ticketsHold = rows.filter((ticket) => ticket.status === 'hold' || ticket.status === 'waiting').length;
  const resolveHours = closed
    .map((ticket) => {
      if (!ticket.created_at || !ticket.resolved_at) return null;
      return (new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime()) / 36e5;
    })
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const avgResolveHours = resolveHours.length
    ? Math.round((resolveHours.reduce((sum, value) => sum + value, 0) / resolveHours.length) * 10) / 10
    : null;

  const ticketIds = rows.map((ticket) => ticket.id);
  let csatAvg: number | null = null;
  let csatCount = 0;
  if (ticketIds.length > 0) {
    const { data: csats } = await supabase.from('ticket_csat').select('score, ticket_id').in('ticket_id', ticketIds);
    const scores = (csats ?? []).map((row: { score: number }) => Number(row.score)).filter((score: number) => Number.isFinite(score));
    csatCount = scores.length;
    csatAvg = csatCount
      ? Math.round((scores.reduce((sum: number, score: number) => sum + score, 0) / csatCount) * 10) / 10
      : null;
  }

  return {
    ticketsClosed: closed.length,
    csatAvg,
    csatCount,
    slaBreaches,
    ticketsOpen,
    ticketsHold,
    avgResolveHours,
    sample: rows.slice(0, 12).map((ticket) => ({
      number: String(ticket.number || ticket.id.slice(0, 8)),
      type: String(ticket.type || 'ticket'),
      status: String(ticket.status || ''),
      priority: String(ticket.priority || ''),
      title: String(ticket.title || '').slice(0, 80),
    })),
  };
}

export function heuristicAssessment(signals: ReviewSignals, locale: Locale): StaffReviewAiAssessment {
  const quality = signals.csatCount
    ? clampScore((signals.csatAvg ?? 3) + (signals.ticketsClosed >= 4 ? 0.2 : 0))
    : signals.ticketsClosed >= 3
      ? 3
      : 2;
  const slaDiscipline =
    signals.ticketsClosed === 0 && signals.slaBreaches === 0
      ? 3
      : signals.slaBreaches === 0
        ? 5
        : signals.slaBreaches === 1
          ? 3
          : 2;
  const teamwork = signals.ticketsHold >= 3 ? 3 : 4;
  const ownership = signals.ticketsOpen >= 4 ? 2 : signals.ticketsClosed >= 3 ? 4 : 3;
  const id = locale === 'id';
  return {
    quality,
    slaDiscipline,
    teamwork,
    ownership,
    comment: id
      ? `Metrik periode: ${signals.ticketsClosed} tiket ditutup, ${signals.slaBreaches} breach SLA, CSAT ${signals.csatAvg ?? '—'}.`
      : `Period metrics: ${signals.ticketsClosed} closed, ${signals.slaBreaches} SLA breaches, CSAT ${signals.csatAvg ?? '—'}.`,
    strengths: id
      ? signals.ticketsClosed > 0
        ? 'Ada tiket yang diselesaikan di periode ini.'
        : 'Belum cukup volume untuk menilai kekuatan.'
      : signals.ticketsClosed > 0
        ? 'Closed tickets in this period.'
        : 'Not enough volume to judge strengths.',
    improvements: id
      ? signals.slaBreaches > 0
        ? 'Perketat hold vendor dan jam resolve sebelum SLA jatuh.'
        : 'Jaga disiplin SLA dan tutup tiket di hari yang sama setelah resolve.'
      : signals.slaBreaches > 0
        ? 'Tighten vendor holds and resolve before the SLA clock.'
        : 'Keep SLA discipline and close the same day after resolve.',
    source: 'snapshot',
    model: 'snapshot',
    generatedAt: new Date().toISOString(),
  };
}

function extractJson(content: string): unknown | null {
  const trimmed = content.trim().replace(/^\uFEFF/, '');
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  const raw = start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseAiAssessment(content: string, fallback: StaffReviewAiAssessment): StaffReviewAiAssessment | null {
  const parsed = staffReviewAiSchema.safeParse(extractJson(content));
  if (!parsed.success) return null;
  return {
    ...fallback,
    ...parsed.data,
    quality: clampScore(parsed.data.quality),
    slaDiscipline: clampScore(parsed.data.slaDiscipline),
    teamwork: clampScore(parsed.data.teamwork),
    ownership: clampScore(parsed.data.ownership),
    comment: parsed.data.comment.slice(0, 2000),
    strengths: parsed.data.strengths.slice(0, 1000),
    improvements: parsed.data.improvements.slice(0, 1000),
    source: 'ai',
  };
}

function systemPrompt(locale: Locale) {
  const language =
    locale === 'id'
      ? 'Tulis comment, strengths, dan improvements seluruhnya dalam Bahasa Indonesia. Istilah ITSM (SLA, CSAT, ticket number) tetap.'
      : 'Write comment, strengths, and improvements entirely in English. Keep ITSM terms (SLA, CSAT, ticket numbers).';
  return `You score a service-desk agent for one period. Use only the provided signals. Never invent names, emails, or phone numbers.
Scores are integers 1-5 for quality, slaDiscipline, teamwork, ownership.
quality follows CSAT and close hygiene. slaDiscipline falls when slaBreaches > 0. teamwork uses hold/waiting load. ownership uses open vs closed.
${language}
Return JSON only: quality, slaDiscipline, teamwork, ownership, comment, strengths, improvements.`;
}

export async function runReviewAi(input: {
  tenantId: string;
  signals: ReviewSignals;
  locale?: Locale;
}): Promise<StaffReviewAiAssessment> {
  const locale = input.locale ?? getPreferences().locale;
  const fallback = heuristicAssessment(input.signals, locale);
  const ai = await getAiConfigForTenant(input.tenantId);
  if (!ai) return fallback;

  const messages = [
    { role: 'system' as const, content: systemPrompt(locale) },
    {
      role: 'user' as const,
      content: JSON.stringify({
        locale,
        groundTruth: {
          ticketsClosed: input.signals.ticketsClosed,
          ticketsOpen: input.signals.ticketsOpen,
          ticketsHold: input.signals.ticketsHold,
          slaBreaches: input.signals.slaBreaches,
          csatAvg: input.signals.csatAvg,
          csatCount: input.signals.csatCount,
          avgResolveHours: input.signals.avgResolveHours,
          sample: input.signals.sample,
        },
      }),
    },
  ];

  let result = await completeAiChat({
    apiKey: ai.apiKey,
    baseUrl: ai.baseUrl,
    model: ai.model,
    maxTokens: 420,
    json: true,
    messages,
  });
  if (!result.ok) {
    result = await completeAiChat({
      apiKey: ai.apiKey,
      baseUrl: ai.baseUrl,
      model: ai.model,
      maxTokens: 420,
      messages,
    });
  }
  if (!result.ok) return { ...fallback, model: result.error };
  const parsed = parseAiAssessment(result.content, fallback);
  if (!parsed) return fallback;
  return { ...parsed, model: result.model, generatedAt: new Date().toISOString() };
}
