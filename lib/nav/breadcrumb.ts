import type { Dictionary } from '@/lib/i18n';
import { isTicketType } from '@/lib/tickets/process';

export type BreadcrumbSegment = {
  label: string;
  href?: string;
};

const STATIC_SEGMENTS: Record<string, keyof Dictionary['nav']> = {
  dashboard: 'dashboard',
  reports: 'reports',
  insights: 'insights',
  audit: 'audit',
  assistant: 'assistant',
  tickets: 'allTickets',
  cab: 'cab',
  assets: 'assets',
  cmdb: 'cmdb',
  catalog: 'catalog',
  workflows: 'automation',
  governance: 'governance',
  import: 'import',
  knowledge: 'knowledge',
  accounts: 'accounts',
  org: 'organization',
  users: 'users',
  sla: 'sla',
  wfm: 'wfm',
  delivery: 'delivery',
  tenants: 'tenants',
  settings: 'tenantSettings',
};

const WFM_SEGMENTS: Record<string, keyof Dictionary['nav']> = {
  roster: 'wfmMyRoster',
  swaps: 'wfmSwaps',
  shifts: 'wfmShifts',
  skills: 'wfmSkills',
  oncall: 'wfmOncall',
  forecast: 'wfmForecast',
  reviews: 'wfmReviews',
};

function ticketTypeLabel(t: Dictionary, type: string | null): keyof Dictionary['nav'] | null {
  if (type === 'incident') return 'incidents';
  if (type === 'problem') return 'problems';
  if (type === 'change') return 'changes';
  if (type === 'request') return 'requests';
  return null;
}

export function breadcrumbForPath(
  pathname: string,
  searchParams: URLSearchParams,
  t: Dictionary,
): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [];
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length === 0) return segments;

  const root = parts[0];
  const isDesk =
    root === 'tickets' ||
    root === 'cab' ||
    (root === 'tickets' && parts[1] === 'new');

  if (isDesk || root === 'tickets' || root === 'cab') {
    segments.push({ label: t.nav.serviceDesk, href: '/tickets' });
  } else if (root === 'wfm' || root === 'dashboard' || root === 'knowledge' || root === 'delivery') {
    segments.push({ label: t.nav.operations, href: '/dashboard' });
  } else if (root === 'reports' || root === 'insights' || root === 'audit' || root === 'assistant') {
    segments.push({ label: t.nav.analytics, href: '/reports' });
  } else if (
    ['accounts', 'org', 'users', 'sla', 'catalog', 'workflows', 'governance', 'import'].includes(root)
  ) {
    segments.push({ label: t.nav.administration, href: '/accounts' });
  } else if (root === 'assets' || root === 'cmdb') {
    segments.push({ label: t.nav.inventory, href: '/assets' });
  } else if (root === 'tenants' || root === 'settings') {
    segments.push({ label: t.nav.platform, href: '/tenants' });
  }

  if (root === 'tickets') {
    const type = searchParams.get('type');
    const queue = searchParams.get('queue');
    if (queue === 'mine') {
      segments.push({ label: t.nav.myTickets, href: '/tickets?queue=mine' });
      return segments;
    }
    const typeKey = type ? ticketTypeLabel(t, type) : null;
    if (searchParams.get('sla') === 'risk') {
      segments.push({ label: t.tickets.slaRisk, href: `/tickets?type=${type || 'incident'}&sla=risk` });
      return segments;
    }
    if (typeKey && isTicketType(type)) {
      segments.push({ label: t.nav[typeKey], href: `/tickets?type=${type}` });
      return segments;
    }
    if (parts[1] === 'new') {
      segments.push({ label: t.common.newTicket });
      return segments;
    }
    if (parts[1]) {
      segments.push({ label: t.nav.allTickets, href: '/tickets' });
      segments.push({ label: t.tickets.detailBreadcrumb });
      return segments;
    }
    segments.push({ label: t.nav.allTickets });
    return segments;
  }

  if (root === 'wfm') {
    segments.push({ label: t.nav.wfm, href: '/wfm' });
    const sub = parts[1];
    if (sub && WFM_SEGMENTS[sub]) {
      segments.push({ label: t.nav[WFM_SEGMENTS[sub]] });
    }
    return segments;
  }

  if (root === 'delivery') {
    segments.push({ label: t.nav.delivery, href: '/delivery/dashboard' });
    if (parts[1] === 'reports') segments.push({ label: t.nav.deliveryReports });
    else if (parts[1] && parts[1] !== 'dashboard') segments.push({ label: t.common.delivery });
    return segments;
  }

  const navKey = STATIC_SEGMENTS[root];
  if (navKey) {
    segments.push({ label: t.nav[navKey] });
  }

  if (parts[1] === 'new') {
    segments.push({ label: t.common.new });
  } else if (parts[1] && parts[1] !== 'new' && navKey) {
    segments.push({ label: t.common.detail });
  }

  return segments;
}
