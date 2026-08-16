import type { ReactNode } from 'react';

function normalizeAssistantMarkdown(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/([:.;])\s+\*\s+/g, '$1\n* ')
    .replace(/\s+\*\s+/g, '\n* ')
    .replace(/\s+-\s+(?=[A-Z0-9*])/g, '\n- ')
    .replace(/\s+(\d+)\.\s+/g, '\n$1. ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderInline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+?\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return tokens.map((token, index) => {
    const link = token.match(/^\[([^\]]+)\]\((\/portal\/[A-Za-z0-9-]+)\)$/);
    if (link) {
      return (
        <a key={index} href={link[2]} className="underline decoration-zinc-600 underline-offset-2 hover:text-zinc-50">
          {link[1]}
        </a>
      );
    }
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={index} className="font-semibold text-zinc-50">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code key={index} className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[12px] text-zinc-100">
          {token.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{token}</span>;
  });
}

function toBlocks(text: string): ReactNode[] {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^\s*```/.test(line)) {
      const fence: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index] ?? '')) {
        fence.push(lines[index] ?? '');
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(
        <pre
          key={`pre-${index}-${blocks.length}`}
          className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-[12px] leading-5 text-zinc-200"
        >
          {fence.join('\n')}
        </pre>,
      );
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index]?.match(/^\s*[-*]\s+(.*)$/);
        if (!match) break;
        items.push(match[1] ?? '');
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}-${blocks.length}`} className="list-disc space-y-1 pl-4">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (numbered) {
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index]?.match(/^\s*\d+\.\s+(.*)$/);
        if (!match) break;
        items.push(match[1] ?? '');
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}-${blocks.length}`} className="list-decimal space-y-1 pl-4">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const heading = line.match(/^\s*#{1,3}\s+(.*)$/);
    if (heading) {
      blocks.push(
        <p key={`h-${index}`} className="font-semibold text-zinc-50">
          {renderInline(heading[1] ?? '')}
        </p>,
      );
      index += 1;
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length) {
      const next = lines[index] ?? '';
      if (!next.trim() || /^\s*[-*]\s+/.test(next) || /^\s*\d+\.\s+/.test(next) || /^\s*#{1,3}\s+/.test(next)) {
        break;
      }
      paragraph.push(next);
      index += 1;
    }
    blocks.push(
      <p key={`p-${index}-${blocks.length}`} className="text-zinc-200">
        {renderInline(paragraph.join(' '))}
      </p>,
    );
  }

  return blocks;
}

export function AssistantMarkdown({ text }: { text: string }) {
  return <div className="space-y-2.5">{toBlocks(normalizeAssistantMarkdown(text))}</div>;
}
