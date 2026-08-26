import { createPresignedDownload } from '@/lib/minio/presign';
import { isTenantObjectKey } from '@/lib/tickets/activity';

export const TENANT_LOGO_MAX_BYTES = 1 * 1024 * 1024;

export const TENANT_LOGO_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const;

export type TenantLogoContentType = (typeof TENANT_LOGO_CONTENT_TYPES)[number];

export function isTenantLogoContentType(value: string): value is TenantLogoContentType {
  return (TENANT_LOGO_CONTENT_TYPES as readonly string[]).includes(value);
}

/** Short-lived view URL for img src (RSC layouts / tenant detail). */
export async function resolveTenantLogoUrl(
  tenantId: string,
  logoObjectKey: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!logoObjectKey || !isTenantObjectKey(tenantId, logoObjectKey)) return null;
  const result = await createPresignedDownload(logoObjectKey, expiresIn);
  return result.data?.url ?? null;
}
