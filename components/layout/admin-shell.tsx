'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookMarked,
  BookOpen,
  Bug,
  Building2,
  Building,
  ClipboardList,
  Clock,
  GitBranch,
  History,
  CalendarClock,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Palette,
  Plus,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Lightbulb,
  Ticket,
  Upload,
  UserCog,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { CommandPalette } from '@/components/layout/command-palette';
import { AccountSwitcher } from '@/components/accounts/account-switcher';
import { PreferenceControls } from '@/components/layout/preference-controls';
import { useI18n } from '@/components/layout/preferences-provider';
import type { Dictionary } from '@/lib/i18n';
import type { AccountRecord } from '@/lib/accounts/schema';
import type { AppRole, Actions, Subjects } from '@/lib/rbac/ability';
import { canRole } from '@/lib/rbac/ability';
import { isTenantAdminRole, ROLE_LABEL } from '@/lib/rbac/roles';
import { NovaWordmark } from '@/components/brand/nova-mark';
import { cn } from '@/lib/utils';

type NavKey = keyof Dictionary['nav'];
type NavItem = { href: string; labelKey: NavKey; icon: typeof Ticket; action?: Actions; subject?: Subjects };
type ProcessItem = { href: string; type: string | null; labelKey: NavKey; icon: typeof Ticket };

const overviewItems: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, action: 'read', subject: 'Ticket' },
  { href: '/insights', labelKey: 'insights', icon: Lightbulb, action: 'read', subject: 'Ticket' },
  { href: '/assistant', labelKey: 'assistant', icon: Sparkles, action: 'read', subject: 'Ticket' },
  { href: '/reports', labelKey: 'reports', icon: BarChart3, action: 'read', subject: 'Ticket' },
  { href: '/audit', labelKey: 'audit', icon: History, action: 'read', subject: 'Ticket' },
  { href: '/wfm', labelKey: 'wfm', icon: CalendarClock, action: 'read', subject: 'Wfm' },
];

const processItems: ProcessItem[] = [
  { href: '/tickets?type=incident', type: 'incident', labelKey: 'incidents', icon: AlertTriangle },
  { href: '/tickets?type=problem', type: 'problem', labelKey: 'problems', icon: Bug },
  { href: '/tickets?type=change', type: 'change', labelKey: 'changes', icon: GitBranch },
  { href: '/cab', type: 'cab', labelKey: 'cab', icon: ShieldCheck },
  { href: '/tickets?type=request', type: 'request', labelKey: 'requests', icon: ClipboardList },
  { href: '/tickets', type: null, labelKey: 'allTickets', icon: Ticket },
];

const configurationItems: NavItem[] = [
  { href: '/accounts', labelKey: 'accounts', icon: Building2, action: 'read', subject: 'Account' },
  { href: '/org', labelKey: 'organization', icon: Users, action: 'read', subject: 'Org' },
  { href: '/users', labelKey: 'users', icon: UserCog, action: 'read', subject: 'User' },
  { href: '/sla', labelKey: 'sla', icon: Clock, action: 'read', subject: 'Sla' },
  { href: '/assets', labelKey: 'assets', icon: Package, action: 'read', subject: 'Asset' },
  { href: '/cmdb', labelKey: 'cmdb', icon: LayoutGrid, action: 'read', subject: 'Cmdb' },
  { href: '/import', labelKey: 'import', icon: Upload, action: 'create', subject: 'Import' },
];

const platformItems: NavItem[] = [
  { href: '/tenants', labelKey: 'tenants', icon: Building, action: 'read', subject: 'Tenant' },
  { href: '/catalog', labelKey: 'catalog', icon: BookOpen, action: 'read', subject: 'Catalog' },
  { href: '/knowledge', labelKey: 'knowledge', icon: BookMarked, action: 'read', subject: 'Knowledge' },
  { href: '/workflows', labelKey: 'automation', icon: Workflow, action: 'read', subject: 'Workflow' },
  { href: '/governance', labelKey: 'governance', icon: Scale, action: 'read', subject: 'Governance' },
];

function isPathActive(pathname: string, href: string) {
  const path = href.split('?')[0];
  return pathname === path || pathname.startsWith(`${path}/`);
}

