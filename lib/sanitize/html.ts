const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'b', 'i']);
const VOID_TAGS = new Set(['br']);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'noscript']);

function escapeText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function decodeEntities(value: string) {
  return value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&');
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
      const inner = serializeAllowed(element);
      if (!ALLOWED_TAGS.has(tag)) {
        return inner;
      }
      if (VOID_TAGS.has(tag)) {
        return '<br>';
      }
      return `<${tag}>${inner}</${tag}>`;
    })
    .join('');
}

function sanitizeWithDom(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return serializeAllowed(doc.body);
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

    if (!ALLOWED_TAGS.has(tag)) {
      continue;
    }

    if (VOID_TAGS.has(tag)) {
      if (!isClose) out += '<br>';
      continue;
    }

    out += isClose ? `</${tag}>` : `<${tag}>`;
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
