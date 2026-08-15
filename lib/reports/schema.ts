export type ReportRange = 7 | 30 | 90;
export type ReportPreset = ReportRange | 'custom';
export type ReportExportFormat = 'csv' | 'xlsx' | 'pdf';

export type ReportKpis = {
  open: number;
  unassigned: number;
  slaBreached: number;
  slaRisk: number;
  cabReview: number;
  emergencyChanges: number;
  warrantySoon: number;
  catalogPublished: number;
  frtMinutes: number;
  mttrMinutes: number;
  backlogAging: number;
  ucBreached: number;
  csatAverage: number;
  csatCount: number;
};

export type NamedCount = { id: string; label: string; value: number };

export type VendorScore = {
  id: string;
  label: string;
  partyKind: 'vendor' | 'principal';
  contractName?: string;
  open: number;
  olaBreached: number;
  avgQueueMinutes: number;
  creditMinutes: number;
};

export type ReportGroupMeta = {
  name: string;
  partyKind?: 'internal' | 'vendor' | 'principal' | string;
  partyName?: string;
  ucId?: string | null;
  ucName?: string;
};

export type TrendPoint = { day: string; opened: number; closed: number };

export type AgingRow = {
  id: string;
  number: string;
  title: string;
  type: string;
  status: string;
  assigneeName?: string;
  ageDays: number;
  dueDate?: string;
};

export type ReportSnapshot = {
  rangeDays: number;
  preset: ReportPreset;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  kpis: ReportKpis;
  byType: NamedCount[];
  byStatus: NamedCount[];
  byPriority: NamedCount[];
  trend: TrendPoint[];
  assignees: NamedCount[];
  byGroup: NamedCount[];
  byHoldReason: NamedCount[];
  byVendor: VendorScore[];
  byUc: VendorScore[];
  aging: AgingRow[];
};
