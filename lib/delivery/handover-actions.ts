import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDeliveryProject } from '@/lib/delivery/actions';
import {
  handoverItemUpdateSchema,
  handoverReviewSchema,
  type DeliveryHandover,
  type DeliveryHandoverItem,
  type DeliveryHandoverReview,
} from '@/lib/delivery/schema';

const DEFAULT_HANDOVER_ITEMS = [
  { itemKey: 'scope_accepted', title: 'Scope and acceptance criteria confirmed' },
  { itemKey: 'cmdb_updated', title: 'CMDB and asset records updated' },
  { itemKey: 'runbook_ready', title: 'Operations runbook and support guide delivered' },
  { itemKey: 'monitoring_ready', title: 'Monitoring, alerting, and escalation configured' },
  { itemKey: 'access_verified', title: 'Production access and ownership verified' },
  { itemKey: 'backup_rollback_ready', title: 'Backup and rollback procedure tested' },
  { itemKey: 'known_issues_logged', title: 'Known issues and workarounds documented' },
  { itemKey: 'customer_communication', title: 'Customer communication and support window agreed' },
] as const;

type HandoverRow = {
  id: string;
  tenant_id: string;
  project_id: string;
  status: DeliveryHandover['status'];
  operational_accepted_by?: string | null;
  operational_accepted_at?: string | null;
  hypercare_start?: string | null;
  hypercare_end?: string | null;
};

type HandoverItemRow = {
  id: string;
  project_id: string;
  item_key: string;
  title: string;
  required: boolean;
  completed: boolean;
  notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
};

type HandoverReviewRow = {
  id: string;
  project_id: string;
  action: DeliveryHandoverReview['action'];
  notes: string;
  reviewer_id: string | null;
  created_at: string;
};

function mapItem(row: HandoverItemRow): DeliveryHandoverItem {
  return {
    id: row.id,
    projectId: row.project_id,
    itemKey: row.item_key,
    title: row.title,
    required: row.required,
    completed: row.completed,
    notes: row.notes ?? undefined,
    completedAt: row.completed_at ?? undefined,
    completedBy: row.completed_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isOperationsRole(role: Parameters<typeof canRole>[0]) {
  return ['supervisor', 'manager', 'admin', 'superadmin'].includes(role);
}

async function ensureHandover(
  client: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  projectId: string,
  userId: string,
) {
  const existing = await client
    .from('delivery_handovers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('project_id', projectId)
    .maybeSingle();
  if (existing.data) return existing.data as HandoverRow;
  if (existing.error && existing.error.code !== 'PGRST116') throw new Error(existing.error.message);

  const created = await client
    .from('delivery_handovers')
    .insert({ tenant_id: tenantId, project_id: projectId, created_by: userId })
    .select('*')
    .single();
  if (created.error || !created.data) {
    if (created.error?.code === '23505') {
      const retry = await client
        .from('delivery_handovers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('project_id', projectId)
        .single();
      if (retry.data) return retry.data as HandoverRow;
    }
    throw new Error(created.error?.message ?? 'Unable to create handover record');
  }

  const items = await client.from('delivery_handover_items').insert(
    DEFAULT_HANDOVER_ITEMS.map((item) => ({
      tenant_id: tenantId,
      project_id: projectId,
      item_key: item.itemKey,
      title: item.title,
      required: true,
      created_by: userId,
    })),
  );
  if (items.error && items.error.code !== '23505') throw new Error(items.error.message);
  return created.data as HandoverRow;
}

async function loadHandover(
  client: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  handover: HandoverRow,
): Promise<DeliveryHandover> {
  const [itemsResult, reviewsResult] = await Promise.all([
    client.from('delivery_handover_items').select('*').eq('project_id', handover.project_id).order('created_at'),
    client.from('delivery_handover_reviews').select('*').eq('project_id', handover.project_id).order('created_at', { ascending: false }),
  ]);
  const items = ((itemsResult.data ?? []) as HandoverItemRow[]).map(mapItem);
  const reviews = (reviewsResult.data ?? []) as HandoverReviewRow[];
  const reviewerIds = reviews.map((review) => review.reviewer_id).filter((id): id is string => Boolean(id));
  const acceptedByIds = handover.operational_accepted_by ? [handover.operational_accepted_by] : [];
  const profileIds = Array.from(new Set([...reviewerIds, ...acceptedByIds]));
  const profilesResult = profileIds.length
    ? await client.from('profiles').select('id, full_name').in('id', profileIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> };
  const names = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name ?? profile.id]));
  const requiredItems = items.filter((item) => item.required);
  const completedCount = requiredItems.filter((item) => item.completed).length;

  return {
    id: handover.id,
    tenantId: handover.tenant_id,
    projectId: handover.project_id,
    status: handover.status,
    operationalAcceptedBy: handover.operational_accepted_by ?? undefined,
    operationalAcceptedByName: handover.operational_accepted_by
      ? names.get(handover.operational_accepted_by)
      : undefined,
    operationalAcceptedAt: handover.operational_accepted_at ?? undefined,
    hypercareStart: handover.hypercare_start ?? undefined,
    hypercareEnd: handover.hypercare_end ?? undefined,
    items,
    reviews: reviews.map((review) => ({
      id: review.id,
      projectId: review.project_id,
      action: review.action,
      notes: review.notes,
      reviewerId: review.reviewer_id ?? undefined,
      reviewerName: review.reviewer_id ? names.get(review.reviewer_id) : undefined,
      createdAt: review.created_at,
    })),
    requiredCount: requiredItems.length,
    completedCount,
    progress: requiredItems.length ? Math.round((completedCount / requiredItems.length) * 100) : 0,
  };
}

export async function getDeliveryHandover(projectId: string) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'DeliveryHandover')) {
    return { data: null, error: 'Unauthorized' };
  }
  const project = await getDeliveryProject(projectId);
  if (project.error || !project.data) return { data: null, error: project.error ?? 'Project not found' };

  const client = await createSupabaseServerClient();
  let handover: HandoverRow | null = null;
  const existing = await client
    .from('delivery_handovers')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .eq('project_id', projectId)
    .maybeSingle();
  if (existing.error) return { data: null, error: existing.error.message };
  handover = (existing.data as HandoverRow | null) ?? null;
  if (!handover && canRole(session.profile.role, 'create', 'DeliveryHandover')) {
    try {
      handover = await ensureHandover(client, session.profile.tenantId, projectId, session.userId);
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Unable to create handover' };
    }
  }
  if (!handover) return { data: null, error: 'Handover record is not available' };
  return { data: await loadHandover(client, handover), error: null };
}

