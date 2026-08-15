import { requireConfig } from '@/lib/rbac/require-config';

export default async function ImportLayout({ children }: { children: React.ReactNode }) {
  await requireConfig('import');
  return children;
}
