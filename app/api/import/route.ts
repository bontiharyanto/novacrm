import { NextRequest, NextResponse } from 'next/server';
import { runBulkImport } from '@/lib/import/actions';
import { isImportKind } from '@/lib/import/catalog';
import { parseImportFile } from '@/lib/import/parse';
import { previewBulkImport } from '@/lib/import/preview';
import { requireApiUser } from '@/lib/api/require-user';

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const form = await request.formData();
    const kind = String(form.get('kind') ?? '');
    const mode = String(form.get('mode') ?? 'preview');
    const file = form.get('file');
    if (!isImportKind(kind)) {
      return NextResponse.json({ data: null, error: 'Unknown import type.' }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ data: null, error: 'Attach a CSV or Excel file.' }, { status: 400 });
    }
    const parsed = await parseImportFile(file);
    if (parsed.error) {
      return NextResponse.json({ data: null, error: parsed.error }, { status: 400 });
    }

    if (mode !== 'commit') {
      const preview = await previewBulkImport(kind, parsed.rows);
      if (preview.error) {
        return NextResponse.json({ data: null, error: preview.error }, { status: 400 });
      }
      return NextResponse.json({ data: { preview: preview.data }, error: null });
    }

    const preview = await previewBulkImport(kind, parsed.rows);
    if (preview.error) {
      return NextResponse.json({ data: null, error: preview.error }, { status: 400 });
    }
    if (!preview.data?.canCommit) {
      return NextResponse.json(
        {
          data: { preview: preview.data },
          error: 'Import is blocked. Fix the row errors in the preview first.',
        },
        { status: 400 },
      );
    }

    const result = await runBulkImport(kind, parsed.rows);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ data: { result: result.data, preview: preview.data }, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 },
    );
  }
}
