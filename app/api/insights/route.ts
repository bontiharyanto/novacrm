import { NextRequest, NextResponse } from 'next/server';
import { generateAllInsights, generateInsight, getInsightsBoard } from '@/lib/insights/actions';
import { insightKindSchema } from '@/lib/insights/schema';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;
  const data = await getInsightsBoard();
  return NextResponse.json({ data, error: data ? null : 'Unable to load insights' });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;
  try {
    const body = await request.json().catch(() => ({}));
    const locale = body.locale === 'en' || body.locale === 'id' ? body.locale : undefined;
    if (body.all === true) {
      const result = await generateAllInsights(locale);
      if (result.error && !result.data) {
        return NextResponse.json({ data: null, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ data: result.data, error: null });
    }
    const kind = insightKindSchema.safeParse(body.kind);
    if (!kind.success) {
      return NextResponse.json({ data: null, error: 'Unknown insight kind' }, { status: 400 });
    }
    const result = await generateInsight(kind.data, locale);
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ data: result.data, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Insight generation failed' },
      { status: 500 },
    );
  }
}
