export const TICKET_COMMENT_KINDS = ['comment', 'attachment', 'visit'] as const;
export type TicketCommentKind = (typeof TICKET_COMMENT_KINDS)[number];

export type TicketAttachmentMeta = {
  key: string;
  filename: string;
  contentType: string;
};

export type TicketVisitMeta = {
  notes: string;
  before?: TicketAttachmentMeta;
  after?: TicketAttachmentMeta;
};

export type TicketActivity = {
  kind: TicketCommentKind;
  comment: string;
  attachment?: TicketAttachmentMeta;
  visit?: TicketVisitMeta;
};

const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'image/bmp']);
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i;
const LEGACY_ATTACHMENT = /^Attachment uploaded:\s*(.+?)\s*\(([^)]+)\)$/i;

export function isTicketCommentKind(value: unknown): value is TicketCommentKind {
  return value === 'comment' || value === 'attachment' || value === 'visit';
}

export function isTenantObjectKey(tenantId: string, key: string) {
  if (!tenantId || !key || key.includes('..') || key.includes('\\') || key.includes('\0')) return false;
  return key.startsWith(`${tenantId}/`) && key.length <= 400 && !key.includes('//');
}

export function isImageAttachment(file?: TicketAttachmentMeta | null) {
  if (!file) return false;
  const type = file.contentType.toLowerCase();
  if (IMAGE_TYPES.has(type) || type.startsWith('image/')) return true;
  return IMAGE_EXT.test(file.filename) || IMAGE_EXT.test(file.key);
}

function asAttachment(value: unknown): TicketAttachmentMeta | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as Record<string, unknown>;
  const key = typeof row.key === 'string' ? row.key.trim() : '';
  const filename = typeof row.filename === 'string' ? row.filename.trim() : '';
  const contentType = typeof row.contentType === 'string' ? row.contentType.trim() : 'application/octet-stream';
  if (!key || !filename) return undefined;
  return { key, filename, contentType: contentType || 'application/octet-stream' };
}

export function parseTicketActivity(input: {
  message?: string | null;
  kind?: string | null;
  meta?: unknown;
}): TicketActivity {
  const message = input.message ?? '';
  const meta = input.meta && typeof input.meta === 'object' ? (input.meta as Record<string, unknown>) : {};

  if (input.kind === 'visit' || meta.notes || meta.before || meta.after) {
    const notes =
      typeof meta.notes === 'string' && meta.notes.trim()
        ? meta.notes.trim()
        : message.replace(/^Visit report\s*/i, '').trim() || message;
    return {
      kind: 'visit',
      comment: notes,
      visit: {
        notes,
        before: asAttachment(meta.before),
        after: asAttachment(meta.after),
      },
    };
  }

  if (input.kind === 'attachment' || meta.key) {
    const attachment = asAttachment(meta) ?? asAttachment({
      key: meta.key,
      filename: meta.filename,
      contentType: meta.contentType,
    });
    if (attachment) {
      return { kind: 'attachment', comment: message || attachment.filename, attachment };
    }
  }

  const legacy = message.match(LEGACY_ATTACHMENT);
  if (legacy) {
    const filename = legacy[1].trim();
    const key = legacy[2].trim();
    return {
      kind: 'attachment',
      comment: message,
      attachment: { key, filename, contentType: IMAGE_EXT.test(filename) ? 'image/*' : 'application/octet-stream' },
    };
  }

  return { kind: 'comment', comment: message };
}

export function buildAttachmentMessage(file: TicketAttachmentMeta) {
  return `Attachment uploaded: ${file.filename} (${file.key})`;
}

export function buildVisitMessage(visit: TicketVisitMeta) {
  const lines = ['Visit report', visit.notes.trim()];
  if (visit.before) lines.push(`Before: ${visit.before.filename}`);
  if (visit.after) lines.push(`After: ${visit.after.filename}`);
  return lines.join('\n');
}

export function visitMetaPayload(visit: TicketVisitMeta) {
  return {
    notes: visit.notes.trim(),
    ...(visit.before ? { before: visit.before } : {}),
    ...(visit.after ? { after: visit.after } : {}),
  };
}