function initials(fullName: string) {
  return (
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Ticket;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] leading-none transition-colors duration-200 ease-out',
        active
          ? 'bg-zinc-900 font-medium text-zinc-50'
          : 'text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100',
      )}
    >
      <span
        className={cn(
          'nova-accent-bar absolute inset-y-1.5 left-0 w-[2px] rounded-full transition-opacity duration-200',
          active ? 'opacity-100' : 'opacity-0',
        )}
      />
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors duration-200',
          active ? 'nova-accent-icon' : 'text-zinc-500 group-hover:text-zinc-300',
        )}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );
}

function NavSection({
  title,
  children,
  divided = false,
}: {
  title: string;
  children: ReactNode;
  divided?: boolean;
}) {
  return (
    <div className={cn('px-2.5', divided && 'mt-2 border-t border-zinc-800/80 pt-3')}>
      <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">{title}</p>
      <nav className="flex flex-col gap-px">{children}</nav>
    </div>
  );
}

function ProcessNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const activeType = searchParams.get('type');
  const onDesk = pathname === '/tickets';

  return (
    <NavSection title={t.nav.serviceDesk} divided>
      {processItems.map((item) => {
        const active =
          item.type === 'cab'
            ? pathname.startsWith('/cab')
            : onDesk && ((item.type === null && !activeType) || item.type === activeType);
        return (
          <div key={item.href} className={item.type === null ? 'mt-1 border-t border-zinc-800/60 pt-1' : undefined}>
            <NavLink
              href={item.href}
              label={t.nav[item.labelKey]}
              icon={item.icon}
              active={active}
              onNavigate={onNavigate}
            />
          </div>
        );
      })}
    </NavSection>
  );
}

function ItemSection({
  title,
  items,
  pathname,
  role,
  onNavigate,
  divided = true,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  role: AppRole;
  onNavigate?: () => void;
  divided?: boolean;
}) {
  const { t } = useI18n();
  const visible = items.filter((item) => !item.subject || canRole(role, item.action ?? 'read', item.subject));
  if (visible.length === 0) return null;

  return (
    <NavSection title={title} divided={divided}>
      {visible.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={t.nav[item.labelKey]}
          icon={item.icon}
          active={isPathActive(pathname, item.href)}
          onNavigate={onNavigate}
        />
      ))}
    </NavSection>
  );
}

