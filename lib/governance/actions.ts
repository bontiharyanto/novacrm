'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getBreachNotifySla, getDsarSla } from '@/lib/governance/flow';
import {
  breachInputSchema,
  breachUpdateSchema,
  dsarInputSchema,
  dsarUpdateSchema,
  privacySettingsSchema,
  ropaInputSchema,
  type DataBreach,
  type DataSubjectRequest,
  type GovernanceSnapshot,
  type PrivacySettings,
  type ProcessingActivity,
} from '@/lib/governance/schema';

function mapSettings(row: Record<string, unknown>): PrivacySettings {
  return {
    tenantId: String(row.tenant_id),
    dpoName: (row.dpo_name as string) || undefined,
    dpoEmail: (row.dpo_email as string) || undefined,
    dpoPhone: (row.dpo_phone as string) || undefined,
    controllerName: (row.controller_name as string) || undefined,
    controllerAddress: (row.controller_address as string) || undefined,
    noticeTitle: (row.notice_title as string) || undefined,
    noticeBody: (row.notice_body as string) || undefined,
    lawfulBasisDefault: (row.lawful_basis_default as PrivacySettings['lawfulBasisDefault']) ?? 'contract',
    crossBorderAllowed: Boolean(row.cross_border_allowed),
    isPublished: Boolean(row.is_published),
    updatedAt: String(row.updated_at),
  };
}

function mapRopa(row: Record<string, unknown>): ProcessingActivity {
  return {
    id: String(row.id),
    number: String(row.number ?? ''),
    name: String(row.name),
    purpose: String(row.purpose),
    lawfulBasis: row.lawful_basis as ProcessingActivity['lawfulBasis'],
    dataCategories: (row.data_categories as string[]) ?? [],
    dataSubjects: (row.data_subjects as string[]) ?? [],
    recipients: (row.recipients as string) || undefined,
    retentionDays: Number(row.retention_days ?? 365),
    crossBorder: Boolean(row.cross_border),
    securityMeasures: (row.security_measures as string) || undefined,
    status: row.status as ProcessingActivity['status'],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapDsar(row: Record<string, unknown>): DataSubjectRequest {
  return {
    id: String(row.id),
    number: String(row.number ?? ''),
    requestType: row.request_type as DataSubjectRequest['requestType'],
    status: row.status as DataSubjectRequest['status'],
    subjectName: String(row.subject_name),
    subjectEmail: (row.subject_email as string) || undefined,
    subjectPhone: (row.subject_phone as string) || undefined,
    requesterId: (row.requester_id as string) || undefined,
    description: (row.description as string) || undefined,
    dueDate: (row.due_date as string) || undefined,
    resolution: (row.resolution as string) || undefined,
    assignedTo: (row.assigned_to as string) || undefined,
    assignedName: (row.assigned_name as string) || undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapBreach(row: Record<string, unknown>): DataBreach {
  return {
    id: String(row.id),
    number: String(row.number ?? ''),
    title: String(row.title),
    description: (row.description as string) || undefined,
    discoveredAt: String(row.discovered_at),
    notifiedAt: (row.notified_at as string) || undefined,
    severity: row.severity as DataBreach['severity'],
    status: row.status as DataBreach['status'],
    affectedCount: Number(row.affected_count ?? 0),
    dataCategories: (row.data_categories as string[]) ?? [],
    notifyAuthority: row.notify_authority !== false,
    notifySubjects: Boolean(row.notify_subjects),
    containment: (row.containment as string) || undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getPrivacySettings() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Governance')) {
    return null;
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('privacy_settings')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();
  return data ? mapSettings(data as Record<string, unknown>) : null;
}

export async function savePrivacySettings(input: unknown) {
  const parsed = privacySettingsSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Governance') || session.profile.role !== 'admin') {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('privacy_settings')
    .upsert({
      tenant_id: session.profile.tenantId,
      dpo_name: parsed.dpoName || null,
      dpo_email: parsed.dpoEmail || null,
      dpo_phone: parsed.dpoPhone || null,
      controller_name: parsed.controllerName || null,
      controller_address: parsed.controllerAddress || null,
      notice_title: parsed.noticeTitle || null,
      notice_body: parsed.noticeBody || null,
      lawful_basis_default: parsed.lawfulBasisDefault ?? 'contract',
      cross_border_allowed: parsed.crossBorderAllowed ?? false,
      is_published: parsed.isPublished ?? false,
      created_by: session.userId,
    })
    .select('*')
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to save privacy settings' };
  }
  return { data: mapSettings(data as Record<string, unknown>), error: null };
}

export async function listProcessingActivities() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Governance')) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('processing_activities')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .order('created_at', { ascending: false });
  return (data ?? []).map((row) => mapRopa(row as Record<string, unknown>));
}

export async function getProcessingActivity(id: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Governance')) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('processing_activities')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .eq('id', id)
    .maybeSingle();
  return data ? mapRopa(data as Record<string, unknown>) : null;
}

export async function saveProcessingActivity(id: string | undefined, input: unknown) {
  const parsed = ropaInputSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, id ? 'update' : 'create', 'Governance')) {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const payload = {
    tenant_id: session.profile.tenantId,
    name: parsed.name,
    purpose: parsed.purpose,
    lawful_basis: parsed.lawfulBasis,
    data_categories: parsed.dataCategories,
    data_subjects: parsed.dataSubjects,
    recipients: parsed.recipients || null,
    retention_days: parsed.retentionDays,
    cross_border: parsed.crossBorder,
    security_measures: parsed.securityMeasures || null,
    status: parsed.status,
    created_by: session.userId,
  };
  const query = id
    ? supabase.from('processing_activities').update(payload).eq('id', id).eq('tenant_id', session.profile.tenantId)
    : supabase.from('processing_activities').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to save processing activity' };
  }
  return { data: mapRopa(data as Record<string, unknown>), error: null };
}

export async function listDataSubjectRequests() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Governance')) return [];
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('data_subject_requests')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .order('created_at', { ascending: false });
  if (session.profile.role === 'customer') {
    query = query.eq('requester_id', session.userId);
  }
  const { data } = await query;
  return (data ?? []).map((row) => mapDsar(row as Record<string, unknown>));
}

