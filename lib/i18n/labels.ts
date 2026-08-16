import type { Dictionary } from '@/lib/i18n/en';
import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/preferences';
import { isTicketType, stageLabel, ticketTypeMeta, type TicketType } from '@/lib/tickets/process';
import type { TicketStatus } from '@/lib/tickets/schema';
import type { AppRole } from '@/lib/rbac/roles';
import type { DsarStatus, DsarType } from '@/lib/governance/schema';

export function localizedType(t: Dictionary, type: string | null | undefined) {
  if (isTicketType(type)) return t.tickets.type[type];
  return type ?? 'Ticket';
}

export function localizedStage(t: Dictionary, type: string | null | undefined, status: TicketStatus) {
  const process = isTicketType(type) ? type : 'incident';
  return t.tickets.stage[process][status] ?? stageLabel(process, status);
}

export function localizedTypeMeta(t: Dictionary, type: TicketType) {
  const meta = ticketTypeMeta[type];
  return {
    ...meta,
    label: t.tickets.type[type],
    description: t.tickets.typeHint[type],
  };
}

export function localizedRole(t: Dictionary, role: AppRole) {
  return t.roles[role];
}

export function localizedRoleHint(t: Dictionary, role: AppRole) {
  return t.roles.hint[role];
}

export function dictionaryFor(locale: Locale) {
  return getDictionary(locale);
}

export function localizedDsarType(t: Dictionary, type: string) {
  return t.portal.dsarType[type as DsarType] ?? type;
}

export function localizedDsarHint(t: Dictionary, type: string) {
  return t.portal.dsarTypeHint[type as DsarType] ?? type;
}

export function localizedDsarStatus(t: Dictionary, status: string) {
  return t.portal.dsarStatus[status as DsarStatus] ?? status.replace('_', ' ');
}