function SidebarBrand({ onClose }: { onClose?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-3">
      <NovaWordmark subtitle={t.brand.operations} size={28} className="gap-2.5" />
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-zinc-500 transition-colors duration-200 ease-out hover:bg-zinc-900 hover:text-zinc-50"
          aria-label={t.common.closeMenu}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function NewTicketButton({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="px-3 pb-3">
      <Link
        href="/tickets/new"
        onClick={onNavigate}
        className="nova-accent-btn flex h-8 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium text-white transition-all duration-200 ease-out hover:-translate-y-px"
      >
        <Plus className="h-3.5 w-3.5" />
        {t.common.newTicket}
        <kbd className="ml-0.5 hidden font-mono text-[10px] text-blue-100/70 lg:inline">⌘N</kbd>
      </Link>
    </div>
  );
}

function SidebarNav({
  pathname,
  role,
  onNavigate,
}: {
  pathname: string;
  role: AppRole;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="nova-scroll-thin min-h-0 flex-1 overflow-y-auto pb-3 pt-1">
      <ItemSection title={t.nav.overview} items={overviewItems} pathname={pathname} role={role} onNavigate={onNavigate} divided={false} />
      <Suspense fallback={null}>
        <ProcessNav onNavigate={onNavigate} />
      </Suspense>
      <ItemSection
        title={t.nav.configuration}
        items={configurationItems}
        pathname={pathname}
        role={role}
        onNavigate={onNavigate}
      />
      <ItemSection title={t.nav.platform} items={platformItems} pathname={pathname} role={role} onNavigate={onNavigate} />
    </div>
  );
}

function SidebarFooter({
  fullName,
  role,
  pathname,
  onNavigate,
  onSignOut,
}: {
  fullName: string;
  role: AppRole;
  pathname: string;
  onNavigate?: () => void;
  onSignOut: () => void;
}) {
  const { t } = useI18n();
  const appearanceActive = pathname === '/settings/appearance';
  const securityActive = pathname.startsWith('/settings/security');
  const integrationsActive = pathname.startsWith('/settings') && !appearanceActive && !securityActive;
  const roleLabel = t.roles[role] ?? ROLE_LABEL[role] ?? role;

  return (
    <div className="shrink-0 border-t border-zinc-800/80 px-2.5 py-2.5">
      <nav className="mb-2 flex flex-col gap-px">
        <NavLink
          href="/settings/appearance"
          label={t.nav.appearance}
          icon={Palette}
          active={appearanceActive}
          onNavigate={onNavigate}
        />
        <NavLink
          href="/settings/security"
          label={t.nav.security}
          icon={ShieldCheck}
          active={securityActive}
          onNavigate={onNavigate}
        />
        {isTenantAdminRole(role) ? (
          <NavLink
            href="/settings"
            label={t.nav.integrations}
            icon={Settings}
            active={integrationsActive}
            onNavigate={onNavigate}
          />
        ) : null}
      </nav>
      <div className="flex items-center gap-2 rounded-md border border-zinc-800/80 bg-zinc-900/40 px-2 py-1.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-900 font-mono text-[10px] text-zinc-300">
          {initials(fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] leading-4 text-zinc-50">{fullName}</p>
          <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-500">{roleLabel}</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="rounded-md p-1.5 text-zinc-500 transition-colors duration-200 ease-out hover:bg-zinc-800 hover:text-zinc-50"
          aria-label={t.common.signOut}
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function SidebarPanel({
  role,
  fullName,
  accounts,
  activeAccountId,
  pathname,
  onNavigate,
  onSignOut,
  onClose,
}: {
  role: AppRole;
  fullName: string;
  accounts: AccountRecord[];
  activeAccountId?: string | null;
  pathname: string;
  onNavigate?: () => void;
  onSignOut: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-zinc-800/80">
        <SidebarBrand onClose={onClose} />
        <AccountSwitcher accounts={accounts} activeAccountId={activeAccountId} />
        <NewTicketButton onNavigate={onNavigate} />
      </div>
      <SidebarNav pathname={pathname} role={role} onNavigate={onNavigate} />
      <SidebarFooter
        fullName={fullName}
        role={role}
        pathname={pathname}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
      />
    </div>
  );
}

export function AgentShell({
  children,
  role,
  fullName,
  accounts,
  activeAccountId,
}: {
  children: ReactNode;
  role: AppRole;
  fullName: string;
  accounts: AccountRecord[];
  activeAccountId?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable) return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        router.push('/tickets/new');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  const sidebarProps = {
    role,
    fullName,
    accounts,
    activeAccountId,
    pathname,
    onSignOut: () => void handleSignOut(),
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
        <SidebarPanel {...sidebarProps} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label={t.common.closeMenu} onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-60 flex-col border-r border-zinc-800 bg-zinc-950 shadow-2xl">
            <SidebarPanel {...sidebarProps} onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="md:pl-60">
        <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 px-4 py-2.5 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-zinc-800 p-2 text-zinc-300 hover:bg-zinc-900 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={t.common.openMenu}
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/80 px-3 text-left text-sm text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t.common.search}</span>
              <kbd className="ml-auto hidden font-mono text-[10px] text-zinc-600 sm:inline">⌘K</kbd>
            </button>
            <PreferenceControls compact />
            {(() => {
              const active = accounts.find((account) => account.id === activeAccountId);
              return (
                <Link
                  href="/select-account?change=1"
                  className="hidden h-9 max-w-[220px] items-center gap-1.5 truncate rounded-md border border-zinc-800 px-2.5 text-[12px] text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50 lg:inline-flex"
                  title={t.accountPick.change}
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                  <span className="truncate">
                    {active ? (active.code ? `${active.code} · ${active.name}` : active.name) : t.accountPick.allAccounts}
                  </span>
                </Link>
              );
            })()}
            <Link
              href="/tickets/new"
              className="hidden h-9 items-center justify-center gap-1.5 rounded-md border border-zinc-800 px-3 text-[13px] text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-50 sm:inline-flex"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.common.new}
              <kbd className="hidden font-mono text-[10px] text-zinc-600 lg:inline">⌘N</kbd>
            </Link>
          </div>
        </header>
        <motion.main initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
          {children}
        </motion.main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} role={role} />
    </div>
  );
}
