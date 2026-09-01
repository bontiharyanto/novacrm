'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { type AppRole } from '@/lib/rbac/ability';
import { commandNavGroupsForRole, resolveCommandItemLabel } from '@/lib/nav/command-items';
import { useI18n } from '@/components/layout/preferences-provider';

type TicketHit = { id: string; number?: string; title: string; status: string };

export function CommandPalette({ open, onOpenChange, role }: { open: boolean; onOpenChange: (open: boolean) => void; role: AppRole }) {
  const router = useRouter();
  const { t } = useI18n();
  const [tickets, setTickets] = useState<TicketHit[]>([]);
  const groups = useMemo(() => commandNavGroupsForRole(role), [role]);

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
            placeholder={t.command.placeholder}
            className="w-full border-b border-zinc-800 bg-transparent px-4 py-3 text-sm text-zinc-50 outline-none placeholder:text-zinc-500"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-sm text-zinc-500">{t.command.empty}</Command.Empty>
            {groups.map((group) => (
              <Command.Group
                key={group.id}
                heading={t.nav[group.labelKey]}
                className="px-1 py-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500"
              >
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const label = resolveCommandItemLabel(item, t);
                  return (
                    <Command.Item key={`${group.id}-${item.href}-${item.label ?? item.labelKey}`} className="cmdk-item" onSelect={() => go(item.href)}>
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
            {tickets.length > 0 ? (
              <Command.Group heading={t.command.tickets} className="px-1 py-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
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
