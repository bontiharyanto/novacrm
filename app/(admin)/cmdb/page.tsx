import { AdminShell } from '@/components/layout/admin-shell';
import { CmdbDashboard } from '@/components/cmdb/cmdb-dashboard';

export default function CmdbPage() {
  return (
    <AdminShell>
      <CmdbDashboard />
    </AdminShell>
  );
}
