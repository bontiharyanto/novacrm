import type { AppRole } from '@/lib/rbac/roles';

export type NavSectionId =
  | 'favorites'
  | 'operations'
  | 'serviceDesk'
  | 'inventory'
  | 'analytics'
  | 'administration'
  | 'platform';

export type NavFolderId = 'wfm' | 'people';

export function defaultNavCollapseForRole(role: AppRole): Partial<Record<NavSectionId, boolean>> {
  switch (role) {
    case 'agent':
    case 'team_lead':
      return {
        analytics: true,
        administration: true,
        platform: true,
      };
    case 'supervisor':
      return { platform: true };
    default:
      return {};
  }
}

export function normalizeNavCollapseCookie(
  parsed: Partial<Record<string, boolean>>,
): Partial<Record<NavSectionId, boolean>> {
  const raw = { ...parsed } as Partial<Record<NavSectionId, boolean>> & {
    overview?: boolean;
    configuration?: boolean;
  };

  if (typeof raw.overview === 'boolean') {
    raw.operations = raw.overview;
    delete raw.overview;
  }
  if (typeof raw.configuration === 'boolean') {
    raw.inventory = raw.configuration;
    raw.administration = raw.configuration;
    delete raw.configuration;
  }

  return raw;
}
