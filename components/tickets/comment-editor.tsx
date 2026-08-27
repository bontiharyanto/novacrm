'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { ImageIcon, Loader2 } from 'lucide-react';
import { sanitizeCommentHtml } from '@/lib/sanitize/html';
import { uploadTicketFile } from '@/lib/tickets/upload-client';
import { ticketObjectImageSrc } from '@/lib/tickets/object-image';
import { useI18n } from '@/components/layout/preferences-provider';

function isEmptyHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0;
}

const TicketImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-novacrm-key': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-novacrm-key'),
        renderHTML: (attributes) => {
          if (!attributes['data-novacrm-key']) return {};
          return { 'data-novacrm-key': attributes['data-novacrm-key'] };
        },
      },
    };
  },
}).configure({
  allowBase64: false,
  inline: false,
  HTMLAttributes: {
    class: 'ticket-inline-image',
  },
});

const IMAGE_MIME = /^image\/(png|jpe?g|gif|webp|bmp)$/i;

function isImageFile(file: File) {
  return IMAGE_MIME.test(file.type) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name);
}

async function insertUploadedImage(editor: Editor, file: File) {
  const uploaded = await uploadTicketFile(file);
  if (uploaded.error || !uploaded.data) {
    return uploaded.error ?? 'Unable to upload image';
  }
  const { key, filename } = uploaded.data;
  editor
    .chain()
    .focus()
    .setImage({
      src: ticketObjectImageSrc(key),
      alt: filename,
      'data-novacrm-key': key,
    } as { src: string; alt: string; 'data-novacrm-key': string })
    .run();
  return null;
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
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageFiles = useCallback(async (instance: Editor, files: File[]) => {
    const images = files.filter(isImageFile);
    if (images.length === 0) return false;

    setBusy(true);
    setError(null);
    for (const file of images) {
      const fail = await insertUploadedImage(instance, file);
      if (fail) {
        setError(fail);
        break;
      }
    }
    setBusy(false);
    return true;
  }, []);

  const handleImageFilesRef = useRef(handleImageFiles);
  handleImageFilesRef.current = handleImageFiles;

  const editor = useEditor({
    extensions: [StarterKit, TicketImage],
    content: value || '<p></p>',
    immediatelyRender: false,
    onCreate: ({ editor: instance }) => {
      editorRef.current = instance;
    },
    onDestroy: () => {
      editorRef.current = null;
    },
    editorProps: {
      attributes: {
        class: `tiptap ${minHeightClass} px-3 py-2 text-sm text-zinc-100 focus:outline-none`,
      },
      handlePaste: (_view, event) => {
        const instance = editorRef.current;
        const items = event.clipboardData?.items;
        if (!instance || !items?.length) return false;
        const files: File[] = [];
        for (const item of Array.from(items)) {
          if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) files.push(file);
          }
        }
        if (files.length === 0) return false;
        event.preventDefault();
        void handleImageFilesRef.current(instance, files);
        return true;
      },
      handleDrop: (_view, event) => {
        const instance = editorRef.current;
        const list = event.dataTransfer?.files;
        if (!instance || !list?.length) return false;
        const files = Array.from(list).filter(isImageFile);
        if (files.length === 0) return false;
        event.preventDefault();
        void handleImageFilesRef.current(instance, files);
        return true;
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      onChange(isEmptyHtml(html) ? '' : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = value || '<p></p>';
    if (editor.getHTML() === next) return;
    if (isEmptyHtml(editor.getHTML()) && isEmptyHtml(value)) return;
    editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-950">
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800 px-2 py-1">
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
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          disabled={busy || !editor}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
          {busy ? t.tickets.uploading : t.tickets.insertImage}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp"
          className="hidden"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = '';
            if (editor && files.length) void handleImageFiles(editor, files);
          }}
        />
        <span className="ml-auto hidden text-[10px] text-zinc-600 sm:inline">{t.tickets.pasteImageHint}</span>
      </div>
      <EditorContent editor={editor} />
      {error ? <p className="border-t border-zinc-800 px-3 py-1.5 text-xs text-rose-400">{error}</p> : null}
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
