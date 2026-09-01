export type IpSegmentRef = {
  cidr: string;
  cmdb_item_id?: string | null;
};

function ipv4ToInt(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    value = (value << 8) + n;
  }
  return value >>> 0;
}

export function ipInCidr(ip: string, cidr: string): boolean {
  const [networkPart, prefixPart] = cidr.trim().split('/');
  const prefix = Number(prefixPart);
  const ipInt = ipv4ToInt(ip);
  const networkInt = ipv4ToInt(networkPart);
  if (ipInt == null || networkInt == null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }
  if (prefix === 0) return true;
  const mask = prefix === 32 ? 0xffffffff : (~((1 << (32 - prefix)) - 1)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

export function segmentsOnAffectedCis(affected: Set<string>, segments: IpSegmentRef[]) {
  return segments.filter((segment) => segment.cmdb_item_id && affected.has(segment.cmdb_item_id));
}

export function ipMatchesAffectedSubnets(
  ip: string | undefined,
  affected: Set<string>,
  segments: IpSegmentRef[],
): boolean {
  const needle = ip?.trim();
  if (!needle) return false;
  const relevant = segmentsOnAffectedCis(affected, segments);
  return relevant.some((segment) => ipInCidr(needle, segment.cidr));
}

export function estateIpsInAffectedSubnets(
  items: Array<{ id: string; attributes?: Record<string, unknown> | null }>,
  affected: Set<string>,
  segments: IpSegmentRef[],
): boolean {
  const relevant = segmentsOnAffectedCis(affected, segments);
  if (relevant.length === 0) return false;

  for (const item of items) {
    const ip = String(item.attributes?.ip ?? '').trim();
    if (!ip) continue;
    if (relevant.some((segment) => ipInCidr(ip, segment.cidr))) {
      return true;
    }
  }
  return false;
}
