'use server';

import { revalidatePath } from 'next/cache';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatZodError } from '@/lib/validation/zod-error';
import { uuidSchema } from '@/lib/validation/id';
import {
  staffReviewAiSchema,
  staffReviewInputSchema,
  staffReviewSnapshotSchema,
  type StaffReview,
  type StaffReviewAiAssessment,
  type StaffReviewInput,
  type StaffReviewSnapshot,
  type StaffReviewStatus,
} from '@/lib/reviews/schema';
import { gatherReviewSignals, runReviewAi, snapshotFromSignals } from '@/lib/reviews/ai';
import { getPreferences } from '@/lib/preferences/server';

type ReviewRow = {
  id: string;
  tenant_id: string;
  subject_id: string;
  reviewer_id: string;
  period_start: string;
  period_end: string;
  quality: number;
  sla_discipline: number;
  teamwork: number;
  ownership: number;
  comment?: string | null;
  strengths?: string | null;
  improvements?: string | null;
  snapshot?: unknown;
  ai_assessment?: unknown;
  status: string;
  acknowledged_at?: string | null;
  created_at: string;
  updated_at: string;
};

function revalidateReviews(id?: string) {
  revalidatePath('/wfm/reviews');
  if (id) revalidatePath(`/wfm/reviews/${id}`);
}

function parseSnapshot(value: unknown): StaffReviewSnapshot | undefined {
  const parsed = staffReviewSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function parseAi(value: unknown): StaffReviewAiAssessment | undefined {
  const parsed = staffReviewAiSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function mapReview(
  row: ReviewRow,
  names: Record<string, string>,
): StaffReview {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    subjectId: row.subject_id,
    subjectName: names[row.subject_id] ?? row.subject_id,
    reviewerId: row.reviewer_id,
    reviewerName: names[row.reviewer_id] ?? row.reviewer_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    quality: row.quality,
    slaDiscipline: row.sla_discipline,
    teamwork: row.teamwork,
    ownership: row.ownership,
    comment: row.comment ?? undefined,
    strengths: row.strengths ?? undefined,
    improvements: row.improvements ?? undefined,
    snapshot: parseSnapshot(row.snapshot),
    aiAssessment: parseAi(row.ai_assessment),
    status: row.status as StaffReviewStatus,
    acknowledgedAt: row.acknowledged_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadNames(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  ids: string[],
) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {} as Record<string, string>;
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('tenant_id', tenantId)
    .in('id', unique);
  return Object.fromEntries((data ?? []).map((row) => [row.id, row.full_name as string]));
}

async function buildPeriod(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  subjectId: string,
  periodStart: string,
  periodEnd: string,
  options?: { withAi?: boolean; existingAi?: StaffReviewAiAssessment },
) {
  const signals = await gatherReviewSignals(supabase, tenantId, subjectId, periodStart, periodEnd);
  const snapshot = snapshotFromSignals(signals);
  if (options?.existingAi && !options.withAi) {
    return { snapshot, aiAssessment: options.existingAi, signals };
  }
  if (!options?.withAi) return { snapshot, aiAssessment: options?.existingAi, signals };
  const aiAssessment = await runReviewAi({
    tenantId,
    signals,
    locale: getPreferences().locale,
  });
  return { snapshot, aiAssessment, signals };
}

function toRow(input: StaffReviewInput, extras: {
  tenantId: string;
  reviewerId: string;
  createdBy: string;
  status: StaffReviewStatus;
  snapshot?: StaffReviewSnapshot;
  aiAssessment?: StaffReviewAiAssessment;
}) {
  return {
    tenant_id: extras.tenantId,
    subject_id: input.subjectId,
    reviewer_id: extras.reviewerId,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    quality: input.quality,
    sla_discipline: input.slaDiscipline,
    teamwork: input.teamwork,
    ownership: input.ownership,
    comment: input.comment ?? null,
    strengths: input.strengths ?? null,
    improvements: input.improvements ?? null,
    snapshot: extras.snapshot ?? null,
    ai_assessment: extras.aiAssessment ?? null,
    status: extras.status,
    created_by: extras.createdBy,
  };
}

export async function listStaffReviews(): Promise<StaffReview[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'StaffReview')) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('staff_reviews')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .order('period_end', { ascending: false })
    .limit(80);

  if (error || !data) return [];
  const names = await loadNames(
    supabase,
    session.profile.tenantId,
    data.flatMap((row) => [row.subject_id as string, row.reviewer_id as string]),
  );
  return data.map((row) => mapReview(row as ReviewRow, names));
}

