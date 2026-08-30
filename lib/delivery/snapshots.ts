import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { clockInZone } from '@/lib/reports/schedule-schema';
import { calculateDeliveryProgress } from '@/lib/delivery/templates';

type SnapshotJob = {
  snapshotDate?: string;
};

type ProjectRow = {
  id: string;
  tenant_id: string;
  status: 'planned' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
};

type PhaseRow = {
  id: string;
  project_id: string;
  status: 'planned' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  planned_end?: string | null;
};

type TaskRow = {
  delivery_project_id?: string | null;
  delivery_phase_id?: string | null;
  status: string;
};

type HandoverRow = {
  project_id: string;
  status: string;
};

type HandoverItemRow = {
  project_id: string;
  required: boolean;
  completed: boolean;
};

function isTerminal(status: string) {
  return status === 'done' || status === 'cancelled' || status === 'completed';
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function captureDeliveryProjectSnapshots(job: SnapshotJob = {}) {
  if (!hasServiceRole()) {
    return { ok: false, captured: 0, error: 'Service role is required' };
  }

  const snapshotDate = job.snapshotDate ?? clockInZone('Asia/Jakarta').dateKey;
  if (!isDate(snapshotDate)) {
    return { ok: false, captured: 0, error: 'snapshotDate must be a valid date' };
  }

  const supabase = createSupabaseAdminClient();
  const projectsResult = await supabase.from('delivery_projects').select('id, tenant_id, status');
  if (projectsResult.error) return { ok: false, captured: 0, error: projectsResult.error.message };

  const projects = (projectsResult.data ?? []) as ProjectRow[];
  if (projects.length === 0) return { ok: true, captured: 0, error: null };
  const projectIds = projects.map((project) => project.id);

  const [phasesResult, tasksResult, handoversResult, handoverItemsResult] = await Promise.all([
    supabase.from('delivery_phases').select('id, project_id, status, planned_end').in('project_id', projectIds),
    supabase.from('ticket_tasks').select('delivery_project_id, delivery_phase_id, status').in('delivery_project_id', projectIds),
    supabase.from('delivery_handovers').select('project_id, status').in('project_id', projectIds),
    supabase.from('delivery_handover_items').select('project_id, required, completed').in('project_id', projectIds),
  ]);
  const firstError = phasesResult.error ?? tasksResult.error ?? handoversResult.error ?? handoverItemsResult.error;
  if (firstError) return { ok: false, captured: 0, error: firstError.message };

  const phases = phasesResult.data as PhaseRow[];
  const phaseById = new Map(phases.map((phase) => [phase.id, phase]));
  const tasks = tasksResult.data as TaskRow[];
  const handovers = new Map((handoversResult.data as HandoverRow[]).map((row) => [row.project_id, row]));
  const handoverProgress = new Map<string, { completed: number; required: number }>();
  for (const item of handoverItemsResult.data as HandoverItemRow[]) {
    const current = handoverProgress.get(item.project_id) ?? { completed: 0, required: 0 };
    if (item.required) {
      current.required += 1;
      if (item.completed) current.completed += 1;
    }
    handoverProgress.set(item.project_id, current);
  }

  const rows = projects.map((project) => {
    const projectPhases = phases.filter((phase) => phase.project_id === project.id);
    const projectTasks = tasks.filter((task) => task.delivery_project_id === project.id);
    const overdueTaskCount = projectTasks.filter((task) => {
      if (isTerminal(task.status)) return false;
      const phase = task.delivery_phase_id ? phaseById.get(task.delivery_phase_id) : undefined;
      return Boolean(phase?.planned_end && phase.planned_end < snapshotDate);
    }).length;
    const handover = handovers.get(project.id);
    const handoverCounts = handoverProgress.get(project.id);

    return {
      tenant_id: project.tenant_id,
      project_id: project.id,
      snapshot_date: snapshotDate,
      progress: calculateDeliveryProgress(projectPhases),
      status: project.status,
      phase_count: projectPhases.length,
      completed_phase_count: projectPhases.filter((phase) => isTerminal(phase.status)).length,
      blocked_phase_count: projectPhases.filter((phase) => phase.status === 'blocked').length,
      task_count: projectTasks.length,
      completed_task_count: projectTasks.filter((task) => isTerminal(task.status)).length,
      open_task_count: projectTasks.filter((task) => !isTerminal(task.status)).length,
      overdue_task_count: overdueTaskCount,
      handover_status: handover?.status ?? null,
      handover_progress: handoverCounts && handoverCounts.required > 0
        ? Math.round((handoverCounts.completed / handoverCounts.required) * 100)
        : null,
      created_by: null,
    };
  });

  const result = await supabase
    .from('delivery_project_snapshots')
    .upsert(rows, { onConflict: 'tenant_id,project_id,snapshot_date' });
  if (result.error) return { ok: false, captured: 0, error: result.error.message };
  return { ok: true, captured: rows.length, error: null };
}
