'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type WorkflowRule = {
  id: string;
  name: string;
  event: 'ticket.create' | 'ticket.status_change' | 'ticket.comment_add';
  action: 'send_email' | 'assign' | 'change_status' | 'create_asset';
  target?: string;
  createdAt: string;
};

export function WorkflowDashboard() {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [name, setName] = useState('');
  const [event, setEvent] = useState<WorkflowRule['event']>('ticket.create');
  const [action, setAction] = useState<WorkflowRule['action']>('send_email');

  async function loadRules() {
    const response = await fetch('/api/workflows');
    const payload = await response.json();
    setRules(payload.data ?? []);
  }

  useEffect(() => {
    void loadRules();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, event, action, target: 'requester' }),
    });

    setName('');
    setEvent('ticket.create');
    setAction('send_email');
    await loadRules();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-blue-400">Workflow Automation</p>
          <h1 className="text-3xl font-bold text-white">Rules</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create rule</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Rule name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Auto acknowledge ticket" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event">Event</Label>
              <select
                id="event"
                value={event}
                onChange={(e) => setEvent(e.target.value as WorkflowRule['event'])}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="ticket.create">ticket.create</option>
                <option value="ticket.status_change">ticket.status_change</option>
                <option value="ticket.comment_add">ticket.comment_add</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <select
                id="action"
                value={action}
                onChange={(e) => setAction(e.target.value as WorkflowRule['action'])}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="send_email">send_email</option>
                <option value="assign">assign</option>
                <option value="change_status">change_status</option>
                <option value="create_asset">create_asset</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Create workflow rule</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflow rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.length === 0 ? (
            <p className="text-zinc-400">No workflow rules yet.</p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <p className="font-medium text-white">{rule.name}</p>
                <p className="text-xs text-zinc-400">{rule.event} → {rule.action}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
