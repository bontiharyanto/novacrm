export type CiClass = {
  id: string;
  slug: string;
  label: string;
  hint: string;
  groupKey: 'offering' | 'infra' | 'edge' | 'custom';
  isSystem?: boolean;
};

export const CI_CLASS_GROUP_META: Array<{ id: CiClass['groupKey']; label: string }> = [
  { id: 'offering', label: 'Service offering' },
  { id: 'infra', label: 'Infrastructure' },
  { id: 'edge', label: 'End user' },
  { id: 'custom', label: 'Custom' },
];

export const DEFAULT_CI_CLASSES: CiClass[] = [
  { id: 'business_service', slug: 'business_service', groupKey: 'offering', label: 'Business service', hint: 'What users consume', isSystem: true },
  { id: 'application', slug: 'application', groupKey: 'offering', label: 'Application', hint: 'Software product', isSystem: true },
  { id: 'service', slug: 'service', groupKey: 'offering', label: 'Tech service', hint: 'Runtime app or worker', isSystem: true },
  { id: 'server', slug: 'server', groupKey: 'infra', label: 'Server', hint: 'Host or VM', isSystem: true },
  { id: 'database', slug: 'database', groupKey: 'infra', label: 'Database', hint: 'Data store', isSystem: true },
  { id: 'storage', slug: 'storage', groupKey: 'infra', label: 'Storage', hint: 'SAN, NAS, bucket', isSystem: true },
  { id: 'network', slug: 'network', groupKey: 'infra', label: 'Network', hint: 'Switch, firewall, link', isSystem: true },
  { id: 'load_balancer', slug: 'load_balancer', groupKey: 'infra', label: 'Load balancer', hint: 'Traffic entry', isSystem: true },
  { id: 'cluster', slug: 'cluster', groupKey: 'infra', label: 'Cluster', hint: 'HA or Kubernetes', isSystem: true },
  { id: 'cloud', slug: 'cloud', groupKey: 'infra', label: 'Cloud', hint: 'VPC, instance, PaaS', isSystem: true },
  { id: 'endpoint', slug: 'endpoint', groupKey: 'edge', label: 'Endpoint', hint: 'Laptop or device', isSystem: true },
  { id: 'printer', slug: 'printer', groupKey: 'edge', label: 'Printer', hint: 'Print queue', isSystem: true },
];

export function groupCiClasses(items: CiClass[]) {
  return CI_CLASS_GROUP_META.map((group) => ({
    ...group,
    items: items.filter((item) => item.groupKey === group.id),
  })).filter((group) => group.items.length > 0 || group.id === 'custom');
}

export function getCiClass(id: string, catalog: CiClass[] = DEFAULT_CI_CLASSES) {
  return catalog.find((item) => item.slug === id || item.id === id);
}

export function formatCiClassLabel(id: string, catalog: CiClass[] = DEFAULT_CI_CLASSES) {
  return getCiClass(id, catalog)?.label ?? id.replace(/_/g, ' ');
}
