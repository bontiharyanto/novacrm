import { NextResponse } from 'next/server';
import { validateEnv } from '@/lib/config/env';

export async function GET() {
  const envStatus = validateEnv();

  return NextResponse.json({
    data: {
      status: 'ok',
      envConfigured: envStatus.ok,
      missingEnv: envStatus.missing,
      timestamp: new Date().toISOString(),
    },
    error: null,
  });
}
