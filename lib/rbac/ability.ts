import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';
import { isCustomerRole, type AppRole } from '@/lib/rbac/roles';

export type { AppRole } from '@/lib/rbac/roles';
export {
  APP_ROLES,
  STAFF_ROLES,
  ROLE_LABEL,
  ROLE_HINT,
  assignableRoles,
  canAssignRole,
  homePathForRole,
  isCustomerRole,
  isStaffRole,
  isTenantAdminRole,
  parseAppRole,
} from '@/lib/rbac/roles';

export type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete';
export type Subjects =
  | 'Ticket'
  | 'Asset'
  | 'Cmdb'
  | 'Account'
  | 'Org'
  | 'Sla'
  | 'User'
  | 'Workflow'
  | 'Catalog'
  | 'Governance'
  | 'Wfm'
  | 'StaffReview'
  | 'NotificationSettings'
  | 'NotificationLog'
  | 'Tenant'
  | 'Import'
  | 'Knowledge'
  | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

function grantDeskOps(can: AbilityBuilder<AppAbility>['can']) {
  can('create', 'Ticket');
  can('read', 'Ticket');
  can('update', 'Ticket');
  can('create', 'Asset');
  can('read', 'Asset');
  can('update', 'Asset');
  can('create', 'Cmdb');
  can('read', 'Cmdb');
  can('update', 'Cmdb');
  can('read', 'Account');
  can('read', 'Org');
  can('read', 'Sla');
  can('read', 'Catalog');
  can('read', 'Wfm');
  can('update', 'Wfm');
  can('read', 'StaffReview');
  can('read', 'Governance');
  can('read', 'NotificationLog');
  can('read', 'Knowledge');
  can('create', 'Knowledge');
  can('update', 'Knowledge');
}

export function defineAbilityFor(role: AppRole): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (role === 'superadmin') {
    can('manage', 'all');
    return build();
  }

  if (role === 'admin') {
    can('manage', 'all');
    cannot('manage', 'Tenant');
    cannot('read', 'Tenant');
    cannot('create', 'Tenant');
    cannot('update', 'Tenant');
    cannot('delete', 'Tenant');
    return build();
  }

  if (role === 'manager') {
    grantDeskOps(can);
    can('create', 'Account');
    can('update', 'Account');
    can('create', 'Org');
    can('update', 'Org');
    can('create', 'Sla');
    can('update', 'Sla');
    can('read', 'User');
    can('create', 'User');
    can('update', 'User');
    can('create', 'Catalog');
    can('update', 'Catalog');
    can('read', 'Workflow');
    can('create', 'Workflow');
    can('update', 'Workflow');
    can('delete', 'Workflow');
    can('create', 'Governance');
    can('update', 'Governance');
    can('create', 'Wfm');
    can('manage', 'Wfm');
    can('create', 'StaffReview');
    can('update', 'StaffReview');
    can('create', 'Import');
    can('read', 'Import');
    return build();
  }

  if (role === 'supervisor') {
    grantDeskOps(can);
    can('read', 'User');
    can('create', 'User');
    can('update', 'User');
    can('create', 'Sla');
    can('update', 'Sla');
    can('create', 'Catalog');
    can('update', 'Catalog');
    can('read', 'Workflow');
    can('update', 'Governance');
    can('create', 'Wfm');
    can('manage', 'Wfm');
    can('create', 'StaffReview');
    can('update', 'StaffReview');
    return build();
  }

  if (role === 'team_lead') {
    grantDeskOps(can);
    can('read', 'User');
    can('read', 'Workflow');
    can('create', 'StaffReview');
    can('update', 'StaffReview');
    return build();
  }

  if (role === 'agent') {
    grantDeskOps(can);
    cannot('manage', 'NotificationSettings');
    cannot('update', 'NotificationSettings');
    return build();
  }

  can('create', 'Ticket');
  can('read', 'Ticket');
  can('update', 'Ticket');
  can('read', 'Catalog');
  can('read', 'Knowledge');
  can('create', 'Governance');
  can('read', 'Governance');
  if (!isCustomerRole(role)) {
    cannot('manage', 'all');
  }
  return build();
}

export function canRole(role: AppRole, action: Actions, subject: Subjects) {
  return defineAbilityFor(role).can(action, subject);
}

/** Admin/config screens. `read` on these subjects is for desk work, not the module UI. */
export const CONFIG_MODULES = {
  accounts: { action: 'update', subject: 'Account' },
  org: { action: 'update', subject: 'Org' },
  users: { action: 'read', subject: 'User' },
  sla: { action: 'update', subject: 'Sla' },
  catalog: { action: 'update', subject: 'Catalog' },
  governance: { action: 'update', subject: 'Governance' },
  workflows: { action: 'read', subject: 'Workflow' },
  import: { action: 'create', subject: 'Import' },
  tenants: { action: 'read', subject: 'Tenant' },
} as const;

export type ConfigModule = keyof typeof CONFIG_MODULES;

export function canAccessConfig(role: AppRole, module: ConfigModule) {
  const rule = CONFIG_MODULES[module];
  return canRole(role, rule.action, rule.subject);
}
