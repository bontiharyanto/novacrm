import type { AppRole } from '@/lib/rbac/roles';

export const DELIVERY_NAV_ROLES: AppRole[] = ['pm_delivery', 'dco', 'manager', 'admin', 'superadmin'];

export function showsDeliveryNav(role: AppRole) {
  return DELIVERY_NAV_ROLES.includes(role);
}
