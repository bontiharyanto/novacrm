'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketKanban } from '@/components/tickets/ticket-kanban';

type TicketItem = {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting' | 'on_hold' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  assigneeName?: string;
  createdAt: string;
  comments: Array<{ id: string; author: string; comment: string; createdAt: string }>;
};

export function TicketDashboard() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [title, setTitle] = useState('');
  const [requesterName, setRequesterName] = useState('Customer');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [dueDate, setDueDate] = useState('');
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

    const response = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: 'Created from ticket dashboard',
        requesterName,
        requesterEmail,
        requesterPhone,
        dueDate: dueDate || undefined,
        status: 'open',
        priority: 'medium',
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error(result.error);
      setIsSubmitting(false);
      return;
    }

    setTitle('');
    setRequesterName('Customer');
    setRequesterEmail('');
    setRequesterPhone('');
    setDueDate('');
    await loadTickets();
    setIsSubmitting(false);
  }

  const openCount = tickets.filter((ticket) => ticket.status === 'open').length;
  const onHoldCount = tickets.filter((ticket) => ticket.status === 'on_hold').length;
  const atRiskCount = tickets.filter((ticket) => {
    if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
    if (!ticket.dueDate) return false;
    const due = new Date(ticket.dueDate).getTime();
    const now = Date.now();
    return due <= now + 1000 * 60 * 60 * 24;
  }).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-blue-400">Tickets</p>
          <h1 className="text-3xl font-bold text-white">Operations dashboard</h1>
        </div>
        <Button type="button">New ticket</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Total</p>
            <p className="mt-2 text-2xl font-semibold text-white">{tickets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-sky-400">Open</p>
            <p className="mt-2 text-2xl font-semibold text-white">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-orange-400">On Hold</p>
            <p className="mt-2 text-2xl font-semibold text-white">{onHoldCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-400">SLA Risk</p>
            <p className="mt-2 text-2xl font-semibold text-white">{atRiskCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Laptop bluescreen after update" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requesterName">Requester</Label>
              <Input id="requesterName" value={requesterName} onChange={(event) => setRequesterName(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requesterEmail">Email</Label>
              <Input id="requesterEmail" type="email" value={requesterEmail} onChange={(event) => setRequesterEmail(event.target.value)} placeholder="customer@example.com" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="requesterPhone">Phone / WhatsApp</Label>
              <Input id="requesterPhone" value={requesterPhone} onChange={(event) => setRequesterPhone(event.target.value)} placeholder="62812..." />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={isSubmitting || !title.trim()}>
                {isSubmitting ? 'Creating...' : 'Create ticket'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-zinc-400">No tickets yet.</CardContent>
        </Card>
      ) : (
        <TicketKanban tickets={tickets} />
      )}
    </div>
  );
}
