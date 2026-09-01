import type { AppRole } from '@/lib/rbac/roles';

export const NAV_PINS_COOKIE = 'novacrm_nav_pins';

export type NavPin = {
  href: string;
  labelKey: string;
};

export function defaultNavPinsForRole(role: AppRole): NavPin[] {
  switch (role) {
    case 'agent':
    case 'team_lead':
      return [
        { href: '/tickets?type=incident', labelKey: 'incidents' },
        { href: '/tickets?queue=mine', labelKey: 'myTickets' },
      ];
    case 'supervisor':
    case 'manager':
      return [
        { href: '/wfm', labelKey: 'wfm' },
        { href: '/reports', labelKey: 'reports' },
      ];
    default:
      return [];
  }
}

export function parseNavPins(raw: string | null | undefined): NavPin[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as NavPin[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.href === 'string' && typeof item.labelKey === 'string')
      .slice(0, 12);
  } catch {
    return [];
  }
}

export function serializeNavPins(pins: NavPin[]) {
  return JSON.stringify(pins.slice(0, 12));
}
