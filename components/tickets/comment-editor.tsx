'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { sanitizeCommentHtml } from '@/lib/sanitize/html';

function isEmptyHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0;
}

export function CommentEditor({
  value,
  onChange,
  minHeightClass = 'min-h-28',
}: {
  value: string;
  onChange: (html: string) => void;
  minHeightClass?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `tiptap ${minHeightClass} px-3 py-2 text-sm text-zinc-100 focus:outline-none`,
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      onChange(isEmptyHtml(html) ? '' : html);
    },
  });

  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-950">
      <div className="flex gap-1 border-b border-zinc-800 px-2 py-1">
        <button
          type="button"
          className="rounded px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          Bold
        </button>
        <button
          type="button"
          className="rounded px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          List
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export function CommentHtml({ html }: { html: string }) {
  if (!html.includes('<')) {
    return <p className="text-sm text-zinc-200">{html}</p>;
  }

  const safe = sanitizeCommentHtml(html);
  if (!safe.includes('<')) {
    return <p className="text-sm text-zinc-200">{safe}</p>;
  }
  return <div className="prose-comment text-sm text-zinc-200" dangerouslySetInnerHTML={{ __html: safe }} />;
}
