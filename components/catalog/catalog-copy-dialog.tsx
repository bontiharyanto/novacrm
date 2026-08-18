'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { useI18n } from '@/components/layout/preferences-provider';
import {
  copyCatalogFromTenant,
  copyCatalogToTenant,
  listCatalogCopySources,
  listCatalogCopyTargets,
  type CatalogCopySource,
} from '@/lib/catalog/copy';

export function CatalogCopyDialog({
  open,
  onClose,
  onCopied,
  hasLocalCatalog,
}: {
  open: boolean;
  onClose: () => void;
  onCopied: () => void;
  hasLocalCatalog: boolean;
}) {
  const { t } = useI18n();
  const copy = t.catalog.copy;
  const pushOut = hasLocalCatalog;
  const [rows, setRows] = useState<CatalogCopySource[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setMessage('');
    const load = pushOut ? listCatalogCopyTargets : listCatalogCopySources;
    void load().then((next) => {
      setRows(next);
      setTenantId((current) => current || next[0]?.id || '');
    });
  }, [open, pushOut]);

  const selected = rows.find((row) => row.id === tenantId);

  return (
    <Dialog open={open} title={pushOut ? copy.toTitle : copy.title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm leading-6 text-zinc-500">{pushOut ? copy.toHint : copy.hint}</p>
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-400">{pushOut ? copy.emptyTargets : copy.emptySources}</p>
        ) : (
          <Select value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
            {rows.map((row) => (
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
            disabled={pending || !tenantId}
            onClick={() => {
              void (async () => {
                setPending(true);
                const result = pushOut
                  ? await copyCatalogToTenant(tenantId)
                  : await copyCatalogFromTenant(tenantId);
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
