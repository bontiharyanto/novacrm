import { z } from 'zod';
import { ticketPrioritySchema, ticketTypeSchema } from '@/lib/tickets/schema';
import { catalogFulfillmentStepSchema } from '@/lib/tickets/tasks-schema';
import { nullableUuidSchema } from '@/lib/validation/id';

export const catalogVariableTypeSchema = z.enum(['text', 'textarea', 'select', 'checkbox']);

export const catalogVariableSchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  type: catalogVariableTypeSchema.default('text'),
  required: z.boolean().optional().default(false),
  options: z.array(z.string().min(1)).optional(),
  placeholder: z.string().max(200).optional(),
});

export const catalogCategorySchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().max(80).optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const catalogVariableSetSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  variables: z.array(catalogVariableSchema).default([]),
});

export const catalogVariableSetUpdateSchema = catalogVariableSetSchema.partial();

export const catalogItemSchema = z.object({
  name: z.string().min(1).max(160),
  slug: z.string().max(80).optional(),
  shortDescription: z.string().max(240).optional(),
  description: z.string().max(4000).optional(),
  icon: z.string().max(40).optional(),
  categoryId: nullableUuidSchema,
  variableSetId: nullableUuidSchema,
  ticketType: ticketTypeSchema.default('request'),
  priority: ticketPrioritySchema.default('medium'),
  variables: z.array(catalogVariableSchema).default([]),
  fulfillmentSteps: z.array(catalogFulfillmentStepSchema).default([]),
  fulfillmentSequential: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
});

export const catalogItemUpdateSchema = catalogItemSchema.partial();

export const catalogRequestSchema = z.object({
  answers: z.record(z.string(), z.union([z.string(), z.boolean(), z.number()])).default({}),
});

export type CatalogVariable = z.infer<typeof catalogVariableSchema>;
export type CatalogCategory = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
};

export type CatalogVariableSet = {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  variables: CatalogVariable[];
  createdAt: string;
};

export type CatalogItem = {
  id: string;
  tenantId: string;
  categoryId?: string;
  categoryName?: string;
  variableSetId?: string;
  variableSetName?: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  icon: string;
  ticketType: z.infer<typeof ticketTypeSchema>;
  priority: z.infer<typeof ticketPrioritySchema>;
  variables: CatalogVariable[];
  mergedVariables: CatalogVariable[];
  fulfillmentSteps: z.infer<typeof catalogFulfillmentStepSchema>[];
  fulfillmentSequential: boolean;
  isActive: boolean;
  createdAt: string;
};

export const CATALOG_ICONS = [
  { id: 'clipboard', label: 'Request' },
  { id: 'laptop', label: 'Hardware' },
  { id: 'key', label: 'Access' },
  { id: 'app', label: 'Software' },
  { id: 'wifi', label: 'Network' },
  { id: 'alert', label: 'Incident' },
  { id: 'database', label: 'Database' },
  { id: 'server', label: 'Datacenter' },
  { id: 'cctv', label: 'CCTV' },
] as const;
