import type { Locale } from '@/lib/preferences';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { resolveNotificationLocale } from '@/lib/notifications/locale';
import {
  defaultNotificationCopy,
  mergeNotificationCopy,
  storedNotificationTemplatesSchema,
} from '@/lib/notifications/copy';

export async function loadTenantNotificationTemplates(tenantId: string, locale: Locale) {
  if (!tenantId || !hasServiceRole()) return null;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('notification_templates')
    .select('templates')
    .eq('tenant_id', tenantId)
    .eq('locale', locale)
    .maybeSingle();
  if (error || !data?.templates) return null;
  const parsed = storedNotificationTemplatesSchema.safeParse(data.templates);
  return parsed.success ? parsed.data : null;
}

export async function getMergedNotificationCopy(tenantId: string | undefined, locale?: string | null) {
  const resolved = resolveNotificationLocale(locale);
  const defaults = defaultNotificationCopy(resolved);
  if (!tenantId) return mergeNotificationCopy(defaults, null);
  const stored = await loadTenantNotificationTemplates(tenantId, resolved);
  return mergeNotificationCopy(defaults, stored);
}
