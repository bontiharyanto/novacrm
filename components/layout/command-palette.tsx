'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { BarChart3, BookOpen, Building2, Clock, LayoutDashboard, LayoutGrid, Package, Scale, Settings, ShieldCheck, Sparkles, Ticket, UserCog, Users, Workflow } from 'lucide-react';
import type { AppRole } from '@/lib/rbac/ability';

type TicketHit = { id: string; number?: string; title: string; status: string };

export function CommandPalette({ open, onOpenChange, role }: { open: boolean; onOpenChange: (open: boolean) => void; role: AppRole }) {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketHit[]>([]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    void fetch('/api/tickets')
      .then((response) => response.json())
      .then((payload) => {
        const rows = (payload.data ?? []) as Array<{ id: string; number?: string; title: string; status: string }>;
        setTickets(rows.slice(0, 8));
      })
      .catch(() => setTickets([]));
  }, [open]);

  function go(path: string) {
    onOpenChange(false);
    router.push(path);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60">
      <button type="button" className="absolute inset-0" aria-label="Close command palette" onClick={() => onOpenChange(false)} />
      <div className="relative mx-auto mt-[18vh] w-full max-w-xl px-4">
        <Command label="Command palette" className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <Command.Input
            autoFocus
            placeholder="Search tickets or jump to a page..."
            className="w-full border-b border-zinc-800 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-sm text-zinc-500">No matches.</Command.Empty>
            <Command.Group heading="Navigate" className="px-1 py-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              <Command.Item className="cmdk-item" onSelect={() => go('/dashboard')}>
                <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/reports')}>
                <BarChart3 className="h-3.5 w-3.5" /> Reports
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/assistant')}>
                <Sparkles className="h-3.5 w-3.5" /> Assistant
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/tickets')}>
                <Ticket className="h-3.5 w-3.5" /> Tickets
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/tickets/new')}>
                <Ticket className="h-3.5 w-3.5" /> New ticket
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/cab')}>
                <ShieldCheck className="h-3.5 w-3.5" /> CAB
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/accounts')}>
                <Building2 className="h-3.5 w-3.5" /> Accounts
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/org')}>
                <Users className="h-3.5 w-3.5" /> Organization
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/users')}>
                <UserCog className="h-3.5 w-3.5" /> Users
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/sla')}>
                <Clock className="h-3.5 w-3.5" /> SLA
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/assets')}>
                <Package className="h-3.5 w-3.5" /> Assets
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/assets/new')}>
                <Package className="h-3.5 w-3.5" /> New asset
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/cmdb')}>
                <LayoutGrid className="h-3.5 w-3.5" /> CMDB
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/cmdb/new')}>
                <LayoutGrid className="h-3.5 w-3.5" /> New CI
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/catalog')}>
                <BookOpen className="h-3.5 w-3.5" /> Catalog
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/catalog/new')}>
                <BookOpen className="h-3.5 w-3.5" /> New catalog item
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/workflows')}>
                <Workflow className="h-3.5 w-3.5" /> Automation
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/workflows/new')}>
                <Workflow className="h-3.5 w-3.5" /> New flow
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/governance')}>
                <Scale className="h-3.5 w-3.5" /> Governance
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/governance/requests')}>
                <Scale className="h-3.5 w-3.5" /> DSAR queue
              </Command.Item>
              {role === 'admin' ? (
                <Command.Item className="cmdk-item" onSelect={() => go('/settings')}>
                  <Settings className="h-3.5 w-3.5" /> Integrations
                </Command.Item>
              ) : null}
            </Command.Group>
            {tickets.length > 0 ? (
              <Command.Group heading="Tickets" className="px-1 py-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                {tickets.map((ticket) => (
                  <Command.Item key={ticket.id} className="cmdk-item" onSelect={() => go(`/tickets/${ticket.id}`)}>
                    <span className="font-mono text-[11px] text-zinc-500">{ticket.number ?? `#${ticket.id.slice(0, 8)}`}</span>
                    {ticket.title}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
