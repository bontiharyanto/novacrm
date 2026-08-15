import { requireConfig } from '@/lib/rbac/require-config';

export default async function WorkflowsLayout({ children }: { children: React.ReactNode }) {
  await requireConfig('workflows');
  return children;
}
