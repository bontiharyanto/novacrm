import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import net from 'net';
import { Queue } from 'bullmq';
import { loadLocalEnvFile } from '../lib/config/load-local-env';
import {
  createRedisConnection,
  notificationQueueName,
  pingRedis,
  wfmQueueName,
  workflowQueueName,
} from '../lib/queue/connection';

loadLocalEnvFile();

const PORT = Number(process.env.OPS_PORT || 3100);
const BIND = process.env.OPS_BIND || '127.0.0.1';
const TOKEN = (process.env.OPS_TOKEN || '').trim();
const APP_URL = process.env.APP_URL || 'http://127.0.0.1:3000';
const DOCKER_APP_URL = process.env.DOCKER_APP_URL || 'http://127.0.0.1:3001';
const MINIO_API = process.env.MINIO_ENDPOINT || 'http://127.0.0.1:9000';
const MINIO_CONSOLE = process.env.MINIO_CONSOLE_URL || 'http://127.0.0.1:9001';
const SUPABASE_URL = process.env.NOVACRM_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const STUDIO_URL = process.env.SUPABASE_STUDIO_URL || 'http://127.0.0.1:54323';
const MAILPIT_URL = process.env.MAILPIT_URL || 'http://127.0.0.1:54324';
const PG_HOST = process.env.OPS_PROBE_HOST || '127.0.0.1';
const PG_PORT = Number(process.env.POSTGRES_PORT || 54322);

function probeUrl(url: string) {
  const host = process.env.OPS_PROBE_HOST;
  if (!host) return url;
  return url.replace('127.0.0.1', host).replace('localhost', host);
}

const QUEUES = [
  { key: 'notifications', name: notificationQueueName },
  { key: 'workflows', name: workflowQueueName },
  { key: 'wfm', name: wfmQueueName },
] as const;

const PAGE = readFileSync(resolve(process.cwd(), 'ops/dashboard.html'), 'utf8');
const redis = createRedisConnection();
const queues = QUEUES.map((item) => ({
  ...item,
  queue: new Queue(item.name, { connection: redis }),
}));

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function clientIsLoopback(req: IncomingMessage) {
  const ip = req.socket.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === ':ffff:127.0.0.1';
}

function authorized(req: IncomingMessage) {
  if (process.env.OPS_ALLOW_UNAUTHENTICATED === 'true') return true;
  if (TOKEN) {
    const header = req.headers['x-ops-token'];
    const bearer =
      typeof req.headers.authorization === 'string' ? req.headers.authorization.replace(/^Bearer\s+/i, '') : '';
    const cookie = (req.headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('ops_token='))
      ?.slice('ops_token='.length);
    return header === TOKEN || bearer === TOKEN || cookie === TOKEN;
  }
  return clientIsLoopback(req);
}

async function probeHttp(url: string, timeoutMs = 1600) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'manual' });
    return { ok: response.status < 500, status: response.status };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

function probeTcp(host: string, port: number, timeoutMs = 1200) {
  return new Promise<{ ok: boolean; error?: string }>((resolveProbe) => {
    const socket = net.connect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolveProbe({ ok: false, error: 'timeout' });
    }, timeoutMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.end();
      resolveProbe({ ok: true });
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      resolveProbe({ ok: false, error: error.message });
    });
  });
}

async function queueSnapshot() {
  return Promise.all(
    queues.map(async (item) => {
      const counts = await item.queue.getJobCounts('wait', 'active', 'delayed', 'failed', 'completed');
      const failed = await item.queue.getFailed(0, 19);
      let workers = 0;
      try {
        workers = (await item.queue.getWorkers()).length;
      } catch {
        workers = 0;
      }
      return {
        key: item.key,
        name: item.name,
        label:
          item.key === 'notifications' ? 'Notifications' : item.key === 'workflows' ? 'Workflows' : 'WFM dispatch',
        counts: {
          waiting: counts.wait ?? 0,
          active: counts.active ?? 0,
          delayed: counts.delayed ?? 0,
          failed: counts.failed ?? 0,
          completed: counts.completed ?? 0,
        },
        workers,
        failed: failed.map((job) => ({
          id: String(job.id),
          name: job.name,
          attempts: job.attemptsMade,
          failedReason: (job.failedReason || '').slice(0, 240),
          timestamp: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
        })),
      };
    }),
  );
}

