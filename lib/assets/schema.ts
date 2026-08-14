import { z } from 'zod';
import { emptyToUndefined, optionalUuidSchema } from '@/lib/validation/id';

export { ASSET_TYPES, DEFAULT_ASSET_TYPES, formatAssetTypeLabel, type AssetTypeOption } from '@/lib/assets/types';

export const assetTypeSchema = z.string().trim().min(1).max(40);
export const assetStatusSchema = z.enum(['active', 'in_repair', 'retired', 'lost']);

export const ASSET_STATUSES = ['active', 'in_repair', 'retired', 'lost'] as const;

export const assetTypeCatalogSchema = z.object({
  label: z.string().trim().min(2).max(80),
});

export const assetSchema = z.object({
  name: z.string().min(1).max(200),
  assetTag: z.string().max(40).optional(),
  type: assetTypeSchema.default('laptop'),
  status: assetStatusSchema.default('active'),
  brand: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
  model: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
  serial: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  purchaseDate: z.preprocess(emptyToUndefined, z.string().optional()),
  warrantyExpiry: z.preprocess(emptyToUndefined, z.string().optional()),
  cost: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }, z.number().nonnegative().optional()),
  usefulLifeMonths: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return 36;
    const n = Number(value);
    return Number.isFinite(n) ? n : 36;
  }, z.number().int().min(1).max(240).default(36)),
  residualValue: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }, z.number().nonnegative().default(0)),
  location: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  assignedTo: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  accountId: optionalUuidSchema,
});

export const assetUpdateSchema = assetSchema.partial().extend({
  replacedById: optionalUuidSchema,
});

export type AssetType = string;
export type AssetStatus = z.infer<typeof assetStatusSchema>;

export type AssetRecord = {
  id: string;
  tenantId: string;
  accountId: string;
  accountName?: string;
  name: string;
  assetTag: string;
  type: AssetType;
  brand?: string;
  model?: string;
  serial?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  cost?: number;
  usefulLifeMonths: number;
  residualValue: number;
  status: AssetStatus;
  location?: string;
  assignedTo?: string;
  notes?: string;
  replacedById?: string;
  createdAt: string;
  updatedAt?: string;
};

export const ASSET_MOVEMENT_TYPES = ['move', 'transfer', 'replace', 'status'] as const;
export type AssetMovementType = (typeof ASSET_MOVEMENT_TYPES)[number];

export const assetMovementSchema = z.object({
  eventType: z.enum(ASSET_MOVEMENT_TYPES),
  location: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  assignedTo: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  replacementId: optionalUuidSchema,
  note: z.preprocess(emptyToUndefined, z.string().max(400).optional()),
});

export type AssetMovement = {
  id: string;
  assetId: string;
  eventType: AssetMovementType;
  fromLocation?: string;
  toLocation?: string;
  fromAssignee?: string;
  toAssignee?: string;
  fromStatus?: string;
  toStatus?: string;
  relatedAssetId?: string;
  relatedAssetName?: string;
  relatedAssetTag?: string;
  note?: string;
  createdAt: string;
};
