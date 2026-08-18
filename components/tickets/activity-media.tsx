'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { isImageAttachment, type TicketAttachmentMeta } from '@/lib/tickets/activity';
import { useI18n } from '@/components/layout/preferences-provider';

const urlCache = new Map<string, string>();

async function loadViewUrl(key: string) {
  const cached = urlCache.get(key);
  if (cached) return cached;
  const response = await fetch(`/api/storage/view?key=${encodeURIComponent(key)}`);
  const payload = await response.json().catch(() => ({}));
  const url = payload.data?.url as string | undefined;
  if (url) urlCache.set(key, url);
  return url ?? null;
}

export function ActivityFile({
  file,
  label,
}: {
  file: TicketAttachmentMeta;
  label?: string;
}) {
  const { t } = useI18n();
  const [url, setUrl] = useState<string | null>(urlCache.get(file.key) ?? null);
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const image = isImageAttachment(file) && !broken;

  useEffect(() => {
    let cancelled = false;
    if (url) return;
    void loadViewUrl(file.key).then((next) => {
      if (!cancelled) setUrl(next);
    });
    return () => {
      cancelled = true;
    };
  }, [file.key, url]);

  if (!url) {
    return (
      <div className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
        {label ? <p className="border-b border-zinc-800 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</p> : null}
        <div className="flex h-28 items-center justify-center text-[11px] text-zinc-600">{t.tickets.uploading}</div>
      </div>
    );
  }

  if (!image) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-blue-300 hover:border-zinc-700"
      >
        {label ? `${label}: ` : ''}
        {file.filename}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 text-left transition-colors hover:border-zinc-700"
      >
        {label ? (
          <p className="border-b border-zinc-800 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={file.filename}
          className="max-h-48 w-full object-cover"
          onError={() => setBroken(true)}
        />
        <p className="truncate px-2 py-1 text-[11px] text-zinc-500">{file.filename}</p>
      </button>
      <Dialog open={open} title={file.filename} onClose={() => setOpen(false)} className="max-w-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={file.filename} className="max-h-[70vh] w-full rounded-md object-contain" />
        <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-blue-300">
          {t.tickets.openFile}
        </a>
      </Dialog>
    </>
  );
}
