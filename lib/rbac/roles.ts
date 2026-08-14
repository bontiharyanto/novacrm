export const APP_ROLES = [
  'customer',
  'agent',
  'team_lead',
  'supervisor',
  'manager',
  'admin',
  'superadmin',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const STAFF_ROLES = [
  'agent',
  'team_lead',
  'supervisor',
  'manager',
  'admin',
  'superadmin',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_RANK: Record<AppRole, number> = {
  customer: 0,
  agent: 10,
  team_lead: 20,
  supervisor: 30,
  manager: 40,
  admin: 50,
  superadmin: 60,
};

const ROLE_SET = new Set<string>(APP_ROLES);
const STAFF_SET = new Set<string>(STAFF_ROLES);

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && ROLE_SET.has(value);
}

export function parseAppRole(value: unknown): AppRole {
  return isAppRole(value) ? value : 'customer';
}

export function isCustomerRole(role: string | null | undefined): boolean {
  return role === 'customer';
}

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return typeof role === 'string' && STAFF_SET.has(role);
}

export function isTenantAdminRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'superadmin';
}

export function homePathForRole(role: string | null | undefined): string {
  return isCustomerRole(role) ? '/portal' : '/dashboard';
}

export function canAssignRole(actor: AppRole, target: AppRole): boolean {
  if (actor === 'superadmin') return true;
  if (actor === 'admin') return target !== 'superadmin';
  if (actor === 'manager') {
    return target === 'customer' || target === 'agent' || target === 'team_lead' || target === 'supervisor';
  }
  if (actor === 'supervisor') {
    return target === 'customer' || target === 'agent';
  }
  return false;
}

export function assignableRoles(actor: AppRole): AppRole[] {
  return APP_ROLES.filter((role) => canAssignRole(actor, role));
}

export const ROLE_LABEL: Record<AppRole, string> = {
  customer: 'Customer',
  agent: 'Agent',
  team_lead: 'Team lead',
  supervisor: 'Supervisor',
  manager: 'Manager',
  admin: 'Admin',
  superadmin: 'Superadmin',
};

export const ROLE_HINT: Record<AppRole, string> = {
  customer: 'Portal only — own tickets and catalog',
  agent: 'Service desk — tickets, assets, CMDB on assigned accounts',
  team_lead: 'Queue lead — assign, escalate, read users and WFM',
  supervisor: 'SPV — SLA, WFM roster, catalog maintain',
  manager: 'Ops manager — accounts, org, users, import, workflows',
  admin: 'Tenant admin — settings, integrations, all desk modules',
  superadmin: 'Platform — all tenants and roles',
};
