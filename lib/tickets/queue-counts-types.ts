export type QueueCounts = {
  incident: number;
  /** Open incidents with SLA at risk or breached */
  incidentSlaRisk: number;
  problem: number;
  change: number;
  request: number;
  all: number;
  cab: number;
};
