import { z } from 'zod';

export const cmdbSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(80).default('service'),
  assetId: z.string().uuid().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  relations: z.array(z.object({ targetId: z.string(), type: z.string() })).optional(),
});

export type CmdbItem = {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  assetId?: string;
  attributes: Record<string, string>;
  relations: Array<{ targetId: string; type: string }>;
  createdAt: string;
};
