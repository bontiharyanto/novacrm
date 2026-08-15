'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { BarChart3, BookMarked, BookOpen, Building, Building2, CalendarClock, Clock, History, LayoutDashboard, LayoutGrid, Lightbulb, Package, Palette, Scale, Settings, ShieldCheck, Sparkles, Ticket, Upload, UserCog, Users, Workflow } from 'lucide-react';
import { canRole, type AppRole } from '@/lib/rbac/ability';
import { isTenantAdminRole } from '@/lib/rbac/roles';
import { useI18n } from '@/components/layout/preferences-provider';

type TicketHit = { id: string; number?: string; title: string; status: string };

export function CommandPalette({ open, onOpenChange, role }: { open: boolean; onOpenChange: (open: boolean) => void; role: AppRole }) {
  const router = useRouter();
  const { t } = useI18n();
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
            placeholder={t.command.placeholder}
            className="w-full border-b border-zinc-800 bg-transparent px-4 py-3 text-sm text-zinc-50 outline-none placeholder:text-zinc-500"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-sm text-zinc-500">{t.command.empty}</Command.Empty>
            <Command.Group heading={t.command.navigate} className="px-1 py-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              <Command.Item className="cmdk-item" onSelect={() => go('/dashboard')}>
                <LayoutDashboard className="h-3.5 w-3.5" /> {t.nav.dashboard}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/reports')}>
                <BarChart3 className="h-3.5 w-3.5" /> {t.nav.reports}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/audit')}>
                <History className="h-3.5 w-3.5" /> {t.nav.audit}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/assistant')}>
                <Sparkles className="h-3.5 w-3.5" /> {t.nav.assistant}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/insights')}>
                <Lightbulb className="h-3.5 w-3.5" /> {t.nav.insights}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/wfm')}>
                <CalendarClock className="h-3.5 w-3.5" /> {t.nav.wfm}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/wfm/reviews')}>
                <CalendarClock className="h-3.5 w-3.5" /> {t.wfm.reviews}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/tickets')}>
                <Ticket className="h-3.5 w-3.5" /> {t.tickets.title}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/tickets/new')}>
                <Ticket className="h-3.5 w-3.5" /> {t.common.newTicket}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/cab')}>
                <ShieldCheck className="h-3.5 w-3.5" /> {t.nav.cab}
              </Command.Item>
              {canRole(role, 'read', 'Tenant') ? (
                <Command.Item className="cmdk-item" onSelect={() => go('/tenants')}>
                  <Building className="h-3.5 w-3.5" /> {t.nav.tenants}
                </Command.Item>
              ) : null}
              {canRole(role, 'create', 'Tenant') ? (
                <Command.Item className="cmdk-item" onSelect={() => go('/tenants/new')}>
                  <Building className="h-3.5 w-3.5" /> New tenant
                </Command.Item>
              ) : null}
              <Command.Item className="cmdk-item" onSelect={() => go('/accounts')}>
                <Building2 className="h-3.5 w-3.5" /> {t.nav.accounts}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/org')}>
                <Users className="h-3.5 w-3.5" /> {t.nav.organization}
              </Command.Item>
              {canRole(role, 'read', 'User') ? (
                <Command.Item className="cmdk-item" onSelect={() => go('/users')}>
                  <UserCog className="h-3.5 w-3.5" /> {t.nav.users}
                </Command.Item>
              ) : null}
              {canRole(role, 'read', 'Sla') ? (
                <Command.Item className="cmdk-item" onSelect={() => go('/sla')}>
                  <Clock className="h-3.5 w-3.5" /> {t.nav.sla}
                </Command.Item>
              ) : null}
              {canRole(role, 'create', 'Sla') ? (
                <Command.Item className="cmdk-item" onSelect={() => go('/sla/uc/new')}>
                  <Clock className="h-3.5 w-3.5" /> Underpinning contract
                </Command.Item>
              ) : null}
              <Command.Item className="cmdk-item" onSelect={() => go('/assets')}>
                <Package className="h-3.5 w-3.5" /> {t.nav.assets}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/assets/new')}>
                <Package className="h-3.5 w-3.5" /> {t.command.newAsset}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/cmdb')}>
                <LayoutGrid className="h-3.5 w-3.5" /> {t.nav.cmdb}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/cmdb/new')}>
                <LayoutGrid className="h-3.5 w-3.5" /> {t.command.newCi}
              </Command.Item>
              {canRole(role, 'create', 'Import') ? (
                <Command.Item className="cmdk-item" onSelect={() => go('/import')}>
                  <Upload className="h-3.5 w-3.5" /> {t.nav.import}
                </Command.Item>
              ) : null}
              {canRole(role, 'read', 'Knowledge') ? (
                <Command.Item className="cmdk-item" onSelect={() => go('/knowledge')}>
                  <BookMarked className="h-3.5 w-3.5" /> {t.nav.knowledge}
                </Command.Item>
              ) : null}
              <Command.Item className="cmdk-item" onSelect={() => go('/catalog')}>
                <BookOpen className="h-3.5 w-3.5" /> {t.nav.catalog}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/catalog/new')}>
                <BookOpen className="h-3.5 w-3.5" /> {t.command.newCatalog}
              </Command.Item>
              {canRole(role, 'read', 'Workflow') ? (
                <>
                  <Command.Item className="cmdk-item" onSelect={() => go('/workflows')}>
                    <Workflow className="h-3.5 w-3.5" /> {t.nav.automation}
                  </Command.Item>
                  <Command.Item className="cmdk-item" onSelect={() => go('/workflows/new')}>
                    <Workflow className="h-3.5 w-3.5" /> {t.command.newFlow}
                  </Command.Item>
                </>
              ) : null}
              <Command.Item className="cmdk-item" onSelect={() => go('/governance')}>
                <Scale className="h-3.5 w-3.5" /> {t.nav.governance}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/governance/requests')}>
                <Scale className="h-3.5 w-3.5" /> {t.command.dsar}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/settings/security')}>
                <ShieldCheck className="h-3.5 w-3.5" /> {t.nav.security}
              </Command.Item>
              <Command.Item className="cmdk-item" onSelect={() => go('/settings/appearance')}>
                <Palette className="h-3.5 w-3.5" /> {t.nav.appearance}
              </Command.Item>
              {isTenantAdminRole(role) ? (
                <Command.Item className="cmdk-item" onSelect={() => go('/settings')}>
                  <Settings className="h-3.5 w-3.5" /> {t.nav.integrations}
                </Command.Item>
              ) : null}
            </Command.Group>
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
