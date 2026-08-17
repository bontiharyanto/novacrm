import IORedis from 'ioredis';

export function getRedisUrl() {
  return process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
}

export function createRedisConnection() {
  return new IORedis(getRedisUrl(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

export async function pingRedis() {
  const client = new IORedis(getRedisUrl(), {
    maxRetriesPerRequest: 1,
    connectTimeout: 1500,
    lazyConnect: true,
  });

  try {
    await client.connect();
    const pong = await client.ping();
    await client.quit();
    return { ok: pong === 'PONG', error: null };
  } catch (error) {
    client.disconnect();
    return { ok: false, error: error instanceof Error ? error.message : 'Redis unreachable' };
  }
}

export const notificationQueueName = 'novacrm-notifications';
export const workflowQueueName = 'novacrm-workflows';
export const wfmQueueName = 'novacrm-wfm';
export const csatQueueName = 'novacrm-csat';
