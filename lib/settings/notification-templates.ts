'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { isTenantAdminRole, parseAppRole } from '@/lib/rbac/roles';
import { isLocale, type Locale } from '@/lib/preferences';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  defaultNotificationCopy,
  mergeNotificationCopy,
  storedNotificationTemplatesSchema,
  type StoredNotificationTemplates,
} from '@/lib/notifications/copy';
import { normalizePublicUrl } from '@/lib/notifications/public-url';

function canEditTemplates(role: string) {
  const parsed = parseAppRole(role);
  return isTenantAdminRole(parsed) && canRole(parsed, 'update', 'NotificationSettings');
}

export async function getNotificationTemplateEditor(locale: Locale) {
  const session = await getSessionProfile();
  if (!session || !canEditTemplates(session.profile.role)) {
    return { data: null, error: 'Unauthorized' };
  }

  const defaults = defaultNotificationCopy(locale);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('notification_templates')
    .select('templates')
    .eq('tenant_id', session.profile.tenantId)
    .eq('locale', locale)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  const stored = storedNotificationTemplatesSchema.safeParse(data?.templates ?? {});
  const custom = stored.success ? stored.data : {};
  const { data: tenant } = await supabase
    .from('tenants')
    .select('public_url')
    .eq('id', session.profile.tenantId)
    .maybeSingle();
  return {
    data: {
      locale,
      defaults,
      stored: custom,
      merged: mergeNotificationCopy(defaults, custom),
      publicUrl: tenant?.public_url ?? '',
    },
    error: null,
  };
}

export async function saveNotificationTemplates(
  locale: string,
  input: StoredNotificationTemplates,
  publicUrl?: string,
) {
  const session = await getSessionProfile();
  if (!session || !canEditTemplates(session.profile.role)) {
    return { data: null, error: 'Hanya admin yang dapat mengubah template notifikasi.' };
  }
  if (!isLocale(locale)) {
    return { data: null, error: 'Locale tidak valid.' };
  }

  const parsed = storedNotificationTemplatesSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: 'Template tidak valid.' };
  }

  const supabase = await createSupabaseServerClient();
  if (publicUrl !== undefined) {
    const normalized = normalizePublicUrl(publicUrl);
    if (normalized === null) {
      return { data: null, error: 'URL publik tidak valid. Contoh https://desk.perusahaan.id' };
    }
    const { error: urlError } = await supabase
      .from('tenants')
      .update({ public_url: normalized || null })
      .eq('id', session.profile.tenantId);
    if (urlError) {
      return { data: null, error: urlError.message };
    }
  }

  const { error } = await supabase.from('notification_templates').upsert(
    {
      tenant_id: session.profile.tenantId,
      locale,
      templates: parsed.data,
      created_by: session.userId,
    },
    { onConflict: 'tenant_id,locale' },
  );

  if (error) {
    return { data: null, error: error.message };
  }

  return getNotificationTemplateEditor(locale);
}

export async function resetNotificationTemplates(locale: string) {
  const session = await getSessionProfile();
  if (!session || !canEditTemplates(session.profile.role)) {
    return { data: null, error: 'Hanya admin yang dapat mengubah template notifikasi.' };
  }
  if (!isLocale(locale)) {
    return { data: null, error: 'Locale tidak valid.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('notification_templates')
    .delete()
    .eq('tenant_id', session.profile.tenantId)
    .eq('locale', locale);

  if (error) {
    return { data: null, error: error.message };
  }

  return getNotificationTemplateEditor(locale);
}
