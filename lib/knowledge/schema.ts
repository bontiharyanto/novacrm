import { z } from 'zod';
import { nullableUuidSchema } from '@/lib/validation/id';

export const knowledgeArticleSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(8).max(8000),
  ticketId: nullableUuidSchema,
  category: z.string().max(80).optional(),
  isPublished: z.boolean().optional().default(true),
});

export type KnowledgeArticle = {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  ticketId?: string;
  ticketNumber?: string;
  category?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};