export async function updateDeliveryHandoverItem(projectId: string, input: unknown) {
  const parsed = handoverItemUpdateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid checklist update' };
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'DeliveryHandover')) {
    return { data: null, error: 'Unauthorized' };
  }
  const client = await createSupabaseServerClient();
  try {
    const handover = await ensureHandover(client, session.profile.tenantId, projectId, session.userId);
    const result = await client
      .from('delivery_handover_items')
      .update({
        completed: parsed.data.completed,
        notes: parsed.data.notes ?? '',
        completed_at: parsed.data.completed ? new Date().toISOString() : null,
        completed_by: parsed.data.completed ? session.userId : null,
      })
      .eq('id', parsed.data.itemId)
      .eq('project_id', projectId)
      .eq('tenant_id', session.profile.tenantId);
    if (result.error) return { data: null, error: result.error.message };
    if (handover.status === 'not_started' || handover.status === 'rejected') {
      await client.from('delivery_handovers').update({ status: 'in_progress' }).eq('id', handover.id);
    }
    return getDeliveryHandover(projectId);
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to update checklist' };
  }
}

export async function reviewDeliveryHandover(projectId: string, input: unknown) {
  const parsed = handoverReviewSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid handover review' };
  const session = await getSessionProfile();
  if (!session) return { data: null, error: 'Unauthorized' };
  const canSubmit = canRole(session.profile.role, 'create', 'DeliveryHandover');
  const canAccept = canRole(session.profile.role, 'update', 'OperationalAcceptance') && isOperationsRole(session.profile.role);
  if ((parsed.data.action === 'submit' && !canSubmit) || (parsed.data.action !== 'submit' && !canAccept)) {
    return { data: null, error: 'Unauthorized' };
  }

  const client = await createSupabaseServerClient();
  try {
    const handover = await ensureHandover(client, session.profile.tenantId, projectId, session.userId);
    const itemsResult = await client
      .from('delivery_handover_items')
      .select('required, completed')
      .eq('project_id', projectId)
      .eq('tenant_id', session.profile.tenantId);
    if (itemsResult.error) return { data: null, error: itemsResult.error.message };
    const requiredIncomplete = (itemsResult.data ?? []).some((item) => item.required && !item.completed);
    if (parsed.data.action === 'submit' && requiredIncomplete) {
      return { data: null, error: 'Complete all required checklist items before submitting for Operations review.' };
    }
    if (parsed.data.action !== 'submit' && parsed.data.action !== 'reject' && requiredIncomplete) {
      return { data: null, error: 'Required checklist items are still incomplete.' };
    }

    const status =
      parsed.data.action === 'submit'
        ? 'under_review'
        : parsed.data.action === 'accept'
          ? 'accepted'
          : parsed.data.action === 'accept_with_conditions'
            ? 'accepted_with_conditions'
            : 'rejected';
    const now = new Date();
    const patch: Record<string, unknown> = { status };
    if (status === 'accepted' || status === 'accepted_with_conditions') {
      const hypercareEnd = new Date(now);
      hypercareEnd.setDate(hypercareEnd.getDate() + 14);
      patch.operational_accepted_by = session.userId;
      patch.operational_accepted_at = now.toISOString();
      patch.hypercare_start = now.toISOString().slice(0, 10);
      patch.hypercare_end = hypercareEnd.toISOString().slice(0, 10);
    } else if (status === 'rejected') {
      patch.operational_accepted_by = null;
      patch.operational_accepted_at = null;
    }
    const update = await client.from('delivery_handovers').update(patch).eq('id', handover.id);
    if (update.error) return { data: null, error: update.error.message };
    const review = await client.from('delivery_handover_reviews').insert({
      tenant_id: session.profile.tenantId,
      project_id: projectId,
      action: parsed.data.action,
      notes: parsed.data.notes,
      reviewer_id: session.userId,
      created_by: session.userId,
    });
    if (review.error) return { data: null, error: review.error.message };
    return getDeliveryHandover(projectId);
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to save handover review' };
  }
}
