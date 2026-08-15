import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { completeAiChat } from '@/lib/integrations/ai';
import { getAiConfigForTenant } from '@/lib/settings/integrations';
import { formatAnswers, mergeVariables, missingRequired, parseVariables } from '@/lib/catalog/variables';
import type { CatalogVariable } from '@/lib/catalog/schema';
import type { TicketPriority, TicketType } from '@/lib/tickets/schema';

export type InboundCatalogMatch = {
  itemId: string;
  name: string;
  slug: string;
  ticketType: TicketType;
  priority: TicketPriority;
  answers: Record<string, string>;
  missing: string[];
  summary: string;
};

type CatalogRow = {
  id: string;
  name: string;
  slug: string;
  short_description?: string | null;
  ticket_type: TicketType;
  priority: TicketPriority;
  variables: unknown;
  variable_set_id?: string | null;
};

const SLUG_HINTS: Record<string, string[]> = {
  'vpn-access': ['vpn', 'remote access', 'akses vpn', 'akses remote', 'split tunnel'],
  'password-reset': ['password', 'reset password', 'unlock', 'lupa password', 'akun terkunci'],
  'install-software': ['install', 'software', 'aplikasi', 'office', 'zoom', 'antivirus'],
  'request-laptop': ['laptop', 'notebook', 'thinkpad', 'latitude', 'minta laptop', 'pengadaan laptop'],
  'report-outage': ['outage', 'down', 'putus', 'gangguan', 'offline'],
};

const INCIDENT_WORDS = ['outage', 'down', 'putus', 'gangguan', 'rusak', 'offline', 'gagal', 'error'];

function haystack(title: string, body: string) {
  return `${title}\n${body}`.toLowerCase();
}

function scoreItem(item: CatalogRow, text: string) {
  let score = 0;
  const name = item.name.toLowerCase();
  const slug = item.slug.toLowerCase();
  if (text.includes(name)) score += 6;
  if (text.includes(slug.replace(/-/g, ' '))) score += 4;
  for (const token of slug.split('-')) {
    if (token.length > 2 && text.includes(token)) score += 2;
  }
  for (const hint of SLUG_HINTS[item.slug] ?? []) {
    if (text.includes(hint)) score += 3;
  }
  if (item.short_description && text.includes(item.short_description.toLowerCase().slice(0, 24))) {
    score += 1;
  }
  const soundsBroken = INCIDENT_WORDS.some((word) => text.includes(word));
  if (soundsBroken && item.ticket_type === 'incident') score += 4;
  if (soundsBroken && item.ticket_type === 'request') score -= 2;
  return score;
}

function compactAnswers(answers: Record<string, string>) {
  return Object.fromEntries(Object.entries(answers).filter(([, value]) => value.trim() !== ''));
}

function pickSelect(variable: CatalogVariable, text: string) {
  const options = variable.options ?? [];
  for (const option of options) {
    if (text.includes(option.toLowerCase())) return option;
  }
  return '';
}

function firstEmail(text: string) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? '';
}

function heuristicAnswer(variable: CatalogVariable, title: string, body: string) {
  const text = haystack(title, body);
  if (variable.key === 'duration') {
    if (/permanent|permanen/.test(text)) return 'Permanent';
    if (/90|tiga bulan/.test(text)) return '90 days';
    if (/30|sebulan/.test(text)) return '30 days';
    return pickSelect(variable, text);
  }
  if (variable.key === 'location') {
    if (/dc-?1|data center/.test(text)) return 'DC-1';
    if (/remote|rumah|home/.test(text)) return 'Remote';
    if (/jakarta/.test(text)) return 'Jakarta HQ';
    return pickSelect(variable, text);
  }
  if (variable.type === 'select') return pickSelect(variable, text);
  if (variable.type === 'checkbox') {
    return /verif|identity|ktp|ya\b|yes\b|sudah/.test(text) ? 'true' : '';
  }
  if (variable.key === 'manager' || variable.key === 'account') return firstEmail(`${title} ${body}`);
  if (variable.key === 'application') {
    const match = `${title} ${body}`.match(/(?:install|aplikasi|software)\s+([a-z0-9 .+-]{2,40})/i);
    return match?.[1]?.trim() ?? '';
  }
  if (variable.key === 'service') return pickSelect(variable, text);
  if (variable.key === 'model') return pickSelect(variable, text);
  if (['justification', 'reason', 'impact', 'why'].includes(variable.key)) {
    return body.trim().slice(0, 400);
  }
  return '';
}

