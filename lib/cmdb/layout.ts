import type { CmdbItem } from '@/lib/cmdb/schema';

const COMPUTE_TYPES = new Set(['server', 'database', 'cluster', 'load_balancer', 'storage', 'cloud']);
const SERVICE_TYPES = new Set(['service', 'application', 'business_service']);

export function topologyLayer(item: CmdbItem): number {
  const role = (item.attributes?.role ?? '').toLowerCase();
  if (item.type === 'network') {
    if (role === 'wan' || role === 'circuit') return 0;
    if (role === 'edge' || role === 'firewall') return 1;
    if (role === 'core') return 2;
    return 3;
  }
  if (COMPUTE_TYPES.has(item.type)) return 4;
  if (SERVICE_TYPES.has(item.type)) return 5;
  return 6;
}

export function topologySite(item: CmdbItem) {
  return item.attributes?.site?.trim() || 'default';
}

export function layoutCmdbNodes(items: CmdbItem[]): Map<string, { x: number; y: number }> {
  const sites = Array.from(new Set(items.map(topologySite))).sort();
  const positions = new Map<string, { x: number; y: number }>();

  for (const item of items) {
    const siteIndex = Math.max(0, sites.indexOf(topologySite(item)));
    const layer = topologyLayer(item);
    const siblings = items
      .filter((candidate) => topologySite(candidate) === topologySite(item) && topologyLayer(candidate) === layer)
      .sort((a, b) => a.name.localeCompare(b.name));
    const col = siblings.findIndex((candidate) => candidate.id === item.id);
    positions.set(item.id, {
      x: siteIndex * 840 + Math.max(0, col) * 220,
      y: layer * 150,
    });
  }

  return positions;
}

export function cmdbNodeStyle(type: string): { border: string; background: string } {
  if (type === 'network') return { border: '#3b82f6', background: '#18181b' };
  if (COMPUTE_TYPES.has(type)) return { border: '#71717a', background: '#18181b' };
  if (SERVICE_TYPES.has(type)) return { border: '#38bdf8', background: '#18181b' };
  return { border: '#3f3f46', background: '#18181b' };
}