export async function getDataSubjectRequest(id: string) {
  const rows = await listDataSubjectRequests();
  return rows.find((row) => row.id === id) ?? null;
}

export async function createDataSubjectRequest(input: unknown) {
  const parsed = dsarInputSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Governance')) {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('data_subject_requests')
    .insert({
      tenant_id: session.profile.tenantId,
      request_type: parsed.requestType,
      subject_name: parsed.subjectName,
      subject_email: parsed.subjectEmail || session.profile.email || null,
      subject_phone: parsed.subjectPhone || session.profile.phone || null,
      requester_id: session.profile.role === 'customer' ? session.userId : null,
      description: parsed.description || null,
      created_by: session.userId,
    })
    .select('*')
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create request' };
  }
  return { data: mapDsar(data as Record<string, unknown>), error: null };
}

export async function updateDataSubjectRequest(id: string, input: unknown) {
  const parsed = dsarUpdateSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Governance') || session.profile.role === 'customer') {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const patch: Record<string, unknown> = {};
  if (parsed.status) patch.status = parsed.status;
  if (parsed.assignedTo !== undefined) patch.assigned_to = parsed.assignedTo;
  if (parsed.assignedName !== undefined) patch.assigned_name = parsed.assignedName;
  if (parsed.resolution !== undefined) patch.resolution = parsed.resolution;
  const { data, error } = await supabase
    .from('data_subject_requests')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', session.profile.tenantId)
    .select('*')
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to update request' };
  }
  return { data: mapDsar(data as Record<string, unknown>), error: null };
}

export async function listDataBreaches() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Governance')) return [];
  if (session.profile.role === 'customer') return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('data_breaches')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .order('discovered_at', { ascending: false });
  return (data ?? []).map((row) => mapBreach(row as Record<string, unknown>));
}

export async function getDataBreach(id: string) {
  const rows = await listDataBreaches();
  return rows.find((row) => row.id === id) ?? null;
}

export async function createDataBreach(input: unknown) {
  const parsed = breachInputSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Governance') || session.profile.role === 'customer') {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('data_breaches')
    .insert({
      tenant_id: session.profile.tenantId,
      title: parsed.title,
      description: parsed.description || null,
      discovered_at: parsed.discoveredAt || new Date().toISOString(),
      severity: parsed.severity,
      affected_count: parsed.affectedCount,
      data_categories: parsed.dataCategories,
      notify_authority: parsed.notifyAuthority,
      notify_subjects: parsed.notifySubjects,
      containment: parsed.containment || null,
      created_by: session.userId,
    })
    .select('*')
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create breach record' };
  }
  return { data: mapBreach(data as Record<string, unknown>), error: null };
}

export async function updateDataBreach(id: string, input: unknown) {
  const parsed = breachUpdateSchema.parse(input);
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Governance') || session.profile.role === 'customer') {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const patch: Record<string, unknown> = {};
  if (parsed.status) {
    patch.status = parsed.status;
    if (parsed.status === 'notified' && parsed.notifiedAt === undefined) {
      patch.notified_at = new Date().toISOString();
    }
  }
  if (parsed.notifiedAt !== undefined) patch.notified_at = parsed.notifiedAt;
  if (parsed.containment !== undefined) patch.containment = parsed.containment;
  if (parsed.affectedCount !== undefined) patch.affected_count = parsed.affectedCount;
  if (parsed.notifySubjects !== undefined) patch.notify_subjects = parsed.notifySubjects;
  const { data, error } = await supabase
    .from('data_breaches')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', session.profile.tenantId)
    .select('*')
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to update breach' };
  }
  return { data: mapBreach(data as Record<string, unknown>), error: null };
}

export async function getGovernanceSnapshot(): Promise<GovernanceSnapshot | null> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Governance')) return null;
  if (session.profile.role === 'customer') return null;

  const [settings, ropa, requests, breaches] = await Promise.all([
    getPrivacySettings(),
    listProcessingActivities(),
    listDataSubjectRequests(),
    listDataBreaches(),
  ]);

  const openRequests = requests.filter((row) => row.status !== 'completed' && row.status !== 'rejected');
  const openBreaches = breaches.filter((row) => row.status !== 'closed');

  return {
    settings,
    ropaActive: ropa.filter((row) => row.status === 'active').length,
    ropaTotal: ropa.length,
    dsarOpen: openRequests.length,
    dsarBreached: openRequests.filter((row) => getDsarSla(row.dueDate, row.status) === 'breached').length,
    breachOpen: openBreaches.length,
    breachNotifyRisk: openBreaches.filter(
      (row) => getBreachNotifySla(row.discoveredAt, row.status, row.notifyAuthority) !== 'ok' &&
        getBreachNotifySla(row.discoveredAt, row.status, row.notifyAuthority) !== 'none',
    ).length,
    openRequests: openRequests.slice(0, 8),
    openBreaches: openBreaches.slice(0, 8),
  };
}
