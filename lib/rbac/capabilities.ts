import { z } from 'zod';
import { canRole, type Actions, type AppRole, type Subjects } from '@/lib/rbac/ability';
import { APP_ROLES, isTenantAdminRole } from '@/lib/rbac/roles';

export const CAPABILITY_ACTIONS = ['manage', 'create', 'read', 'update', 'delete'] as const;
export type CapabilityAction = (typeof CAPABILITY_ACTIONS)[number];

export const CAPABILITY_SUBJECTS = [
  'Ticket',
  'Asset',
  'Cmdb',
  'Account',
  'Org',
  'Sla',
  'User',
  'Workflow',
  'Catalog',
  'Governance',
  'Wfm',
  'StaffReview',
  'NotificationSettings',
  'NotificationLog',
  'OperationsReports',
  'OperationsInsights',
  'OperationsAudit',
  'OperationsServiceDesk',
  'OperationsCab',
  'OperationsDashboard',
  'Tenant',
  'Import',
  'Knowledge',
  'Capability',
  'DeliveryProject',
  'DeliveryPhase',
  'DeliveryWorkOrder',
  'DeliveryTask',
  'TaskActivity',
  'TaskDependency',
  'DeliveryReport',
  'DeliveryPublish',
  'DeliveryHandover',
  'OperationalAcceptance',
] as const;
export type CapabilitySubject = (typeof CAPABILITY_SUBJECTS)[number];

export type CapabilityOverride = {
  action: CapabilityAction;
  subject: CapabilitySubject;
  allowed: boolean;
};

export const capabilityUpdateSchema = z.object({
  role: z.enum(APP_ROLES),
  action: z.enum(CAPABILITY_ACTIONS),
  subject: z.enum(CAPABILITY_SUBJECTS),
  allowed: z.boolean(),
});

export type CapabilityUpdate = z.infer<typeof capabilityUpdateSchema>;

export type CapabilityCell = {
  role: AppRole;
  action: CapabilityAction;
  subject: CapabilitySubject;
  allowed: boolean;
  overridden: boolean;
};

type CapabilityRow = {
  role: AppRole;
  action: CapabilityAction;
  subject: CapabilitySubject;
  allowed: boolean;
};

export function defaultCapability(role: AppRole, action: CapabilityAction, subject: CapabilitySubject) {
  return canRole(role, action as Actions, subject as Subjects);
}

export function canConfiguredCapability(
  role: AppRole,
  action: CapabilityAction,
  subject: CapabilitySubject,
  overrides: CapabilityOverride[],
) {
  const override = overrides.find((item) => item.action === action && item.subject === subject);
  return override ? override.allowed : defaultCapability(role, action, subject);
}

export function buildCapabilityMatrix(overrides: CapabilityRow[]): CapabilityCell[] {
  const overrideMap = new Map(
    overrides.map((row) => [`${row.role}:${row.action}:${row.subject}`, row.allowed]),
  );
  return APP_ROLES.flatMap((role) =>
    CAPABILITY_SUBJECTS.flatMap((subject) =>
      CAPABILITY_ACTIONS.map((action) => {
        const key = `${role}:${action}:${subject}`;
        return {
          role,
          action,
          subject,
          allowed: overrideMap.has(key) ? Boolean(overrideMap.get(key)) : defaultCapability(role, action, subject),
          overridden: overrideMap.has(key),
        };
      }),
    ),
  );
}

export function canManageCapabilities(role: AppRole) {
  return isTenantAdminRole(role);
}
