'use server';

import { revalidatePath } from 'next/cache';
import {
  defaultUcTargets,
  underpinningContractSchema,
  underpinningContractUpdateSchema,
  type UcTarget,
  type UnderpinningContract,
} from '@/lib/uc/schema';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatZodError } from '@/lib/validation/zod-error';

const CONTRACT_SELECT =
  'id, tenant_id, name, contract_number, party_kind, party_name, calendar_id, coverage, starts_on, ends_on, contact_email, contact_phone, service_scope, penalty_notes, is_active, created_at';

type ContractRow = {
  id: string;
  tenant_id: string;
  name: string;
  contract_number: string;
  party_kind: UnderpinningContract['partyKind'];
  party_name: string;
  calendar_id?: string | null;
  coverage: UnderpinningContract['coverage'];
  starts_on?: string | null;
  ends_on?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  service_scope?: string | null;
  penalty_notes?: string | null;
  is_active: boolean;
  created_at: string;
};

type TargetRow = {
  id: string;
  ticket_type: UcTarget['ticketType'];
  priority: UcTarget['priority'];
  response_minutes: number;
  resolve_minutes: number;
};

function mapTarget(row: TargetRow): UcTarget {
  return {
    id: row.id,
    ticketType: row.ticket_type,
    priority: row.priority,
    responseMinutes: row.response_minutes,
    resolveMinutes: row.resolve_minutes,
  };
}

function mapContract(row: ContractRow, targets: UcTarget[], linkedGroupCount: number): UnderpinningContract {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    contractNumber: row.contract_number,
    partyKind: row.party_kind,
    partyName: row.party_name,
    calendarId: row.calendar_id ?? undefined,
    coverage: row.coverage === 'business_hours' ? 'business_hours' : '24x7',
    startsOn: row.starts_on ?? undefined,
    endsOn: row.ends_on ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    serviceScope: row.service_scope ?? undefined,
    penaltyNotes: row.penalty_notes ?? undefined,
    isActive: row.is_active,
    targets,
    linkedGroupCount,
    createdAt: row.created_at,
  };
}

async function hydrate(row: ContractRow): Promise<UnderpinningContract> {
  const supabase = await createSupabaseServerClient();
  const [{ data: targets }, { count }] = await Promise.all([
    supabase
      .from('uc_targets')
      .select('id, ticket_type, priority, response_minutes, resolve_minutes')
      .eq('contract_id', row.id),
    supabase
      .from('assignment_groups')
      .select('id', { count: 'exact', head: true })
      .eq('uc_id', row.id),
  ]);
  return mapContract(row, (targets ?? []).map((item) => mapTarget(item as TargetRow)), count ?? 0);
}

export async function listUnderpinningContracts(): Promise<UnderpinningContract[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Sla')) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('underpinning_contracts')
    .select(CONTRACT_SELECT)
    .eq('tenant_id', session.profile.tenantId)
    .order('party_kind')
    .order('name');
  if (!data) return [];
  return Promise.all(data.map((row) => hydrate(row as ContractRow)));
}

export async function getUnderpinningContract(id: string): Promise<UnderpinningContract | null> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Sla')) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('underpinning_contracts')
    .select(CONTRACT_SELECT)
    .eq('id', id)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();
  if (!data) return null;
  return hydrate(data as ContractRow);
}

export async function createUnderpinningContract(input: unknown) {
  const parsed = underpinningContractSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: formatZodError(parsed.error) };
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Sla')) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('underpinning_contracts')
    .insert({
      tenant_id: session.profile.tenantId,
      name: parsed.data.name.trim(),
      contract_number: parsed.data.contractNumber.trim(),
      party_kind: parsed.data.partyKind,
      party_name: parsed.data.partyName.trim(),
      calendar_id: parsed.data.calendarId ?? null,
      coverage: parsed.data.coverage,
      starts_on: parsed.data.startsOn ?? null,
      ends_on: parsed.data.endsOn ?? null,
      contact_email: parsed.data.contactEmail ?? null,
      contact_phone: parsed.data.contactPhone ?? null,
      service_scope: parsed.data.serviceScope ?? null,
      penalty_notes: parsed.data.penaltyNotes ?? null,
      is_active: parsed.data.isActive ?? true,
      created_by: session.userId,
    })
    .select(CONTRACT_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create contract' };
  }

  const targets = parsed.data.targets?.length ? parsed.data.targets : defaultUcTargets(parsed.data.partyKind);
  const { error: targetError } = await supabase.from('uc_targets').insert(
    targets.map((target) => ({
      tenant_id: session.profile.tenantId,
      contract_id: data.id,
      ticket_type: target.ticketType,
      priority: target.priority,
      response_minutes: target.responseMinutes,
      resolve_minutes: target.resolveMinutes,
      created_by: session.userId,
    })),
  );
  if (targetError) {
    return { data: null, error: targetError.message };
  }

  revalidatePath('/sla');
  revalidatePath('/org');
  return { data: await getUnderpinningContract(data.id), error: null };
}

export async function updateUnderpinningContract(id: string, input: unknown) {
  const parsed = underpinningContractUpdateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: formatZodError(parsed.error) };
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Sla')) {
    return { data: null, error: 'Unauthorized' };
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
  if (parsed.data.contractNumber !== undefined) patch.contract_number = parsed.data.contractNumber.trim();
  if (parsed.data.partyKind !== undefined) patch.party_kind = parsed.data.partyKind;
  if (parsed.data.partyName !== undefined) patch.party_name = parsed.data.partyName.trim();
  if (parsed.data.calendarId !== undefined) patch.calendar_id = parsed.data.calendarId ?? null;
  if (parsed.data.coverage !== undefined) patch.coverage = parsed.data.coverage;
  if (parsed.data.startsOn !== undefined) patch.starts_on = parsed.data.startsOn ?? null;
  if (parsed.data.endsOn !== undefined) patch.ends_on = parsed.data.endsOn ?? null;
  if (parsed.data.contactEmail !== undefined) patch.contact_email = parsed.data.contactEmail ?? null;
  if (parsed.data.contactPhone !== undefined) patch.contact_phone = parsed.data.contactPhone ?? null;
  if (parsed.data.serviceScope !== undefined) patch.service_scope = parsed.data.serviceScope ?? null;
  if (parsed.data.penaltyNotes !== undefined) patch.penalty_notes = parsed.data.penaltyNotes ?? null;
  if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;

  const supabase = await createSupabaseServerClient();
  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from('underpinning_contracts')
      .update(patch)
      .eq('id', id)
      .eq('tenant_id', session.profile.tenantId);
    if (error) return { data: null, error: error.message };
  }

  if (parsed.data.targets) {
    await supabase.from('uc_targets').delete().eq('contract_id', id).eq('tenant_id', session.profile.tenantId);
    const { error: targetError } = await supabase.from('uc_targets').insert(
      parsed.data.targets.map((target) => ({
        tenant_id: session.profile.tenantId,
        contract_id: id,
        ticket_type: target.ticketType,
        priority: target.priority,
        response_minutes: target.responseMinutes,
        resolve_minutes: target.resolveMinutes,
        created_by: session.userId,
      })),
    );
    if (targetError) return { data: null, error: targetError.message };
  }

  revalidatePath('/sla');
  revalidatePath(`/sla/uc/${id}`);
  revalidatePath('/org');
  return { data: await getUnderpinningContract(id), error: null };
}
