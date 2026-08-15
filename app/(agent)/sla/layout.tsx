import { requireConfig } from '@/lib/rbac/require-config';

export default async function SlaLayout({ children }: { children: React.ReactNode }) {
  await requireConfig('sla');
  return children;
}
