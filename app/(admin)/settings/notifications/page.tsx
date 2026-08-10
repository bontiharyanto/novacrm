import { AdminShell } from '@/components/layout/admin-shell';
import { NotificationSettingsForm } from '@/components/settings/notification-settings-form';

export default function NotificationSettingsPage() {
  return (
    <AdminShell>
      <NotificationSettingsForm />
    </AdminShell>
  );
}
