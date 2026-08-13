export type AssetTypeOption = {
  id: string;
  slug: string;
  label: string;
  isSystem?: boolean;
};

export const DEFAULT_ASSET_TYPES: AssetTypeOption[] = [
  { id: 'laptop', slug: 'laptop', label: 'Laptop', isSystem: true },
  { id: 'server', slug: 'server', label: 'Server', isSystem: true },
  { id: 'network', slug: 'network', label: 'Network', isSystem: true },
  { id: 'printer', slug: 'printer', label: 'Printer', isSystem: true },
  { id: 'mobile', slug: 'mobile', label: 'Mobile', isSystem: true },
];

export const ASSET_TYPES = DEFAULT_ASSET_TYPES.map((item) => item.slug);

export function formatAssetTypeLabel(slug: string, catalog: AssetTypeOption[] = DEFAULT_ASSET_TYPES) {
  return catalog.find((item) => item.slug === slug || item.id === slug)?.label ?? slug.replace(/_/g, ' ');
}
