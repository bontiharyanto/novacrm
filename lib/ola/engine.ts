import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupportTier } from '@/lib/org/schema';
import type { TicketPriority, TicketType } from '@/lib/tickets/schema';

export type OlaSnapshot = {
  ola_response_minutes: number | null;
  ola_resolve_minutes: number | null;
  ola_response_at: string | null;
  ola_resolve_by: string | null;
  ola_started_at: string | null;
  uc_id: string | null;
};

export function defaultOlaMinutes(tier?: SupportTier | string | null) {
  if (tier === 'l1') return { response: 30, resolve: 240 };
  if (tier === 'l2') return { response: 60, resolve: 480 };
  if (tier === 'l3') return { response: 120, resolve: 960 };
  return { response: 45, resolve: 360 };
}

function addMinutes(from: Date, minutes: number) {
  return new Date(from.getTime() + minutes * 60_000).toISOString();
}

function emptyOla(): OlaSnapshot {
  return {
    ola_response_minutes: null,
    ola_resolve_minutes: null,
    ola_response_at: null,
    ola_resolve_by: null,
    ola_started_at: null,
    uc_id: null,
  };
}

function isActiveWindow(startsOn?: string | null, endsOn?: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  if (startsOn && startsOn > today) return false;
  if (endsOn && endsOn < today) return false;
  return true;
}

export async function snapshotOla(
  client: SupabaseClient,
  input: {
    tenantId: string;
    groupId?: string | null;
    type?: TicketType;
    priority?: TicketPriority;
    startedAt?: string;
  },
): Promise<OlaSnapshot> {
  if (!input.groupId) return emptyOla();

  const { data: group } = await client
    .from('assignment_groups')
    .select('ola_response_minutes, ola_resolve_minutes, tier, uc_id')
    .eq('id', input.groupId)
    .eq('tenant_id', input.tenantId)
    .maybeSingle();

  const fallback = defaultOlaMinutes(group?.tier);
  let response = group?.ola_response_minutes ?? fallback.response;
  let resolve = group?.ola_resolve_minutes ?? fallback.resolve;
  let ucId: string | null = null;

  if (group?.uc_id && input.type && input.priority) {
    const { data: contract } = await client
      .from('underpinning_contracts')
      .select('id, is_active, starts_on, ends_on')
      .eq('id', group.uc_id)
      .eq('tenant_id', input.tenantId)
      .maybeSingle();

    if (contract?.is_active && isActiveWindow(contract.starts_on, contract.ends_on)) {
      const { data: target } = await client
        .from('uc_targets')
        .select('response_minutes, resolve_minutes')
        .eq('contract_id', contract.id)
        .eq('ticket_type', input.type)
        .eq('priority', input.priority)
        .maybeSingle();
      if (target) {
        response = target.response_minutes;
        resolve = target.resolve_minutes;
      }
      ucId = contract.id;
    }
  }

  const started = input.startedAt ? new Date(input.startedAt) : new Date();
  return {
    ola_response_minutes: response,
    ola_resolve_minutes: resolve,
    ola_response_at: addMinutes(started, response),
    ola_resolve_by: addMinutes(started, resolve),
    ola_started_at: started.toISOString(),
    uc_id: ucId,
  };
}
