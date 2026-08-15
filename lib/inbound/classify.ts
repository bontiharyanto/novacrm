import { completeAiChat } from '@/lib/integrations/ai';
import { getAiConfigForTenant } from '@/lib/settings/integrations';
import type { TicketPriority, TicketType } from '@/lib/tickets/schema';

export type InboundClassification = {
  type: TicketType;
  priority: TicketPriority;
  title: string;
  note?: string;
};

const TYPES: TicketType[] = ['incident', 'request', 'problem', 'change'];
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'critical'];

function asType(value: unknown, fallback: TicketType): TicketType {
  return TYPES.includes(value as TicketType) ? (value as TicketType) : fallback;
}

function asPriority(value: unknown, fallback: TicketPriority): TicketPriority {
  return PRIORITIES.includes(value as TicketPriority) ? (value as TicketPriority) : fallback;
}

export async function classifyInbound(input: {
  tenantId: string;
  title: string;
  body: string;
  fallbackType: TicketType;
  fallbackPriority: TicketPriority;
}): Promise<InboundClassification> {
  const fallback: InboundClassification = {
    type: input.fallbackType,
    priority: input.fallbackPriority,
    title: input.title,
  };

  const ai = await getAiConfigForTenant(input.tenantId);
  if (!ai) return fallback;

  const work = completeAiChat({
    apiKey: ai.apiKey,
    baseUrl: ai.baseUrl,
    model: ai.model,
    maxTokens: 180,
    json: true,
    messages: [
      {
        role: 'system',
        content:
          'Classify an inbound ITSM message. Reply JSON only: {"type":"incident|request|problem|change","priority":"low|medium|high|critical","title":"short title","note":"one sentence"}. Prefer incident for outages, request for access/catalog, problem only if a repeating root cause is stated. Never invent change unless they ask to modify infrastructure.',
      },
      {
        role: 'user',
        content: `Title: ${input.title.slice(0, 200)}\nMessage: ${input.body.slice(0, 1200)}`,
      },
    ],
  });

  const raced = await Promise.race([
    work,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 3500);
    }),
  ]);

  if (!raced || !raced.ok) return fallback;

  try {
    const parsed = JSON.parse(raced.content) as Record<string, unknown>;
    const title = typeof parsed.title === 'string' && parsed.title.trim().length >= 3 ? parsed.title.trim().slice(0, 200) : input.title;
    return {
      type: asType(parsed.type, input.fallbackType),
      priority: asPriority(parsed.priority, input.fallbackPriority),
      title,
      note: typeof parsed.note === 'string' ? parsed.note.slice(0, 240) : undefined,
    };
  } catch {
    return fallback;
  }
}
