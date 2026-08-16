export const TICKETS_CHANGED_EVENT = 'novacrm:tickets-changed';

export function emitTicketsChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(TICKETS_CHANGED_EVENT));
}
