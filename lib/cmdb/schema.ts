import { z } from 'zod';
import { emptyToUndefined, optionalUuidSchema, uuidSchema } from '@/lib/validation/id';

export const cidrSchema = z
  .string()
  .trim()
  .regex(
    /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)\/([0-9]|[1-2]\d|3[0-2])$/,
    'CIDR looks like 10.20.2.0/24',
  );

export const ipv4Schema = z
  .string()
  .trim()
  .regex(/^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/, 'IPv4 looks like 10.20.2.1');

export const ipSegmentSchema = z.object({
  name: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(80).optional()),
  cidr: cidrSchema,
  vlan: z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  }, z.number().int().min(1).max(4094).optional()),
  gateway: z.preprocess(emptyToUndefined, ipv4Schema.optional()),
  purpose: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  cmdbItemId: optionalUuidSchema,
});

export const cmdbSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(80).default('service'),
  accountId: optionalUuidSchema,
  assetId: optionalUuidSchema,
  attributes: z.record(z.string(), z.string()).optional(),
  relations: z
    .array(z.object({ targetId: uuidSchema, type: z.string().min(1).max(40) }))
    .optional(),
  segment: z.preprocess((value) => {
    if (!value || typeof value !== 'object') return undefined;
    const cidr = 'cidr' in value ? String((value as { cidr?: string }).cidr ?? '').trim() : '';
    return cidr ? value : undefined;
  }, ipSegmentSchema.omit({ cmdbItemId: true }).optional()),
});

export const cmdbUpdateSchema = cmdbSchema.partial();

export const ciClassSchema = z.object({
  groupKey: z.enum(['offering', 'infra', 'edge', 'custom']).default('custom'),
  label: z.string().trim().min(2).max(80),
  hint: z.preprocess(emptyToUndefined, z.string().trim().max(160).optional()),
});

export type CmdbRelation = { targetId: string; type: string };

export type IpSegment = {
  id: string;
  accountId: string;
  cmdbItemId?: string;
  name: string;
  cidr: string;
  vlan?: number;
  gateway?: string;
  purpose: string;
};

export type CmdbItem = {
  id: string;
  tenantId: string;
  accountId: string;
  accountName?: string;
  name: string;
  type: string;
  assetId?: string;
  assetName?: string;
  assetTag?: string;
  attributes: Record<string, string>;
  relations: CmdbRelation[];
  segments: IpSegment[];
  createdAt: string;
};

export function formatIpSegment(segment: IpSegment) {
  const vlan = segment.vlan ? `VLAN ${segment.vlan}` : null;
  return [segment.cidr, vlan].filter(Boolean).join(' · ');
}
