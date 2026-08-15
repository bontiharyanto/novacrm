import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isTenantAdminRole } from '@/lib/rbac/roles';
import { getPreferences } from '@/lib/preferences/server';
import { getNotificationTemplateEditor } from '@/lib/settings/notification-templates';
import { NotificationTemplatesForm } from '@/components/settings/notification-templates-form';

export default async function NotificationTemplatesPage() {
  const session = await getSessionProfile();
  if (!session || !isTenantAdminRole(session.profile.role)) {
    redirect('/dashboard');
  }

  const locale = getPreferences().locale;
  const result = await getNotificationTemplateEditor(locale);
  if (result.error || !result.data) {
    redirect('/settings');
  }

  return (
    <NotificationTemplatesForm
      initialLocale={locale}
      initialStored={result.data.stored}
      initialPublicUrl={result.data.publicUrl}
    />
  );
}
