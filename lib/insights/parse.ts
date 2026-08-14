import { insightNarrativeSchema, type InsightCard, type InsightNarrative } from '@/lib/insights/schema';

export function looksLikeJson(value: string) {
  const text = value.trim();
  return text.startsWith('{') && (text.includes('"title"') || text.includes('"body"') || text.includes('"summary"'));
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function unwrapNarrative(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 3; i += 1) {
    if (typeof current === 'string') {
      const nested = extractJsonObject(current);
      if (!nested) break;
      current = nested;
      continue;
    }
    const record = asRecord(current);
    if (!record) break;
    const inner = record.body;
    if (typeof inner === 'string' && looksLikeJson(inner)) {
      const nested = extractJsonObject(inner);
      const nestedRecord = asRecord(nested);
      if (nestedRecord) {
        current = { ...record, ...nestedRecord };
        continue;
      }
    }
    break;
  }
  return current;
}

export function parseNarrative(content: string): InsightNarrative | null {
  const extracted = extractJsonObject(content);
  if (!extracted) return null;
  const result = insightNarrativeSchema.safeParse(unwrapNarrative(extracted));
  if (!result.success) return null;
  const title = result.data.title.trim();
  const summary = result.data.summary.trim();
  const body = (result.data.body.trim() || summary).replace(/\\n/g, '\n');
  if (!title || looksLikeJson(title) || looksLikeJson(body)) return null;
  return {
    title: title.slice(0, 160),
    summary: (summary || title).slice(0, 400),
    body: body.slice(0, 4000),
    severity: result.data.severity,
  };
}

export function sanitizeInsightCard(card: InsightCard): InsightCard {
  const fromBody = looksLikeJson(card.body) ? parseNarrative(card.body) : null;
  const fromTitle = looksLikeJson(card.title) ? parseNarrative(card.title) : null;
  const parsed = fromBody ?? fromTitle;
  if (!parsed) {
    return {
      ...card,
      body: looksLikeJson(card.body) ? card.summary : card.body,
      title: looksLikeJson(card.title) ? card.summary || card.title : card.title,
    };
  }
  return {
    ...card,
    title: parsed.title,
    summary: parsed.summary || card.summary,
    body: parsed.body || parsed.summary,
    severity: parsed.severity,
  };
}
