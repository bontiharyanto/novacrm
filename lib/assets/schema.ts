import { z } from 'zod';

export const assetTypeSchema = z.enum(['laptop', 'server', 'network', 'printer', 'mobile']);
export const assetStatusSchema = z.enum(['active', 'in_repair', 'retired', 'lost']);

export const assetSchema = z.object({
  name: z.string().min(1).max(200),
  type: assetTypeSchema.default('laptop'),
  status: assetStatusSchema.default('active'),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial: z.string().optional(),
  purchaseDate: z.string().optional(),
  cost: z.number().optional(),
  location: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

export type AssetRecord = {
  id: string;
  tenantId: string;
  name: string;
  assetTag: string;
  type: z.infer<typeof assetTypeSchema>;
  brand?: string;
  model?: string;
  serial?: string;
  purchaseDate?: string;
  cost?: number;
  status: z.infer<typeof assetStatusSchema>;
  location?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
};
