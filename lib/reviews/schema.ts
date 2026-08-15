import { z } from 'zod';
import { emptyToUndefined, uuidSchema } from '@/lib/validation/id';

export const staffReviewStatusSchema = z.enum(['draft', 'submitted', 'acknowledged']);
export const staffReviewScoreSchema = z.number().int().min(1).max(5);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const staffReviewSnapshotSchema = z.object({
  ticketsClosed: z.number().int().min(0),
  csatAvg: z.number().nullable(),
  csatCount: z.number().int().min(0),
  slaBreaches: z.number().int().min(0),
});

export const staffReviewAiSchema = z.object({
  quality: staffReviewScoreSchema,
  slaDiscipline: staffReviewScoreSchema,
  teamwork: staffReviewScoreSchema,
  ownership: staffReviewScoreSchema,
  comment: z.string().max(2000).default(''),
  strengths: z.string().max(1000).default(''),
  improvements: z.string().max(1000).default(''),
  source: z.enum(['ai', 'snapshot']).optional().default('ai'),
  model: z.string().max(120).optional(),
  generatedAt: z.string().optional(),
});

export const staffReviewInputSchema = z.object({
  subjectId: uuidSchema,
  periodStart: dateSchema,
  periodEnd: dateSchema,
  quality: staffReviewScoreSchema,
  slaDiscipline: staffReviewScoreSchema,
  teamwork: staffReviewScoreSchema,
  ownership: staffReviewScoreSchema,
  comment: z.preprocess(emptyToUndefined, z.string().max(2000).optional()),
  strengths: z.preprocess(emptyToUndefined, z.string().max(1000).optional()),
  improvements: z.preprocess(emptyToUndefined, z.string().max(1000).optional()),
  submit: z.boolean().optional().default(false),
  aiAssessment: staffReviewAiSchema.optional(),
});

export type StaffReviewStatus = z.infer<typeof staffReviewStatusSchema>;
export type StaffReviewSnapshot = z.infer<typeof staffReviewSnapshotSchema>;
export type StaffReviewAiAssessment = z.infer<typeof staffReviewAiSchema>;
export type StaffReviewInput = z.infer<typeof staffReviewInputSchema>;

export type StaffReview = {
  id: string;
  tenantId: string;
  subjectId: string;
  subjectName: string;
  reviewerId: string;
  reviewerName: string;
  periodStart: string;
  periodEnd: string;
  quality: number;
  slaDiscipline: number;
  teamwork: number;
  ownership: number;
  comment?: string;
  strengths?: string;
  improvements?: string;
  snapshot?: StaffReviewSnapshot;
  aiAssessment?: StaffReviewAiAssessment;
  status: StaffReviewStatus;
  acknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
};
