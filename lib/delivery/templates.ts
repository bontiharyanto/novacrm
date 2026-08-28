import type { DeliveryPhaseStatus } from '@/lib/delivery/schema';

export type DeliveryPhaseTemplate = {
  key: string;
  title: string;
  sortOrder: number;
  customerVisible: boolean;
};

export const STANDARD_DELIVERY_PHASES: DeliveryPhaseTemplate[] = [
  { key: 'feasibility', title: 'Determine customer order feasibility (Survey)', sortOrder: 0, customerVisible: true },
  { key: 'allocate', title: 'Allocate Resource & Service', sortOrder: 1, customerVisible: true },
  { key: 'install', title: 'Install & Activate Resource', sortOrder: 2, customerVisible: true },
  { key: 'provision', title: 'Service Provisioning', sortOrder: 3, customerVisible: true },
  { key: 'test', title: 'Test Service End-to-End', sortOrder: 4, customerVisible: true },
  { key: 'validate', title: 'CI Verification & Validation', sortOrder: 5, customerVisible: true },
  { key: 'handover', title: 'Handover to Operation', sortOrder: 6, customerVisible: true },
];

export function calculateDeliveryProgress(phases: Array<{ status: DeliveryPhaseStatus }>) {
  if (phases.length === 0) return 0;
  const completed = phases.filter((phase) => phase.status === 'completed' || phase.status === 'cancelled').length;
  return Math.round((completed / phases.length) * 100);
}

export function deriveProjectStatus(phases: Array<{ status: DeliveryPhaseStatus }>) {
  if (phases.length > 0 && phases.every((phase) => phase.status === 'completed' || phase.status === 'cancelled')) {
    return 'completed' as const;
  }
  if (phases.some((phase) => phase.status === 'blocked')) return 'blocked' as const;
  if (phases.some((phase) => phase.status === 'in_progress')) return 'in_progress' as const;
  return 'planned' as const;
}
