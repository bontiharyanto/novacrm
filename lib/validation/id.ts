import { z } from 'zod';

/** Postgres uuid text (8-4-4-4-12). Seed IDs are valid in PG but fail RFC-4122-strict z.uuid(). */
export const uuidSchema = z.guid();

export function emptyToUndefined(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
}

export const optionalUuidSchema = z.preprocess(emptyToUndefined, uuidSchema.optional());
export const nullableUuidSchema = z.preprocess((value) => (value === '' ? null : value), uuidSchema.nullable().optional());
export const optionalEmailSchema = z.preprocess(emptyToUndefined, z.string().email().optional());
