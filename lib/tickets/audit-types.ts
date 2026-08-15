export type TicketAuditEvent = {
  id: string;
  ticketId: string;
  actorName?: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
};