export async function getStaffReview(id: string): Promise<StaffReview | null> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'StaffReview')) return null;
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('staff_reviews')
    .select('*')
    .eq('id', parsed.data)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();
  if (!data) return null;
  const names = await loadNames(supabase, session.profile.tenantId, [data.subject_id, data.reviewer_id]);
  return mapReview(data as ReviewRow, names);
}

export async function createStaffReview(input: unknown) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'StaffReview')) {
    return { data: null, error: 'Unauthorized' };
  }
  const parsed = staffReviewInputSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: formatZodError(parsed.error) };
  if (parsed.data.subjectId === session.userId) {
    return { data: null, error: 'Cannot review yourself' };
  }
  if (parsed.data.periodEnd < parsed.data.periodStart) {
    return { data: null, error: 'Period end must be on or after start' };
  }

  const supabase = await createSupabaseServerClient();
  const status: StaffReviewStatus = parsed.data.submit ? 'submitted' : 'draft';
  const period = await buildPeriod(
    supabase,
    session.profile.tenantId,
    parsed.data.subjectId,
    parsed.data.periodStart,
    parsed.data.periodEnd,
    {
      withAi: status === 'submitted' && !parsed.data.aiAssessment,
      existingAi: parsed.data.aiAssessment,
    },
  );

  const { data, error } = await supabase
    .from('staff_reviews')
    .insert(toRow(parsed.data, {
      tenantId: session.profile.tenantId,
      reviewerId: session.userId,
      createdBy: session.userId,
      status,
      snapshot: status === 'submitted' ? period.snapshot : undefined,
      aiAssessment: period.aiAssessment,
    }))
    .select('*')
    .single();

  if (error || !data) {
    if (error?.code === '23505') return { data: null, error: 'A review already exists for this agent and period' };
    return { data: null, error: error?.message ?? 'Could not create review' };
  }

  revalidateReviews(data.id);
  const names = await loadNames(supabase, session.profile.tenantId, [data.subject_id, data.reviewer_id]);
  return { data: mapReview(data as ReviewRow, names), error: null };
}

export async function updateStaffReview(id: string, input: unknown) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'StaffReview')) {
    return { data: null, error: 'Unauthorized' };
  }
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return { data: null, error: 'Invalid id' };
  const parsed = staffReviewInputSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: formatZodError(parsed.error) };

  const existing = await getStaffReview(idParsed.data);
  if (!existing) return { data: null, error: 'Review not found' };
  if (session.profile.role === 'team_lead') {
    if (existing.status !== 'draft') return { data: null, error: 'Only drafts can be edited' };
    if (existing.reviewerId !== session.userId) return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const status: StaffReviewStatus = parsed.data.submit ? 'submitted' : existing.status;
  const period = await buildPeriod(
    supabase,
    session.profile.tenantId,
    parsed.data.subjectId,
    parsed.data.periodStart,
    parsed.data.periodEnd,
    {
      withAi: status === 'submitted' && !parsed.data.aiAssessment && !existing.aiAssessment,
      existingAi: parsed.data.aiAssessment ?? existing.aiAssessment,
    },
  );

  const { data, error } = await supabase
    .from('staff_reviews')
    .update({
      subject_id: parsed.data.subjectId,
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      quality: parsed.data.quality,
      sla_discipline: parsed.data.slaDiscipline,
      teamwork: parsed.data.teamwork,
      ownership: parsed.data.ownership,
      comment: parsed.data.comment ?? null,
      strengths: parsed.data.strengths ?? null,
      improvements: parsed.data.improvements ?? null,
      snapshot: status === 'submitted' ? period.snapshot : existing.snapshot ?? null,
      ai_assessment: period.aiAssessment ?? null,
      status,
    })
    .eq('id', idParsed.data)
    .eq('tenant_id', session.profile.tenantId)
    .select('*')
    .single();

  if (error || !data) return { data: null, error: error?.message ?? 'Could not update review' };
  revalidateReviews(idParsed.data);
  const names = await loadNames(supabase, session.profile.tenantId, [data.subject_id, data.reviewer_id]);
  return { data: mapReview(data as ReviewRow, names), error: null };
}

