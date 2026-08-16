import { getSessionProfile } from '@/lib/auth/session';
import { requireAccountId } from '@/lib/accounts/scope';
import { isCustomerRole } from '@/lib/rbac/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type EstateDomain = 'network' | 'software' | 'database' | 'datacenter' | 'cctv';

export type PortalEstateItem = {
  kind: 'asset' | 'ci';
  name: string;
  type: string;
  domain: EstateDomain;
};

export type PortalEstate = {
  items: PortalEstateItem[];
  domains: EstateDomain[];
};

function domainFor(kind: 'asset' | 'ci', type: string, name: string, location?: string): EstateDomain | null {
  const hay = `${type} ${name} ${location ?? ''}`.toLowerCase();
  if (/(cctv|camera|nvr|dvr|hikvision|dahua|axis)/.test(hay)) return 'cctv';
  if (/(database|postgres|mysql|oracle|sql|mongo)/.test(hay)) return 'database';
  if (kind === 'ci' && /(application|service|software)/.test(hay)) return 'software';
  if (/(network|wan|lan|switch|firewall|vpn|wifi|router|ap\b)/.test(hay)) return 'network';
  if (/(server|storage|cluster|rack|datacenter|dc-|dc1|dc-1)/.test(hay)) return 'datacenter';
  if (kind === 'asset' && type === 'server') return 'datacenter';
  return null;
}

export async function listPortalEstate(): Promise<PortalEstate> {
  const session = await getSessionProfile();
  if (!session) return { items: [], domains: [] };

  const scoped = await requireAccountId(session);
  if (isCustomerRole(session.profile.role) && !scoped.accountId) {
    return { items: [], domains: [] };
  }
  const supabase = await createSupabaseServerClient();
  let assetQuery = supabase
    .from('assets')
    .select('name, type, location, status')
    .eq('tenant_id', session.profile.tenantId)
    .neq('status', 'retired');
  let ciQuery = supabase
    .from('cmdb_items')
    .select('name, type')
    .eq('tenant_id', session.profile.tenantId);
  if (scoped.accountId) {
    assetQuery = assetQuery.eq('account_id', scoped.accountId);
    ciQuery = ciQuery.eq('account_id', scoped.accountId);
  } else if (isCustomerRole(session.profile.role)) {
    return { items: [], domains: [] };
  }

  const [{ data: assets }, { data: cis }] = await Promise.all([assetQuery.limit(80), ciQuery.limit(80)]);
  const items: PortalEstateItem[] = [];

  for (const row of assets ?? []) {
    const domain = domainFor('asset', String(row.type ?? ''), String(row.name ?? ''), String(row.location ?? ''));
    if (!domain) continue;
    items.push({ kind: 'asset', name: String(row.name), type: String(row.type), domain });
  }
  for (const row of cis ?? []) {
    const domain = domainFor('ci', String(row.type ?? ''), String(row.name ?? ''));
    if (!domain) continue;
    items.push({ kind: 'ci', name: String(row.name), type: String(row.type), domain });
  }

  const domains = Array.from(new Set(items.map((item) => item.domain)));
  return { items: items.slice(0, 40), domains };
}

export function relatedEstate(issue: string, estate: PortalEstate) {
  const hay = issue.toLowerCase();
  return estate.items
    .filter((item) => {
      const name = item.name.toLowerCase();
      if (hay.includes(name) || name.split(/[\s_-]+/).some((bit) => bit.length > 3 && hay.includes(bit))) {
        return true;
      }
      if (item.domain === 'network' && /(lan|wan|vpn|wifi|jaringan|switch|internet)/.test(hay) && /(lan|wan|vpn|wifi|switch|firewall|ap)/.test(name + item.type)) {
        return true;
      }
      if (item.domain === 'software' && /(aplikasi|software|app-|\bapp\b)/.test(hay) && /(app|application|software)/.test(name + item.type)) {
        return true;
      }
      if (item.domain === 'database' && /(database|\bdb\b|postgres|sql)/.test(hay) && /(db|database|sql|postgres)/.test(name + item.type)) {
        return true;
      }
      if (item.domain === 'datacenter' && /(datacenter|data center|rak|listrik|cooling)/.test(hay)) {
        return true;
      }
      if (item.domain === 'cctv' && /(cctv|kamera|camera|nvr|dvr|rekaman|footage)/.test(hay)) {
        return true;
      }
      return false;
    })
    .slice(0, 5);
}
