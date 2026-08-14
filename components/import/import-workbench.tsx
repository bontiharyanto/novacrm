'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  IMPORT_CATALOG,
  IMPORT_SKIP,
  isImportKind,
  type ImportKind,
  type ImportPreview,
  type ImportPreviewAction,
  type ImportResult,
} from '@/lib/import/catalog';
import { useI18n } from '@/components/layout/preferences-provider';
import { cn } from '@/lib/utils';

export function ImportWorkbench({ initialKind }: { initialKind?: string }) {
  const { t, locale } = useI18n();
  const [kind, setKind] = useState<ImportKind>(isImportKind(initialKind ?? '') ? (initialKind as ImportKind) : 'assets');
  const [busy, setBusy] = useState<'preview' | 'commit' | null>(null);
  const [exported, setExported] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const entity = useMemo(() => IMPORT_CATALOG.find((item) => item.kind === kind), [kind]);
  const id = locale === 'id';

  function resetKind(next: ImportKind) {
    setKind(next);
    setPreview(null);
    setResult(null);
    setFile(null);
    setError('');
  }

  async function send(mode: 'preview' | 'commit', selected: File) {
    setBusy(mode);
    setError('');
    if (mode === 'preview') setResult(null);
    const form = new FormData();
    form.set('kind', kind);
    form.set('mode', mode);
    form.set('file', selected);
    const response = await fetch('/api/import', { method: 'POST', body: form });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok || payload.error) {
      if (payload.data?.preview) setPreview(payload.data.preview);
      setError(payload.error ?? t.import.failed);
      return;
    }
    if (payload.data?.preview) setPreview(payload.data.preview);
    if (payload.data?.result) setResult(payload.data.result);
  }

  async function onPick(selected: File) {
    if (!exported) {
      setError(t.import.uploadLocked);
      return;
    }
    setFile(selected);
    await send('preview', selected);
  }

  if (!entity) return null;

  const actionLabel: Record<ImportPreviewAction, string> = {
    create: t.import.actionCreate,
    update: t.import.actionUpdate,
    error: t.import.actionError,
  };

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5 p-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{t.import.kicker}</p>
          <h1 className="text-2xl font-semibold text-zinc-50">{t.import.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">{t.import.subtitle}</p>
        </div>

        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.import.stepExport}</p>
            <p className="text-sm text-zinc-400">{t.import.exportHint}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/import/template?kind=all&format=xlsx"
                onClick={() => setExported(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500"
              >
                <Download className="h-3.5 w-3.5" />
                {t.import.exportAll}
              </a>
              <a
                href={`/api/import/template?kind=${entity.kind}&format=xlsx`}
                onClick={() => setExported(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
              >
                <Download className="h-3.5 w-3.5" />
                {t.import.exportThisXlsx}
              </a>
              <a
                href={`/api/import/template?kind=${entity.kind}&format=csv`}
                onClick={() => setExported(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
              >
                <Download className="h-3.5 w-3.5" />
                {t.import.exportThisCsv}
              </a>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {IMPORT_CATALOG.map((item) => (
            <button
              key={item.kind}
              type="button"
              onClick={() => resetKind(item.kind)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-[13px] transition-colors',
                kind === item.kind
                  ? 'border-blue-500 text-blue-400'
                  : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
              )}
            >
              {id ? item.titleId : item.title}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.import.stepFill}</p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-50">{id ? entity.titleId : entity.title}</h2>
                {entity.recommended ? <Badge tone="success">{t.import.recommended}</Badge> : <Badge tone="warning">{t.import.cutover}</Badge>}
              </div>
              <p className="mt-1 text-sm text-zinc-500">{id ? entity.whenId : entity.when}</p>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.import.stepUpload}</p>
              {!exported ? <p className="mt-2 text-sm text-zinc-500">{t.import.uploadLocked}</p> : null}
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) void onPick(selected);
                  event.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={Boolean(busy) || !exported}
                onClick={() => fileRef.current?.click()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-900 disabled:opacity-40"
              >
                <Upload className="h-3.5 w-3.5" />
                {busy === 'preview' ? t.import.working : t.import.upload}
              </button>
            </div>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}

            {preview ? (
              <div className="space-y-3 border-t border-zinc-800 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.import.previewTitle}</p>
                  {file ? (
                    <p className="text-[12px] text-zinc-500">
                      {t.import.fileName}: {file.name}
                    </p>
                  ) : null}
                </div>

                {preview.errorCount > 0 ? (
                  <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                    {t.import.previewBlocked.replace('{{n}}', String(preview.errorCount))}
                  </div>
                ) : preview.total === 0 ? (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                    {t.import.previewEmpty}
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                    {t.import.previewReady.replace('{{create}}', String(preview.createCount)).replace('{{update}}', String(preview.updateCount))}
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-3">
                  <Stat label={t.import.actionCreate} value={preview.createCount} className="text-emerald-400" />
                  <Stat label={t.import.actionUpdate} value={preview.updateCount} className="text-sky-400" />
                  <Stat label={t.import.errors} value={preview.errorCount} className="text-rose-400" />
                </div>

                <div className="nova-scroll max-h-80 overflow-auto rounded-lg border border-zinc-800">
                  <table className="w-full min-w-[640px] text-left text-[12px]">
                    <thead className="sticky top-0 border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">{t.import.row}</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        {preview.columns.slice(0, 5).map((column) => (
                          <th key={column} className="px-3 py-2 font-medium">
                            {column}
                          </th>
                        ))}
                        <th className="px-3 py-2 font-medium">{t.import.errors}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((item) => (
                        <tr
                          key={`${item.row}-${item.action}`}
                          className={cn('border-b border-zinc-800/80', item.action === 'error' && 'bg-rose-500/10')}
                        >
                          <td className="px-3 py-2 font-mono text-zinc-500">{item.row}</td>
                          <td className="px-3 py-2">
                            <Badge tone={item.action === 'error' ? 'danger' : item.action === 'update' ? 'info' : 'success'}>
                              {actionLabel[item.action]}
                            </Badge>
                          </td>
                          {preview.columns.slice(0, 5).map((column) => (
                            <td key={column} className="max-w-[140px] truncate px-3 py-2 text-zinc-300">
                              {item.values[column] || '—'}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-rose-300">{item.message ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!preview.canCommit || !file || Boolean(busy) || Boolean(result)}
                    onClick={() => {
                      if (file) void send('commit', file);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40"
                  >
                    {busy === 'commit' ? t.import.committing : t.import.commit}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
                  >
                    {t.import.chooseOther}
                  </button>
                </div>
              </div>
            ) : null}

            {result ? (
              <div className="space-y-3 border-t border-zinc-800 pt-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.import.stepCommit}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Stat label={t.import.created} value={result.created} className="text-emerald-400" />
                  <Stat label={t.import.updated} value={result.updated} className="text-sky-400" />
                  <Stat label={t.import.errors} value={result.errors.length} className="text-rose-400" />
                </div>
                {result.errors.length > 0 ? (
                  <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                    {t.import.previewBlocked.replace('{{n}}', String(result.errors.length))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">{t.import.clean}</p>
                )}
                <Link href={entity.href} className="text-sm text-blue-400 hover:text-blue-300">
                  {t.import.openModule}
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <aside className="border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.import.orderTitle}</p>
        <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-zinc-400">
          <li>{t.import.orderAccounts}</li>
          <li>{t.import.orderUsers}</li>
          <li>{t.import.orderAssets}</li>
          <li>{t.import.orderCmdb}</li>
          <li>{t.import.orderTickets}</li>
        </ol>
        <p className="mt-6 text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.import.skipTitle}</p>
        <div className="mt-3 space-y-3">
          {IMPORT_SKIP.map((item) => (
            <div key={item.title}>
              <p className="text-sm text-zinc-200">{id ? item.titleId : item.title}</p>
              <p className="text-[12px] text-zinc-500">{id ? item.reasonId : item.reason}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
      <p className={`text-[11px] uppercase tracking-[0.16em] ${className}`}>{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-zinc-50">{value}</p>
    </div>
  );
}