async function statusPayload() {
  const [redisPing, pg, app, dockerApp, minio, minioUi, supabase, studio, mailpit, queue] = await Promise.all([
    pingRedis(),
    probeTcp(PG_HOST, PG_PORT),
    probeHttp(`${probeUrl(APP_URL).replace(/\/$/, '')}/api/health`),
    probeHttp(`${probeUrl(DOCKER_APP_URL).replace(/\/$/, '')}/api/health`),
    probeHttp(`${probeUrl(MINIO_API).replace(/\/$/, '')}/minio/health/live`),
    probeHttp(probeUrl(MINIO_CONSOLE)),
    probeHttp(`${probeUrl(SUPABASE_URL).replace(/\/$/, '')}/auth/v1/health`),
    probeHttp(probeUrl(STUDIO_URL)),
    probeHttp(probeUrl(MAILPIT_URL)),
    queueSnapshot().catch((error) => ({ error: error instanceof Error ? error.message : 'queue unavailable' })),
  ]);

  const services = [
    { id: 'app', label: 'App (dev)', url: APP_URL, port: 3000, ...app },
    { id: 'docker', label: 'App (Docker)', url: DOCKER_APP_URL, port: 3001, ...dockerApp },
    { id: 'redis', label: 'Redis', url: 'redis://127.0.0.1:6379', port: 6379, ok: redisPing.ok, error: redisPing.error },
    { id: 'postgres', label: 'Postgres', url: `127.0.0.1:${PG_PORT}`, port: PG_PORT, ...pg },
    { id: 'supabase', label: 'Supabase API', url: SUPABASE_URL, port: 54321, ...supabase },
    { id: 'studio', label: 'Supabase Studio', url: STUDIO_URL, port: 54323, ...studio },
    { id: 'minio', label: 'MinIO API', url: MINIO_API, port: 9000, ...minio },
    { id: 'minio-ui', label: 'MinIO console', url: MINIO_CONSOLE, port: 9001, ...minioUi },
    { id: 'mailpit', label: 'Mailpit', url: MAILPIT_URL, port: 54324, ...mailpit },
    { id: 'ops', label: 'Ops backend', url: `http://${BIND}:${PORT}`, port: PORT, ok: true, status: 200 },
  ];

  return {
    generatedAt: new Date().toISOString(),
    bind: BIND,
    port: PORT,
    services,
    queues: Array.isArray(queue) ? queue : [],
    queueError: Array.isArray(queue) ? null : (queue as { error: string }).error,
    links: {
      app: APP_URL,
      docker: DOCKER_APP_URL,
      studio: STUDIO_URL,
      minio: MINIO_CONSOLE,
      mailpit: MAILPIT_URL,
    },
  };
}

function findQueue(key: string) {
  return queues.find((item) => item.key === key || item.name === key) ?? null;
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', `http://${req.headers.host || `${BIND}:${PORT}`}`);
  const method = req.method || 'GET';

  if (url.pathname === '/health') {
    json(res, 200, { data: { status: 'ok', service: 'ops', port: PORT }, error: null });
    return;
  }

  if (!authorized(req)) {
    json(res, 401, { data: null, error: 'Unauthorized. Set OPS_TOKEN or bind 127.0.0.1.' });
    return;
  }

  if (method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(PAGE);
    return;
  }

  if (method === 'GET' && url.pathname === '/api/status') {
    json(res, 200, { data: await statusPayload(), error: null });
    return;
  }

  const retryOne = url.pathname.match(/^\/api\/queues\/([a-z-]+)\/jobs\/([^/]+)\/retry$/);
  if (method === 'POST' && retryOne) {
    const target = findQueue(retryOne[1]);
    if (!target) {
      json(res, 404, { data: null, error: 'Unknown queue' });
      return;
    }
    const job = await target.queue.getJob(decodeURIComponent(retryOne[2]));
    if (!job) {
      json(res, 404, { data: null, error: 'Job not found' });
      return;
    }
    await job.retry();
    json(res, 200, { data: { id: job.id, retried: true }, error: null });
    return;
  }

  const retryAll = url.pathname.match(/^\/api\/queues\/([a-z-]+)\/failed\/retry$/);
  if (method === 'POST' && retryAll) {
    const target = findQueue(retryAll[1]);
    if (!target) {
      json(res, 404, { data: null, error: 'Unknown queue' });
      return;
    }
    const failed = await target.queue.getFailed(0, 99);
    for (const job of failed) await job.retry();
    json(res, 200, { data: { retried: failed.length }, error: null });
    return;
  }

  await readBody(req);
  json(res, 404, { data: null, error: 'Not found' });
}

const server = createServer((req, res) => {
  void handle(req, res).catch((error) => {
    json(res, 500, { data: null, error: error instanceof Error ? error.message : 'Ops backend failed' });
  });
});

server.listen(PORT, BIND, () => {
  console.info(`NovaCRM ops backend  http://${BIND}:${PORT}`);
  console.info('Sysadmin console for health, queues, and retries. Independent of Next.js.');
  if (!TOKEN && BIND === '127.0.0.1') {
    console.info('Bound to loopback. Set OPS_TOKEN if you expose this beyond this laptop.');
  }
});

async function shutdown() {
  await Promise.all(queues.map((item) => item.queue.close()));
  redis.disconnect();
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
