import { createHash } from 'crypto';
import IORedis from 'ioredis';
import { getRedisUrl } from '@/lib/queue/connection';

export async function allowPublicRequest(
  namespace: string,
  identifier: string,
  limit = 5,
  windowSeconds = 600,
) {
  const digest = createHash('sha256').update(identifier).digest('hex').slice(0, 32);
  const redis = new IORedis(getRedisUrl(), {
    maxRetriesPerRequest: 1,
    connectTimeout: 1200,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    const key = `novacrm:public-rate:${namespace}:${digest}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return { allowed: count <= limit, degraded: false };
  } catch {
    return { allowed: true, degraded: true };
  } finally {
    redis.disconnect();
  }
}
