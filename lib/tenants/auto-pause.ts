import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { isTenantLoginBlocked } from '@/lib/tenants/lifecycle';

export async function applyExpiredTenants() {
  if (!hasServiceRole()) {
    return { ok: false, paused: 0, error: 'Service role is not configured' };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('tenants')
    .select('id, status, is_protected, expires_at, grace_days, auto_pause_on_expiry')
    .eq('status', 'active')
    .eq('auto_pause_on_expiry', true)
    .eq('is_protected', false)
    .not('expires_at', 'is', null);

  if (error) return { ok: false, paused: 0, error: error.message };

  const due = (data ?? []).filter((row) =>
    isTenantLoginBlocked({
      status: 'active',
      isProtected: Boolean(row.is_protected),
      expiresAt: row.expires_at as string | null,
      graceDays: Number(row.grace_days ?? 7),
    }),
  );

  if (!due.length) return { ok: true, paused: 0, error: null };

  const { error: updateError } = await admin
    .from('tenants')
    .update({ status: 'paused' })
    .in(
      'id',
      due.map((row) => row.id as string),
    );

  if (updateError) return { ok: false, paused: 0, error: updateError.message };
  return { ok: true, paused: due.length, error: null };
}