export async function acknowledgeStaffReview(id: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'StaffReview')) {
    return { data: null, error: 'Unauthorized' };
  }
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { data: null, error: 'Invalid id' };

  const existing = await getStaffReview(parsed.data);
  if (!existing) return { data: null, error: 'Review not found' };
  if (existing.subjectId !== session.userId) return { data: null, error: 'Only the reviewed agent can acknowledge' };
  if (existing.status !== 'submitted') return { data: null, error: 'Review is not awaiting acknowledgement' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('staff_reviews')
    .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
    .eq('id', parsed.data)
    .eq('tenant_id', session.profile.tenantId)
    .select('*')
    .single();

  if (error || !data) return { data: null, error: error?.message ?? 'Could not acknowledge' };
  revalidateReviews(parsed.data);
  const names = await loadNames(supabase, session.profile.tenantId, [data.subject_id, data.reviewer_id]);
  return { data: mapReview(data as ReviewRow, names), error: null };
}

export async function suggestStaffReviewAi(input: unknown) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'StaffReview')) {
    return { data: null, error: 'Unauthorized' };
  }
  const parsed = staffReviewInputSchema.pick({ subjectId: true, periodStart: true, periodEnd: true }).safeParse(input);
  if (!parsed.success) return { data: null, error: formatZodError(parsed.error) };
  if (parsed.data.subjectId === session.userId) {
    return { data: null, error: 'Cannot review yourself' };
  }

  const supabase = await createSupabaseServerClient();
  const signals = await gatherReviewSignals(
    supabase,
    session.profile.tenantId,
    parsed.data.subjectId,
    parsed.data.periodStart,
    parsed.data.periodEnd,
  );
  const data = await runReviewAi({
    tenantId: session.profile.tenantId,
    signals,
    locale: getPreferences().locale,
  });
  return { data, error: null };
}

export async function generateStaffReviewAi(id: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'StaffReview')) {
    return { data: null, error: 'Unauthorized' };
  }
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { data: null, error: 'Invalid id' };
  const existing = await getStaffReview(parsed.data);
  if (!existing) return { data: null, error: 'Review not found' };
  if (session.profile.role === 'team_lead' && existing.reviewerId !== session.userId) {
    return { data: null, error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const period = await buildPeriod(
    supabase,
    session.profile.tenantId,
    existing.subjectId,
    existing.periodStart,
    existing.periodEnd,
    { withAi: true },
  );
  const { data, error } = await supabase
    .from('staff_reviews')
    .update({
      snapshot: existing.status === 'draft' ? existing.snapshot ?? null : period.snapshot,
      ai_assessment: period.aiAssessment ?? null,
    })
    .eq('id', parsed.data)
    .eq('tenant_id', session.profile.tenantId)
    .select('*')
    .single();

  if (error || !data) return { data: null, error: error?.message ?? 'Could not store AI review' };
  revalidateReviews(parsed.data);
  const names = await loadNames(supabase, session.profile.tenantId, [data.subject_id, data.reviewer_id]);
  return { data: mapReview(data as ReviewRow, names), error: null };
}
