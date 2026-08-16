import { listCatalogItems } from '@/lib/catalog/actions';
import { listPortalEstate, type EstateDomain } from '@/lib/assistant/portal-estate';
import { SYMPTOM_CHIPS } from '@/lib/assistant/portal-details';

export type PortalTicketSuggestion = {
  id: string;
  label: string;
  prompt: string;
  href?: string;
  domain?: EstateDomain;
};

const DOMAIN_SLUGS: Record<EstateDomain, string[]> = {
  network: ['network', 'lan-switch-down', 'wan-internet-down', 'vpn-cannot-connect', 'vpn-access'],
  software: ['software', 'app-error', 'install-approved-software', 'install-software'],
  database: ['database', 'database-unavailable', 'database-access'],
  datacenter: ['datacenter', 'dc-facility-issue', 'dc-rack-access'],
  cctv: ['cctv', 'cctv-camera-offline', 'cctv-image-quality', 'cctv-nvr-down', 'cctv-footage-request', 'cctv-install'],
};

export async function listPortalTicketSuggestions(locale: 'en' | 'id' = 'id'): Promise<PortalTicketSuggestion[]> {
  const [items, estate] = await Promise.all([listCatalogItems(), listPortalEstate()]);
  const active = items.filter((item) => item.isActive);
  const domains = estate.domains;

  const ranked = active
    .map((item) => {
      const slug = item.slug;
      const category = (item.categoryName ?? '').toLowerCase();
      const domain = (Object.keys(DOMAIN_SLUGS) as EstateDomain[]).find(
        (key) => DOMAIN_SLUGS[key].includes(slug) || category.includes(key),
      );
      const owned = Boolean(domain && domains.includes(domain));
      return {
        id: item.id,
        label: item.name,
        prompt: item.name,
        domain,
        score: owned ? 2 : 1,
      };
    })
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

  const picked = ranked.slice(0, 10).map(({ id, label, prompt, domain }) => ({ id, label, prompt, domain }));
  if (picked.length > 0) return picked;

  return SYMPTOM_CHIPS.slice(0, 8).map((chip) => ({
    id: chip.id,
    label: chip.label,
    prompt: locale === 'id' ? chip.prompt : chip.prompt,
  }));
}
