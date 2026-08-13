import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';

export type AppRole = 'admin' | 'agent' | 'customer';
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
  | 'NotificationSettings'
  | 'NotificationLog'
  | 'Tenant'
  | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export function defineAbilityFor(role: AppRole): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (role === 'admin') {
    can('manage', 'all');
    return build();
  }

  if (role === 'agent') {
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
    can('read', 'User');
    can('read', 'Workflow');
    can('create', 'Workflow');
    can('update', 'Workflow');
    can('create', 'Catalog');
    can('read', 'Catalog');
    can('update', 'Catalog');
    can('create', 'Governance');
    can('read', 'Governance');
    can('update', 'Governance');
    can('read', 'NotificationLog');
    cannot('manage', 'NotificationSettings');
    cannot('update', 'NotificationSettings');
    return build();
  }

  can('create', 'Ticket');
  can('read', 'Ticket');
  can('update', 'Ticket');
  can('create', 'Governance');
  can('read', 'Governance');
  return build();
}

export function canRole(role: AppRole, action: Actions, subject: Subjects) {
  return defineAbilityFor(role).can(action, subject);
}
