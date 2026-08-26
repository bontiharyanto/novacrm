import { TENANT_LOGO_CONTENT_TYPES, TENANT_LOGO_MAX_BYTES } from '@/lib/tenants/logo';

export async function uploadTenantLogo(
  tenantId: string,
  file: File,
): Promise<{ data: { key: string } | null; error: string | null }> {
  if (file.size > TENANT_LOGO_MAX_BYTES) {
    return { data: null, error: 'Logo must be 1 MB or smaller.' };
  }

  const contentType = file.type || 'application/octet-stream';
  if (!(TENANT_LOGO_CONTENT_TYPES as readonly string[]).includes(contentType)) {
    return { data: null, error: 'Use PNG, JPEG, WebP, or SVG.' };
  }

  const presign = await fetch(`/api/tenants/${tenantId}/logo/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType }),
  });
  const payload = await presign.json().catch(() => ({}));
  if (!presign.ok || !payload.data?.url || !payload.data?.key) {
    return { data: null, error: payload.error ?? 'Unable to prepare upload' };
  }

  const uploaded = await fetch(payload.data.url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!uploaded.ok) {
    return { data: null, error: 'Unable to upload logo' };
  }

  return { data: { key: payload.data.key as string }, error: null };
}
