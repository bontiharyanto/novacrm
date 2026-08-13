'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeId } from '@/lib/utils/dates';

type TicketItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
};

export function PortalHome() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadTickets() {
    const response = await fetch('/api/tickets');
    const payload = await response.json();
    setTickets(payload.data ?? []);
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: title, status: 'open', priority: 'medium' }),
    });
    setTitle('');
    await loadTickets();
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Buat tiket</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="title">Judul masalah</Label>
              <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} required />
            </div>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Mengirim...' : 'Kirim tiket'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tiket saya</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tickets.length === 0 ? (
            <p className="text-sm text-zinc-400">Belum ada tiket.</p>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div>
                  <p className="font-medium text-white">{ticket.title}</p>
                  <p className="font-mono text-xs text-zinc-500">{ticket.id.slice(0, 8)}</p>
                </div>
                <div className="text-right text-xs text-zinc-400">
                  <div>{ticket.status}</div>
                  <div>{formatRelativeId(ticket.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
