import type { PluginField, PluginTestSpec } from '@/lib/integrations/plugin-schema';

const PRIVATE_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/i;
const PRIVATE_IP = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)/;

function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? '');
}

function isPublicHttpUrl(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  if (parsed.username || parsed.password) return false;
  const host = parsed.hostname;
  if (PRIVATE_HOST.test(host) || PRIVATE_IP.test(host) || host.endsWith('.local')) return false;
  return true;
}

function headerValue(spec: PluginTestSpec, values: Record<string, string>): Record<string, string> {
  if (!spec.auth) return {};
  if (spec.auth.type === 'bearer') {
    const token = values[spec.auth.tokenField] ?? '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  if (spec.auth.type === 'ssws') {
    const token = values[spec.auth.tokenField] ?? '';
    return token ? { Authorization: `SSWS ${token}` } : {};
  }
  const user = values[spec.auth.userField] ?? '';
  const pass = values[spec.auth.passField] ?? '';
  if (!user || !pass) return {};
  const encoded = Buffer.from(`${user}:${pass}`).toString('base64');
  return { Authorization: `Basic ${encoded}` };
}

export async function pingPluginHttp(
  spec: PluginTestSpec,
  fields: PluginField[],
  values: Record<string, string>,
): Promise<{ ok: boolean; error?: string; message?: string }> {
  if (spec.kind !== 'http' || !spec.url) {
    return { ok: false, error: 'This plugin has no connection test.' };
  }
  const allowed = new Set(fields.map((field) => field.key));
  const safeValues: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (allowed.has(key)) safeValues[key] = value;
  }
  const url = interpolate(spec.url, safeValues).trim();
  if (!url) {
    if (pluginHasRequired(fields, values)) {
      return { ok: true, message: 'Required fields saved. Add the test URL to ping the provider.' };
    }
    return { ok: false, error: 'Fill the required fields, then test again.' };
  }
  if (!isPublicHttpUrl(url)) {
    return { ok: false, error: 'Test URL must be a public http(s) address.' };
  }
  const method = spec.method ?? 'GET';
  const headers: Record<string, string> = {
    Accept: 'application/json, application/xml;q=0.9, */*;q=0.8',
    ...headerValue(spec, safeValues),
  };
  try {
    const response = await fetch(url, {
      method,
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return { ok: false, error: `Provider returned ${response.status}` };
    }
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === 'object' && 'ok' in payload && payload.ok === false) {
      const error =
        typeof (payload as { error?: string }).error === 'string'
          ? (payload as { error: string }).error
          : 'Provider rejected the credentials';
      return { ok: false, error };
    }
    return { ok: true, message: 'Connection test succeeded.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to reach provider' };
  }
}

export function pluginHasRequired(fields: PluginField[], values: Record<string, string>) {
  return fields.every((field) => !field.required || Boolean(values[field.key]?.trim()));
}
