import { requireConfig } from '@/lib/rbac/require-config';

export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  await requireConfig('catalog');
  return children;
}
