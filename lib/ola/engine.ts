import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupportTier } from '@/lib/org/schema';

export type OlaSnapshot = {
  ola_response_minutes: number | null;
  ola_resolve_minutes: number | null;
  ola_response_at: string | null;
  ola_resolve_by: string | null;
  ola_started_at: string | null;
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

export async function snapshotOla(
  client: SupabaseClient,
  input: { tenantId: string; groupId?: string | null; startedAt?: string },
): Promise<OlaSnapshot> {
  if (!input.groupId) {
    return {
      ola_response_minutes: null,
      ola_resolve_minutes: null,
      ola_response_at: null,
      ola_resolve_by: null,
      ola_started_at: null,
    };
  }

  const { data } = await client
    .from('assignment_groups')
    .select('ola_response_minutes, ola_resolve_minutes, tier')
    .eq('id', input.groupId)
    .eq('tenant_id', input.tenantId)
    .maybeSingle();

  const fallback = defaultOlaMinutes(data?.tier);
  const response = data?.ola_response_minutes ?? fallback.response;
  const resolve = data?.ola_resolve_minutes ?? fallback.resolve;
  const started = input.startedAt ? new Date(input.startedAt) : new Date();

  return {
    ola_response_minutes: response,
    ola_resolve_minutes: resolve,
    ola_response_at: addMinutes(started, response),
    ola_resolve_by: addMinutes(started, resolve),
    ola_started_at: started.toISOString(),
  };
}
