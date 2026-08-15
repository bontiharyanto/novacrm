import { requireConfig } from '@/lib/rbac/require-config';

export default async function GovernanceLayout({ children }: { children: React.ReactNode }) {
  await requireConfig('governance');
  return children;
}
