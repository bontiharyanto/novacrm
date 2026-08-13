import { NextResponse } from 'next/server';
import { validateEnv } from '@/lib/config/env';
import { pingRedis } from '@/lib/queue/connection';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const envStatus = validateEnv();
  const redis = await pingRedis();
  const healthy = envStatus.ok && redis.ok;

  return NextResponse.json(
    {
      data: {
        status: healthy ? 'ok' : 'degraded',
        envConfigured: envStatus.ok,
        missingEnv: envStatus.missing,
        redis: redis.ok ? 'up' : 'down',
        redisError: redis.error,
        timestamp: new Date().toISOString(),
      },
      error: null,
    },
    { status: healthy ? 200 : 503 },
  );
}
