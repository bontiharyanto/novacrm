'use client';

import { useState } from 'react';
import { Camera, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/components/layout/preferences-provider';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { uploadTicketFile } from '@/lib/tickets/upload-client';
import type { TicketAttachmentMeta } from '@/lib/tickets/activity';

type PhotoSlot = {
  file: File | null;
  preview: string | null;
};

function emptySlot(): PhotoSlot {
  return { file: null, preview: null };
}

function PhotoPicker({
  label,
  slot,
  onChange,
}: {
  label: string;
  slot: PhotoSlot;
  onChange: (next: PhotoSlot) => void;
}) {
  const { t } = useI18n();
  return (
    <label className="block cursor-pointer overflow-hidden rounded-md border border-dashed border-zinc-800 bg-zinc-950/80 transition-colors hover:border-zinc-700">
      <p className="border-b border-zinc-800 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      {slot.preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slot.preview} alt={label} className="h-32 w-full object-cover" />
      ) : (
        <div className="flex h-32 flex-col items-center justify-center gap-1 text-zinc-500">
          <Camera className="h-4 w-4" />
          <span className="text-[11px]">{t.tickets.visit.pickPhoto}</span>
        </div>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (slot.preview) URL.revokeObjectURL(slot.preview);
          onChange(file ? { file, preview: URL.createObjectURL(file) } : emptySlot());
          event.target.value = '';
        }}
      />
    </label>
  );
}

export function VisitReportForm({
  ticketId,
  author,
  onSaved,
}: {
  ticketId: string;
  author: string;
  onSaved: () => Promise<void> | void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [before, setBefore] = useState<PhotoSlot>(emptySlot());
  const [after, setAfter] = useState<PhotoSlot>(emptySlot());
  const [pending, setPending] = useState(false);

  async function uploadSlot(slot: PhotoSlot): Promise<TicketAttachmentMeta | undefined> {
    if (!slot.file) return undefined;
    const result = await uploadTicketFile(slot.file);
    if (result.error || !result.data) throw new Error(result.error ?? t.tickets.uploadFailed);
    return result.data;
  }

  async function handleSubmit() {
    const trimmed = notes.trim();
    if (trimmed.length < 3) {
      toastError(t.tickets.visit.needNotes);
      return;
    }
    if (!before.file && !after.file) {
      toastError(t.tickets.visit.needPhoto);
      return;
    }

    setPending(true);
    try {
      const [beforeFile, afterFile] = await Promise.all([uploadSlot(before), uploadSlot(after)]);
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author,
          kind: 'visit',
          visit: { notes: trimmed, before: beforeFile, after: afterFile },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toastError(payload.error ?? t.tickets.visit.failed);
        return;
      }
      if (before.preview) URL.revokeObjectURL(before.preview);
      if (after.preview) URL.revokeObjectURL(after.preview);
      setNotes('');
      setBefore(emptySlot());
      setAfter(emptySlot());
      setOpen(false);
      await onSaved();
      toastSuccess(t.tickets.visit.saved);
    } catch (error) {
      toastError(error instanceof Error ? error.message : t.tickets.visit.failed);
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <MapPin className="h-3.5 w-3.5" /> {t.tickets.visit.action}
      </Button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.tickets.visit.title}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{t.tickets.visit.hint}</p>
      </div>
      <Textarea
        rows={3}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder={t.tickets.visit.notesHint}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <PhotoPicker label={t.tickets.visit.before} slot={before} onChange={setBefore} />
        <PhotoPicker label={t.tickets.visit.after} slot={after} onChange={setAfter} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void handleSubmit()} disabled={pending}>
          {pending ? t.tickets.visit.saving : t.tickets.visit.submit}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setOpen(false);
          }}
        >
          {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}
