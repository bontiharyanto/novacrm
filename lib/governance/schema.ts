import { z } from 'zod';

export const lawfulBasisSchema = z.enum([
  'consent',
  'contract',
  'legal_obligation',
  'vital_interest',
  'public_interest',
  'legitimate_interest',
]);

export const ropaStatusSchema = z.enum(['draft', 'active', 'retired']);
export const dsarTypeSchema = z.enum([
  'access',
  'rectification',
  'erasure',
  'restriction',
  'portability',
  'objection',
]);
export const dsarStatusSchema = z.enum([
  'received',
  'verifying',
  'in_progress',
  'waiting',
  'completed',
  'rejected',
]);
export const breachStatusSchema = z.enum(['detected', 'contained', 'notified', 'closed']);
export const breachSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const DATA_CATEGORIES = [
  { id: 'identity', label: 'Identity' },
  { id: 'contact', label: 'Contact' },
  { id: 'employment', label: 'Employment' },
  { id: 'credentials', label: 'Credentials' },
  { id: 'location', label: 'Location' },
  { id: 'financial', label: 'Financial' },
  { id: 'special', label: 'Specific / sensitive' },
] as const;

export const DATA_SUBJECTS = [
  { id: 'employee', label: 'Employee' },
  { id: 'customer', label: 'Customer' },
  { id: 'vendor', label: 'Vendor' },
  { id: 'visitor', label: 'Visitor' },
] as const;

export const LAWFUL_BASES: Array<{ id: z.infer<typeof lawfulBasisSchema>; label: string; hint: string }> = [
  { id: 'consent', label: 'Consent', hint: 'Pasal 20 ayat (2) a' },
  { id: 'contract', label: 'Contract', hint: 'Pasal 20 ayat (2) b' },
  { id: 'legal_obligation', label: 'Legal obligation', hint: 'Pasal 20 ayat (2) c' },
  { id: 'vital_interest', label: 'Vital interest', hint: 'Pasal 20 ayat (2) d' },
  { id: 'public_interest', label: 'Public interest', hint: 'Pasal 20 ayat (2) e' },
  { id: 'legitimate_interest', label: 'Legitimate interest', hint: 'Pasal 20 ayat (2) f' },
];

export const DSAR_TYPES: Array<{ id: z.infer<typeof dsarTypeSchema>; label: string; hint: string }> = [
  { id: 'access', label: 'Access', hint: 'Copy of personal data' },
  { id: 'rectification', label: 'Rectification', hint: 'Correct inaccurate data' },
  { id: 'erasure', label: 'Erasure', hint: 'Delete when no longer needed' },
  { id: 'restriction', label: 'Restriction', hint: 'Limit processing' },
  { id: 'portability', label: 'Portability', hint: 'Export in machine-readable form' },
  { id: 'objection', label: 'Objection', hint: 'Object to processing' },
];

export const DSAR_STAGES: Array<{ status: z.infer<typeof dsarStatusSchema>; label: string }> = [
  { status: 'received', label: 'Received' },
  { status: 'verifying', label: 'Verify identity' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'waiting', label: 'Waiting' },
  { status: 'completed', label: 'Completed' },
];

export const BREACH_STAGES: Array<{ status: z.infer<typeof breachStatusSchema>; label: string }> = [
  { status: 'detected', label: 'Detected' },
  { status: 'contained', label: 'Contained' },
  { status: 'notified', label: 'Notified' },
  { status: 'closed', label: 'Closed' },
];

