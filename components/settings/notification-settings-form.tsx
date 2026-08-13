'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type NotificationLogRow = {
  id: string;
  channel: string;
  recipient: string;
  subject: string;
  status: 'queued' | 'sent' | 'failed';
  createdAt: string;
};

type SettingsState = {
  whatsappApiKey: string;
  telegramBotToken: string;
  telegramChatId: string;
  emailApiKey: string;
  emailFrom: string;
  whatsappConfigured?: boolean;
  telegramConfigured?: boolean;
  emailConfigured?: boolean;
};

const initialState: SettingsState = {
  whatsappApiKey: '',
  telegramBotToken: '',
  telegramChatId: '',
  emailApiKey: '',
  emailFrom: 'NovaCRM <no-reply@novacrm.app>',
};

export function NotificationSettingsForm() {
  const [settings, setSettings] = useState<SettingsState>(initialState);
  const [logs, setLogs] = useState<NotificationLogRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');

  async function loadLogs() {
    const logResponse = await fetch('/api/notifications/logs');
    const logPayload = await logResponse.json();
    if (logPayload.data) {
      setLogs(logPayload.data as NotificationLogRow[]);
    }
  }

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/settings/notifications');
      const payload = await response.json();
      if (payload.data) {
        setSettings({
          ...initialState,
          telegramChatId: payload.data.telegramChatId ?? '',
          emailFrom: payload.data.emailFrom ?? initialState.emailFrom,
          whatsappConfigured: payload.data.whatsappConfigured,
          telegramConfigured: payload.data.telegramConfigured,
          emailConfigured: payload.data.emailConfigured,
        });
      }
      await loadLogs();
    }

    void load();
  }, []);

  async function saveSettings() {
    setIsSaving(true);
    const response = await fetch('/api/settings/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    const payload = await response.json();
    setStatus(response.ok ? 'Settings saved successfully.' : payload.error ?? 'Failed to save settings.');
    setIsSaving(false);
    await loadLogs();
  }

  async function testChannel(channel: 'whatsapp' | 'telegram' | 'email') {
    const response = await fetch('/api/settings/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, values: settings }),
    });

    const payload = await response.json();
    setStatus(payload.data?.message ?? payload.error ?? 'Testing channel failed.');
    await loadLogs();
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Notification Settings</h1>
        <p className="text-sm text-zinc-400">
          Ticket create, status, and comment events notify the requester and assignee. On this laptop, email lands in Mailpit at http://127.0.0.1:54324.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp</CardTitle>
            <CardDescription>Fonnte / Whacenter / Wabot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappApiKey">API Key</Label>
              <Input
                id="whatsappApiKey"
                type="password"
                value={settings.whatsappApiKey}
                onChange={(event) => setSettings((prev) => ({ ...prev, whatsappApiKey: event.target.value }))}
                placeholder={settings.whatsappConfigured ? 'Tersimpan (biarkan kosong untuk keep)' : 'Fonnte token'}
              />
            </div>
            <Button onClick={() => void testChannel('whatsapp')}>Kirim Test</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Telegram</CardTitle>
            <CardDescription>Bot token + chat ID</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telegramBotToken">Bot Token</Label>
              <Input
                id="telegramBotToken"
                type="password"
                value={settings.telegramBotToken}
                onChange={(event) => setSettings((prev) => ({ ...prev, telegramBotToken: event.target.value }))}
                placeholder="Telegram Bot token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegramChatId">Chat ID</Label>
              <Input
                id="telegramChatId"
                value={settings.telegramChatId}
                onChange={(event) => setSettings((prev) => ({ ...prev, telegramChatId: event.target.value }))}
                placeholder="-100..."
              />
            </div>
            <Button onClick={() => void testChannel('telegram')}>Kirim Test</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>
              {settings.emailConfigured
                ? 'Resend is configured'
                : 'Local Mailpit — http://127.0.0.1:54324'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailApiKey">API Key</Label>
              <Input
                id="emailApiKey"
                type="password"
                value={settings.emailApiKey}
                onChange={(event) => setSettings((prev) => ({ ...prev, emailApiKey: event.target.value }))}
                placeholder="Resend API key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailFrom">From</Label>
              <Input
                id="emailFrom"
                value={settings.emailFrom}
                onChange={(event) => setSettings((prev) => ({ ...prev, emailFrom: event.target.value }))}
                placeholder="NovaCRM <no-reply@novacrm.app>"
              />
            </div>
            <Button onClick={() => void testChannel('email')}>Kirim Test</Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={() => void saveSettings()} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save settings'}</Button>
        {status && <span className="text-sm text-zinc-300">{status}</span>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent notification activity</CardTitle>
          <CardDescription>Last outbound attempts across all channels</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-zinc-400">No notification logs yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                  <div>
                    <p className="text-sm font-medium text-white">{log.channel}</p>
                    <p className="text-xs text-zinc-400">{log.recipient} • {log.subject}</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className={`inline-flex rounded-full px-2 py-1 ${
                      log.status === 'sent'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : log.status === 'failed'
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {log.status === 'queued' ? 'local' : log.status}
                    </span>
                    <p className="mt-1 text-zinc-500">{new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
