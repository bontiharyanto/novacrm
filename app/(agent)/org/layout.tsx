import { requireConfig } from '@/lib/rbac/require-config';

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  await requireConfig('org');
  return children;
}
