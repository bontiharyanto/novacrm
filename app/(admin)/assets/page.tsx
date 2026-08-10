import { AdminShell } from '@/components/layout/admin-shell';
import { AssetDashboard } from '@/components/asset/asset-dashboard';

export default function AssetPage() {
  return (
    <AdminShell>
      <AssetDashboard />
    </AdminShell>
  );
}
