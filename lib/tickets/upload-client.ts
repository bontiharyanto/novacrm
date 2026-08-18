export type UploadedTicketFile = {
  key: string;
  filename: string;
  contentType: string;
};

const MAX_BYTES = 8 * 1024 * 1024;

export async function uploadTicketFile(file: File): Promise<{ data: UploadedTicketFile | null; error: string | null }> {
  if (file.size > MAX_BYTES) {
    return { data: null, error: 'File is larger than 8 MB.' };
  }

  const contentType = file.type || 'application/octet-stream';
  const presign = await fetch('/api/storage/presign', {
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
    return { data: null, error: 'Unable to upload file' };
  }

  return {
    data: { key: payload.data.key, filename: file.name, contentType },
    error: null,
  };
}
