import { z } from 'zod';
import { uuidSchema } from '@/lib/validation/id';

export const csatScoreSchema = z.coerce.number().int().min(1).max(5);

export const submitCsatSchema = z.object({
  ticketId: uuidSchema,
  score: csatScoreSchema,
  comment: z.string().trim().max(500).optional(),
});

export type CsatScore = z.infer<typeof csatScoreSchema>;

export type CsatResponse = {
  ticketId: string;
  score: CsatScore;
  comment?: string;
  createdAt: string;
};

export const CSAT_LABELS: Record<CsatScore, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Excellent',
};
