import { looksLikeObjectKey, objectKeyFromImageSrc, ticketObjectImageSrc } from '@/lib/tickets/object-image';

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'b',
  'i',
  'img',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
]);
const TABLE_CELL_TAGS = new Set(['th', 'td']);
const VOID_TAGS = new Set(['br', 'img']);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'noscript']);

function escapeText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(value: string) {
  return escapeText(value).replace(/'/g, '&#39;');
}

function decodeEntities(value: string) {
  return value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&');
}

function serializeImage(element: Element) {
  const dataKey = element.getAttribute('data-novacrm-key')?.trim() ?? '';
  const fromData = looksLikeObjectKey(dataKey) ? dataKey : null;
  const fromSrc = objectKeyFromImageSrc(element.getAttribute('src'));
  const key = fromData ?? fromSrc;
  if (!key) return '';

  const alt = (element.getAttribute('alt') ?? '').slice(0, 180);
  const src = ticketObjectImageSrc(key);
  return `<img src="${escapeAttr(src)}" data-novacrm-key="${escapeAttr(key)}" alt="${escapeAttr(alt)}" class="ticket-inline-image">`;
}

function serializeTableCellAttrs(element: Element) {
  if (!TABLE_CELL_TAGS.has(element.tagName.toLowerCase())) return '';
  const attrs = ['colspan', 'rowspan']
    .map((name) => {
      const value = element.getAttribute(name);
      return value && /^\d{1,3}$/.test(value) && Number(value) > 0
        ? ` ${name}="${value}"`
        : '';
    })
    .join('');
  return attrs;
}

function serializeAllowed(node: ParentNode): string {
  return Array.from(node.childNodes)
    .map((child) => {
      if (child.nodeType === 3) {
        return escapeText(child.textContent ?? '');
      }
      if (child.nodeType !== 1) {
        return '';
      }
      const element = child as Element;
      const tag = element.tagName.toLowerCase();
      if (DROP_WITH_CONTENT.has(tag)) {
        return '';
      }
      if (tag === 'img') {
        return serializeImage(element);
      }
      const inner = serializeAllowed(element);
      if (!ALLOWED_TAGS.has(tag)) {
        return inner;
      }
      if (VOID_TAGS.has(tag)) {
        return '<br>';
      }
      return `<${tag}${serializeTableCellAttrs(element)}>${inner}</${tag}>`;
    })
    .join('');
}

function sanitizeWithDom(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return serializeAllowed(doc.body);
}

function parseImgAttrs(raw: string) {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9:_]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function sanitizeWithWalker(html: string) {
  let out = '';
  let index = 0;
  const length = html.length;

  while (index < length) {
    if (html.startsWith('<!--', index)) {
      const end = html.indexOf('-->', index + 4);
      index = end === -1 ? length : end + 3;
      continue;
    }

    if (html[index] !== '<') {
      const next = html.indexOf('<', index);
      const text = next === -1 ? html.slice(index) : html.slice(index, next);
      out += escapeText(decodeEntities(text));
      index = next === -1 ? length : next;
      continue;
    }

    const close = html.indexOf('>', index + 1);
    if (close === -1) {
      out += escapeText(html.slice(index));
      break;
    }

    const raw = html.slice(index + 1, close).trim();
    index = close + 1;

    if (raw.startsWith('!') || raw.startsWith('?')) {
      continue;
    }

    const isClose = raw.startsWith('/');
    const namePart = (isClose ? raw.slice(1) : raw).split(/\s+/)[0] ?? '';
    const tag = namePart.replace(/\/$/, '').toLowerCase();
    if (!/^[a-z][a-z0-9]*$/.test(tag)) {
      continue;
    }

    if (DROP_WITH_CONTENT.has(tag)) {
      if (!isClose) {
        const closer = new RegExp(`</${tag}\\b[^>]*>`, 'i');
        const rest = html.slice(index);
        const match = rest.match(closer);
        index = match?.index != null ? index + match.index + match[0].length : length;
      }
      continue;
    }

    if (tag === 'img') {
      if (isClose) continue;
      const attrs = parseImgAttrs(raw);
      const dataKey = (attrs['data-novacrm-key'] ?? '').trim();
      const key =
        (looksLikeObjectKey(dataKey) ? dataKey : null) ?? objectKeyFromImageSrc(attrs.src ?? '');
      if (!key) continue;
      const alt = (attrs.alt ?? '').slice(0, 180);
      out += `<img src="${escapeAttr(ticketObjectImageSrc(key))}" data-novacrm-key="${escapeAttr(key)}" alt="${escapeAttr(alt)}" class="ticket-inline-image">`;
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      continue;
    }

    if (VOID_TAGS.has(tag)) {
      if (!isClose) out += '<br>';
      continue;
    }

    if (isClose) {
      out += `</${tag}>`;
    } else {
      const attrs = TABLE_CELL_TAGS.has(tag)
        ? ['colspan', 'rowspan']
            .map((name) => {
              const value = parseImgAttrs(raw)[name];
              return value && /^\d{1,3}$/.test(value) && Number(value) > 0
                ? ` ${name}="${value}"`
                : '';
            })
            .join('')
        : '';
      out += `<${tag}${attrs}>`;
    }
  }

  return out;
}

export function sanitizeCommentHtml(input: string) {
  if (!input) return '';
  if (!input.includes('<')) return input;
  if (typeof DOMParser !== 'undefined') {
    try {
      return sanitizeWithDom(input);
    } catch {
      return sanitizeWithWalker(input);
    }
  }
  return sanitizeWithWalker(input);
}
