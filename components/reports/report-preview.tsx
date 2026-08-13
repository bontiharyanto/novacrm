'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { reportCsvSheet, reportPreviewSheets } from '@/lib/reports/preview';
import type { PreviewSheet } from '@/lib/reports/preview';
import type { ReportExportFormat, ReportSnapshot } from '@/lib/reports/schema';
import { exportFilename, formatLabels, formatReportPeriod } from '@/lib/reports/labels';
import { cn } from '@/lib/utils';

function PreviewTable({ sheet }: { sheet: PreviewSheet }) {
  return (
    <div className="max-h-[72vh] overflow-auto rounded-lg border border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
          <tr>
            {sheet.columns.map((column) => (
              <th key={column} className="whitespace-nowrap px-3 py-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.rows.length === 0 ? (
            <tr>
              <td className="px-3 py-8 text-center text-zinc-500" colSpan={sheet.columns.length}>
                Empty sheet
              </td>
            </tr>
          ) : (
            sheet.rows.map((row, index) => (
              <tr key={`${sheet.name}-${index}`} className="border-b border-zinc-800/80 odd:bg-zinc-950/40">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${sheet.name}-${index}-${cellIndex}`}
                    className={cn(
                      'px-3 py-2 text-zinc-300',
                      cellIndex === 0 ? 'font-mono text-[12px] text-zinc-500' : '',
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ReportPreview({
  report,
  format,
}: {
  report: ReportSnapshot;
  format: ReportExportFormat;
}) {
  const sheets = useMemo(() => reportPreviewSheets(report), [report]);
  const csvSheet = useMemo(() => reportCsvSheet(report), [report]);
  const [sheetName, setSheetName] = useState(sheets[0]?.name ?? 'Summary');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(format === 'pdf');

  useEffect(() => {
    setSheetName(sheets[0]?.name ?? 'Summary');
  }, [sheets]);

  useEffect(() => {
    if (format !== 'pdf') {
      setPdfUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return '';
      });
      setPdfLoading(false);
      return;
    }
    let active = true;
    let objectUrl = '';
    setPdfLoading(true);
    setPdfError('');
    void fetch(
      `/api/reports/export?from=${report.periodStart}&to=${report.periodEnd}&format=pdf&preview=1`,
    )
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to render PDF');
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (!active) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setPdfUrl(objectUrl);
      })
      .catch((error: unknown) => {
        if (active) setPdfError(error instanceof Error ? error.message : 'Unable to render PDF');
      })
      .finally(() => {
        if (active) setPdfLoading(false);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [format, report.periodStart, report.periodEnd]);

  const activeSheet = sheets.find((sheet) => sheet.name === sheetName) ?? sheets[0];
  const filename = exportFilename(report, format);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              Preview · {formatLabels[format]} · {formatReportPeriod(report)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-zinc-600">{filename}</p>
          </div>
          <Badge tone="info">
            {activeSheet && format === 'xlsx' ? `${activeSheet.rows.length} rows` : `${report.rangeDays}d`}
          </Badge>
        </div>

        {format === 'pdf' ? (
          pdfLoading ? (
            <Skeleton className="h-[72vh] w-full rounded-lg" />
          ) : pdfError ? (
            <p className="py-8 text-center text-sm text-rose-400">{pdfError}</p>
          ) : (
            <iframe
              title="PDF preview"
              src={pdfUrl}
              className="h-[72vh] w-full rounded-lg border border-zinc-800 bg-zinc-950"
            />
          )
        ) : null}

        {format === 'csv' ? <PreviewTable sheet={csvSheet} /> : null}

        {format === 'xlsx' && activeSheet ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {sheets.map((sheet) => (
                <button
                  key={sheet.name}
                  type="button"
                  onClick={() => setSheetName(sheet.name)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs transition-all duration-200 ease-out hover:-translate-y-0.5',
                    sheet.name === activeSheet.name
                      ? 'bg-blue-500/15 text-blue-200'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50',
                  )}
                >
                  {sheet.name}
                  <span className="ml-1.5 font-mono text-[10px] text-zinc-600">{sheet.rows.length}</span>
                </button>
              ))}
            </div>
            <PreviewTable sheet={activeSheet} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
