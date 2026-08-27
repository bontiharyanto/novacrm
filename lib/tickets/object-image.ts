/** Same-origin img src that redirects to a MinIO presigned URL (session cookie auth). */
export function ticketObjectImageSrc(key: string) {
  return `/api/storage/object?key=${encodeURIComponent(key)}`;
}

const OBJECT_SRC_PREFIX = '/api/storage/object?key=';

/** Loose object-key shape (tenant uuid + path). Full tenant check happens in the API. */
export function looksLikeObjectKey(key: string) {
  if (!key || key.length > 400 || key.includes('..') || key.includes('\\') || key.includes('\0') || key.includes('//')) {
    return false;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._/-]+$/i.test(key);
}

export function objectKeyFromImageSrc(src: string | null | undefined) {
  if (!src?.startsWith(OBJECT_SRC_PREFIX)) return null;
  try {
    const raw = src.slice(OBJECT_SRC_PREFIX.length).split('&')[0] ?? '';
    const key = decodeURIComponent(raw);
    return looksLikeObjectKey(key) ? key : null;
  } catch {
    return null;
  }
}
