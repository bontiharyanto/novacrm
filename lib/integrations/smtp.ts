import net from 'net';

export type SmtpSendResult = {
  ok: boolean;
  id?: string;
  error?: string;
};

function envSmtpHost() {
  return process.env.SMTP_HOST || (process.env.NODE_ENV === 'production' ? '' : '127.0.0.1');
}

function envSmtpPort() {
  const raw = process.env.SMTP_PORT;
  if (raw) return Number(raw);
  return process.env.NODE_ENV === 'production' ? 0 : 54325;
}

export function getSmtpConfig() {
  return {
    host: envSmtpHost(),
    port: envSmtpPort(),
  };
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

export async function sendSmtpEmail(
  to: string,
  subject: string,
  html: string,
  options?: { host?: string; port?: number; from?: string },
): Promise<SmtpSendResult> {
  const host = options?.host || envSmtpHost();
  const port = options?.port || envSmtpPort();
  const fromHeader = options?.from || process.env.EMAIL_FROM || 'NovaCRM <no-reply@novacrm.app>';
  const fromAddress = extractAddress(fromHeader);
  const toAddress = extractAddress(to);

  if (!host || !port) {
    return { ok: false, error: 'SMTP_HOST / SMTP_PORT are not configured.' };
  }

  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let buffer = '';
    let step: 'banner' | 'ehlo' | 'mail' | 'rcpt' | 'data' | 'body' | 'quit' | 'done' = 'banner';
    let settled = false;

    const finish = (result: SmtpSendResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    const timer = setTimeout(() => finish({ ok: false, error: `SMTP timeout ${host}:${port}` }), 8000);

    const send = (line: string) => {
      socket.write(`${line}\r\n`);
    };

    socket.setEncoding('utf8');
    socket.on('error', (error) => {
      clearTimeout(timer);
      finish({ ok: false, error: error.message });
    });
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const code = Number(line.slice(0, 3));
        if (!code || line[3] === '-') continue;

        if (step === 'banner') {
          if (code !== 220) return finish({ ok: false, error: line });
          step = 'ehlo';
          send('EHLO novacrm.local');
          continue;
        }
        if (step === 'ehlo') {
          if (code !== 250) return finish({ ok: false, error: line });
          step = 'mail';
          send(`MAIL FROM:<${fromAddress}>`);
          continue;
        }
        if (step === 'mail') {
          if (code !== 250) return finish({ ok: false, error: line });
          step = 'rcpt';
          send(`RCPT TO:<${toAddress}>`);
          continue;
        }
        if (step === 'rcpt') {
          if (code !== 250 && code !== 251) return finish({ ok: false, error: line });
          step = 'data';
          send('DATA');
          continue;
        }
        if (step === 'data') {
          if (code !== 354) return finish({ ok: false, error: line });
          step = 'body';
          socket.write(`${buildMime(fromHeader, to, subject, html)}\r\n.\r\n`);
          continue;
        }
        if (step === 'body') {
          if (code !== 250) return finish({ ok: false, error: line });
          send('QUIT');
          clearTimeout(timer);
          finish({ ok: true, id: `smtp:${Date.now()}` });
        }
      }
    });
  });
}
