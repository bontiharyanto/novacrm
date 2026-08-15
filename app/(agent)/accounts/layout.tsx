import { requireConfig } from '@/lib/rbac/require-config';

export default async function AccountsLayout({ children }: { children: React.ReactNode }) {
  await requireConfig('accounts');
  return children;
}