async function refineAnswers(
  tenantId: string,
  item: CatalogRow,
  variables: CatalogVariable[],
  title: string,
  body: string,
  seed: Record<string, string>,
) {
  const ai = await getAiConfigForTenant(tenantId);
  if (!ai) return seed;

  const work = completeAiChat({
    apiKey: ai.apiKey,
    baseUrl: ai.baseUrl,
    model: ai.model,
    maxTokens: 220,
    json: true,
    messages: [
      {
        role: 'system',
        content:
          'Fill catalog variables from an inbound message. Reply JSON only: {"answers":{"key":"value"}}. Use only the listed keys. For select fields use one of the given options. Leave unknown keys as empty string. Do not invent emails.',
      },
      {
        role: 'user',
        content: [
          `Item: ${item.name} (${item.slug})`,
          `Fields: ${JSON.stringify(variables.map((item) => ({ key: item.key, type: item.type, options: item.options, required: item.required })))}`,
          `Known: ${JSON.stringify(seed)}`,
          `Title: ${title.slice(0, 200)}`,
          `Message: ${body.slice(0, 1000)}`,
        ].join('\n'),
      },
    ],
  });

  const raced = await Promise.race([
    work,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 3500);
    }),
  ]);
  if (!raced || !raced.ok) return seed;

  try {
    const parsed = JSON.parse(raced.content) as { answers?: Record<string, unknown> };
    const next = { ...seed };
    for (const variable of variables) {
      const value = parsed.answers?.[variable.key];
      if (value == null || String(value).trim() === '') continue;
      if (variable.type === 'select' && variable.options && !variable.options.includes(String(value))) continue;
      next[variable.key] = String(value).slice(0, 400);
    }
    return next;
  } catch {
    return seed;
  }
}

export async function matchInboundCatalog(input: {
  tenantId: string;
  title: string;
  body: string;
}): Promise<InboundCatalogMatch | null> {
  const supabase = createSupabaseAdminClient();
  const { data: items } = await supabase
    .from('catalog_items')
    .select('id, name, slug, short_description, ticket_type, priority, variables, variable_set_id')
    .eq('tenant_id', input.tenantId)
    .eq('is_active', true)
    .in('ticket_type', ['request', 'incident']);

  const rows = (items ?? []) as CatalogRow[];
  if (rows.length === 0) return null;

  const text = haystack(input.title, input.body);
  const ranked = rows
    .map((item) => ({ item, score: scoreItem(item, text) }))
    .filter((row) => row.score >= 3)
    .sort((a, b) => b.score - a.score || a.item.slug.localeCompare(b.item.slug));
  const winner = ranked[0]?.item;
  if (!winner) return null;

  const setIds = rows.map((item) => item.variable_set_id).filter((id): id is string => Boolean(id));
  const sets = new Map<string, CatalogVariable[]>();
  if (setIds.length > 0) {
    const { data } = await supabase.from('catalog_variable_sets').select('id, variables').in('id', setIds);
    for (const row of data ?? []) {
      sets.set(row.id, parseVariables(row.variables));
    }
  }

  const variables = mergeVariables(
    winner.variable_set_id ? sets.get(winner.variable_set_id) : undefined,
    parseVariables(winner.variables),
  );
  let answers: Record<string, string> = {};
  for (const variable of variables) {
    answers[variable.key] = heuristicAnswer(variable, input.title, input.body);
  }
  answers = compactAnswers(
    await refineAnswers(input.tenantId, winner, variables, input.title, input.body, answers),
  );

  const missing = missingRequired(variables, answers);
  return {
    itemId: winner.id,
    name: winner.name,
    slug: winner.slug,
    ticketType: winner.ticket_type,
    priority: winner.priority,
    answers,
    missing,
    summary: formatAnswers(variables, answers),
  };
}
