import net from 'net';
import tls from 'tls';

export type SmtpEncryption = 'none' | 'starttls' | 'tls';

export type SmtpSettings = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  from?: string;
  encryption: SmtpEncryption;
};

export type SmtpSendResult = {
  ok: boolean;
  id?: string;
  error?: string;
};

function envDevHost() {
  return process.env.NODE_ENV === 'production' ? '' : '127.0.0.1';
}

function envDevPort() {
  return process.env.NODE_ENV === 'production' ? '' : '54325';
}

function normalizeEncryption(raw: string | undefined, port: number): SmtpEncryption {
  const value = (raw || '').trim().toLowerCase();
  if (value === 'none' || value === 'off') return 'none';
  if (value === 'tls' || value === 'ssl') return 'tls';
  if (value === 'starttls') return 'starttls';
  if (port === 465) return 'tls';
  if (port === 587) return 'starttls';
  return 'none';
}

export function parseSmtpSettings(input?: Record<string, string | undefined> | null): SmtpSettings | null {
  const host = (input?.host || process.env.SMTP_HOST || envDevHost()).trim();
  const port = Number(input?.port || process.env.SMTP_PORT || envDevPort());
  if (!host || !Number.isFinite(port) || port <= 0) return null;
  const username = (input?.username || process.env.SMTP_USER || '').trim() || undefined;
  const password = (input?.password || process.env.SMTP_PASS || '').trim() || undefined;
  const from = (input?.from || process.env.EMAIL_FROM || '').trim() || undefined;
  return {
    host,
    port,
    username,
    password,
    from,
    encryption: normalizeEncryption(input?.encryption, port),
  };
}

export function getSmtpConfig() {
  return parseSmtpSettings(null);
}

export function getMailpitUrl() {
  return process.env.MAILPIT_URL || 'http://127.0.0.1:54324';
}

function extractAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
}

function encodeHeader(value: string) {
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function buildMime(from: string, to: string, subject: string, html: string) {
  const payload = html.replace(/\r\n/g, '\n').replace(/^\./gm, '..');
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    payload,
    '',
  ].join('\r\n');
}

function connectSocket(settings: SmtpSettings) {
  return new Promise<net.Socket>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    if (settings.encryption === 'tls') {
      const socket = tls.connect(
        { host: settings.host, port: settings.port, servername: settings.host },
        () => {
          socket.off('error', onError);
          resolve(socket);
        },
      );
      socket.once('error', onError);
      return;
    }
    const socket = net.createConnection({ host: settings.host, port: settings.port }, () => {
      socket.off('error', onError);
      resolve(socket);
    });
    socket.once('error', onError);
  });
}

function attachReader(socket: net.Socket) {
  let buffer = '';
  const pending: Array<(line: { code: number; text: string }) => void> = [];
  const queue: Array<{ code: number; text: string }> = [];

  const push = (reply: { code: number; text: string }) => {
    const wait = pending.shift();
    if (wait) wait(reply);
    else queue.push(reply);
  };

  socket.setEncoding('utf8');
  socket.on('data', (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const code = Number(line.slice(0, 3));
      if (!code || line[3] === '-') continue;
      push({ code, text: line });
    }
  });

  return {
    read() {
      return new Promise<{ code: number; text: string }>((resolve) => {
        const next = queue.shift();
        if (next) resolve(next);
        else pending.push(resolve);
      });
    },
    send(line: string) {
      socket.write(`${line}\r\n`);
    },
  };
}

export async function sendSmtpEmail(
  to: string,
  subject: string,
  html: string,
  options?: SmtpSettings | { host?: string; port?: number; from?: string },
): Promise<SmtpSendResult> {
  const settings =
    options && 'encryption' in options && options.host && options.port
      ? options
      : parseSmtpSettings({
          host: options && 'host' in options ? options.host : undefined,
          port: options && 'port' in options ? String(options.port ?? '') : undefined,
          from: options && 'from' in options ? options.from : undefined,
        });
  if (!settings) {
    return { ok: false, error: 'SMTP host and port are required.' };
  }

  const fromHeader = settings.from || (options && 'from' in options ? options.from : undefined) || process.env.EMAIL_FROM || 'NovaCRM <no-reply@novacrm.app>';
  const fromAddress = extractAddress(fromHeader);
  const toAddress = extractAddress(to);
  let socket: net.Socket | undefined;
  const timer = setTimeout(() => {
    socket?.destroy();
  }, 12_000);

  try {
    socket = await connectSocket(settings);
    let session = attachReader(socket);

    const expect = async (ok: number | number[], step: string) => {
      const allowed = Array.isArray(ok) ? ok : [ok];
      const reply = await session.read();
      if (!allowed.includes(reply.code)) {
        throw new Error(`${step}: ${reply.text}`);
      }
      return reply;
    };

    await expect(220, 'banner');
    session.send(`EHLO novacrm.local`);
    await expect(250, 'EHLO');

    if (settings.encryption === 'starttls') {
      session.send('STARTTLS');
      await expect(220, 'STARTTLS');
      socket.removeAllListeners('data');
      socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
        const secure = tls.connect({ socket: socket as net.Socket, servername: settings.host }, () => resolve(secure));
        secure.once('error', reject);
      });
      session = attachReader(socket);
      session.send('EHLO novacrm.local');
      await expect(250, 'EHLO');
    }

    if (settings.username && settings.password) {
      const token = Buffer.from(`\0${settings.username}\0${settings.password}`).toString('base64');
      session.send(`AUTH PLAIN ${token}`);
      await expect(235, 'AUTH');
    }

    session.send(`MAIL FROM:<${fromAddress}>`);
    await expect(250, 'MAIL FROM');
    session.send(`RCPT TO:<${toAddress}>`);
    await expect([250, 251], 'RCPT TO');
    session.send('DATA');
    await expect(354, 'DATA');
    socket.write(`${buildMime(fromHeader, to, subject, html)}\r\n.\r\n`);
    await expect(250, 'body');
    session.send('QUIT');
    clearTimeout(timer);
    socket.destroy();
    return { ok: true, id: `smtp:${Date.now()}` };
  } catch (error) {
    clearTimeout(timer);
    socket?.destroy();
    return { ok: false, error: error instanceof Error ? error.message : 'SMTP send failed' };
  }
}
