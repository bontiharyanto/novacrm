import { z } from 'zod';
import { uuidSchema } from '@/lib/validation/id';

export const csatScoreSchema = z.coerce.number().int().min(1).max(5);

export const submitCsatSchema = z.object({
  ticketId: uuidSchema,
  score: csatScoreSchema,
  comment: z.string().trim().max(500).optional(),
});

export type CsatScore = z.infer<typeof csatScoreSchema>;

export const CSAT_AUTO_WORKING_DAYS = 7;
export const CSAT_AUTO_SCORE = 5 as const;
export const CSAT_SOURCES = ['customer', 'auto_timeout'] as const;
export type CsatSource = (typeof CSAT_SOURCES)[number];

export type CsatResponse = {
  ticketId: string;
  score: CsatScore;
  comment?: string;
  createdAt: string;
  source?: CsatSource;
};

export type PendingCsatTicket = {
  id: string;
  number?: string;
  title: string;
  status: 'resolved' | 'closed';
  updatedAt: string;
};

export const CSAT_LABELS: Record<CsatScore, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Excellent',
};