export const privacySettingsSchema = z.object({
  dpoName: z.string().max(120).optional(),
  dpoEmail: z.string().email().optional().or(z.literal('')),
  dpoPhone: z.string().max(40).optional(),
  controllerName: z.string().max(200).optional(),
  controllerAddress: z.string().max(500).optional(),
  noticeTitle: z.string().max(200).optional(),
  noticeBody: z.string().max(20000).optional(),
  lawfulBasisDefault: lawfulBasisSchema.optional(),
  crossBorderAllowed: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

export const ropaInputSchema = z.object({
  name: z.string().min(3).max(200),
  purpose: z.string().min(8).max(4000),
  lawfulBasis: lawfulBasisSchema.default('contract'),
  dataCategories: z.array(z.string()).default([]),
  dataSubjects: z.array(z.string()).default([]),
  recipients: z.string().max(1000).optional(),
  retentionDays: z.number().int().min(1).max(3650).default(365),
  crossBorder: z.boolean().default(false),
  securityMeasures: z.string().max(4000).optional(),
  status: ropaStatusSchema.default('draft'),
});

export const dsarInputSchema = z.object({
  requestType: dsarTypeSchema,
  subjectName: z.string().min(2).max(120),
  subjectEmail: z.string().email().optional().or(z.literal('')),
  subjectPhone: z.string().max(40).optional(),
  description: z.string().max(4000).optional(),
});

export const dsarUpdateSchema = z.object({
  status: dsarStatusSchema.optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  assignedName: z.string().max(120).optional(),
  resolution: z.string().max(8000).optional(),
});

export const breachInputSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(8000).optional(),
  discoveredAt: z.string().optional(),
  severity: breachSeveritySchema.default('medium'),
  affectedCount: z.number().int().min(0).max(10000000).default(0),
  dataCategories: z.array(z.string()).default([]),
  notifyAuthority: z.boolean().default(true),
  notifySubjects: z.boolean().default(false),
  containment: z.string().max(8000).optional(),
});

export const breachUpdateSchema = z.object({
  status: breachStatusSchema.optional(),
  notifiedAt: z.string().nullable().optional(),
  containment: z.string().max(8000).optional(),
  affectedCount: z.number().int().min(0).optional(),
  notifySubjects: z.boolean().optional(),
});

export type LawfulBasis = z.infer<typeof lawfulBasisSchema>;
export type RopaStatus = z.infer<typeof ropaStatusSchema>;
export type DsarType = z.infer<typeof dsarTypeSchema>;
export type DsarStatus = z.infer<typeof dsarStatusSchema>;
export type BreachStatus = z.infer<typeof breachStatusSchema>;
export type BreachSeverity = z.infer<typeof breachSeveritySchema>;

export type PrivacySettings = {
  tenantId: string;
  dpoName?: string;
  dpoEmail?: string;
  dpoPhone?: string;
  controllerName?: string;
  controllerAddress?: string;
  noticeTitle?: string;
  noticeBody?: string;
  lawfulBasisDefault: LawfulBasis;
  crossBorderAllowed: boolean;
  isPublished: boolean;
  updatedAt: string;
};

export type ProcessingActivity = {
  id: string;
  number: string;
  name: string;
  purpose: string;
  lawfulBasis: LawfulBasis;
  dataCategories: string[];
  dataSubjects: string[];
  recipients?: string;
  retentionDays: number;
  crossBorder: boolean;
  securityMeasures?: string;
  status: RopaStatus;
  createdAt: string;
  updatedAt: string;
};

export type DataSubjectRequest = {
  id: string;
  number: string;
  requestType: DsarType;
  status: DsarStatus;
  subjectName: string;
  subjectEmail?: string;
  subjectPhone?: string;
  requesterId?: string;
  description?: string;
  dueDate?: string;
  resolution?: string;
  assignedTo?: string;
  assignedName?: string;
  createdAt: string;
  updatedAt: string;
};

export type DataBreach = {
  id: string;
  number: string;
  title: string;
  description?: string;
  discoveredAt: string;
  notifiedAt?: string;
  severity: BreachSeverity;
  status: BreachStatus;
  affectedCount: number;
  dataCategories: string[];
  notifyAuthority: boolean;
  notifySubjects: boolean;
  containment?: string;
  createdAt: string;
  updatedAt: string;
};

export type GovernanceSnapshot = {
  settings: PrivacySettings | null;
  ropaActive: number;
  ropaTotal: number;
  dsarOpen: number;
  dsarBreached: number;
  breachOpen: number;
  breachNotifyRisk: number;
  openRequests: DataSubjectRequest[];
  openBreaches: DataBreach[];
};
