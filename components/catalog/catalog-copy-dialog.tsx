'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { useI18n } from '@/components/layout/preferences-provider';
import { copyCatalogFromTenant, listCatalogCopySources, type CatalogCopySource } from '@/lib/catalog/copy';

export function CatalogCopyDialog({
  open,
  onClose,
  onCopied,
}: {
  open: boolean;
  onClose: () => void;
  onCopied: () => void;
}) {
  const { t } = useI18n();
  const copy = t.catalog.copy;
  const [sources, setSources] = useState<CatalogCopySource[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setMessage('');
    void listCatalogCopySources().then((rows) => {
      setSources(rows);
      setSourceId((current) => current || rows[0]?.id || '');
    });
  }, [open]);

  const selected = sources.find((row) => row.id === sourceId);

  return (
    <Dialog open={open} title={copy.title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm leading-6 text-zinc-500">{copy.hint}</p>
        {sources.length === 0 ? (
          <p className="text-sm text-zinc-400">{copy.emptySources}</p>
        ) : (
          <Select value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
            {sources.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} ({row.slug}) · {row.items} {copy.itemsShort}
              </option>
            ))}
          </Select>
        )}
        {selected ? (
          <p className="font-mono text-[11px] text-zinc-500">
            {copy.summary
              .replace('{{categories}}', String(selected.categories))
              .replace('{{sets}}', String(selected.sets))
              .replace('{{items}}', String(selected.items))}
          </p>
        ) : null}
        {message ? <p className="text-sm text-zinc-300">{message}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={pending || !sourceId}
            onClick={() => {
              void (async () => {
                setPending(true);
                const result = await copyCatalogFromTenant(sourceId);
                setPending(false);
                if (result.error || !result.data) {
                  setMessage(result.error ?? copy.failed);
                  return;
                }
                setMessage(
                  copy.done
                    .replace('{{categories}}', String(result.data.categoriesCreated))
                    .replace('{{sets}}', String(result.data.setsCreated))
                    .replace('{{items}}', String(result.data.itemsCreated))
                    .replace('{{skipped}}', String(result.data.itemsSkipped)),
                );
                onCopied();
              })();
            }}
          >
            {copy.confirm}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
