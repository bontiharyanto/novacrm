'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bug,
  Building2,
  ClipboardList,
  Clock,
  GitBranch,
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
  Ticket,
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
import type { AppRole } from '@/lib/rbac/ability';
import { cn } from '@/lib/utils';

type NavKey = keyof Dictionary['nav'];
type NavItem = { href: string; labelKey: NavKey; icon: typeof Ticket; roles?: AppRole[] };
type ProcessItem = { href: string; type: string | null; labelKey: NavKey; icon: typeof Ticket };

const overviewItems: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, roles: ['admin', 'agent'] },
  { href: '/reports', labelKey: 'reports', icon: BarChart3, roles: ['admin', 'agent'] },
  { href: '/assistant', labelKey: 'assistant', icon: Sparkles, roles: ['admin', 'agent'] },
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
  { href: '/accounts', labelKey: 'accounts', icon: Building2, roles: ['admin', 'agent'] },
  { href: '/org', labelKey: 'organization', icon: Users, roles: ['admin', 'agent'] },
  { href: '/users', labelKey: 'users', icon: UserCog, roles: ['admin', 'agent'] },
  { href: '/sla', labelKey: 'sla', icon: Clock, roles: ['admin', 'agent'] },
  { href: '/assets', labelKey: 'assets', icon: Package, roles: ['admin', 'agent'] },
  { href: '/cmdb', labelKey: 'cmdb', icon: LayoutGrid, roles: ['admin', 'agent'] },
];

const catalogItems: NavItem[] = [
  { href: '/catalog', labelKey: 'catalog', icon: BookOpen, roles: ['admin', 'agent'] },
  { href: '/workflows', labelKey: 'automation', icon: Workflow, roles: ['admin', 'agent'] },
];

const governanceItems: NavItem[] = [
  { href: '/governance', labelKey: 'governance', icon: Scale, roles: ['admin', 'agent'] },
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
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-200 ease-out',
        active ? 'bg-blue-500/10 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
      )}
    >
      <span
        className={cn(
          'absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-blue-500 transition-opacity duration-200',
          active ? 'opacity-100' : 'opacity-0',
        )}
      />
      <Icon className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300')} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function NavSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-3 pb-4">
      <p className="px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">{title}</p>
      <nav className="space-y-0.5">{children}</nav>
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
    <NavSection title={t.nav.serviceDesk}>
      {processItems.map((item) => {
        const active =
          item.type === 'cab'
            ? pathname.startsWith('/cab')
            : onDesk && ((item.type === null && !activeType) || item.type === activeType);
        return (
          <NavLink
            key={item.href}
            href={item.href}
            label={t.nav[item.labelKey]}
            icon={item.icon}
            active={active}
            onNavigate={onNavigate}
          />
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
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  role: AppRole;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const visible = items.filter((item) => !item.roles || item.roles.includes(role));
  if (visible.length === 0) return null;

  return (
    <NavSection title={title}>
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

function SidebarBrand() {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2.5 px-4 py-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[13px] font-semibold text-white">
        N
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold tracking-tight text-zinc-50">{t.brand.name}</p>
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{t.brand.operations}</p>
      </div>
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
        className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-blue-600 text-[13px] font-medium text-white transition-colors duration-200 ease-out hover:bg-blue-500"
      >
        <Plus className="h-3.5 w-3.5" />
        {t.common.newTicket}
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
    <div className="nova-scroll min-h-0 flex-1 overflow-y-auto py-1">
      <ItemSection title={t.nav.overview} items={overviewItems} pathname={pathname} role={role} onNavigate={onNavigate} />
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
      <ItemSection title={t.nav.catalog} items={catalogItems} pathname={pathname} role={role} onNavigate={onNavigate} />
      <ItemSection title={t.nav.governance} items={governanceItems} pathname={pathname} role={role} onNavigate={onNavigate} />
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
  const integrationsActive = pathname.startsWith('/settings') && !appearanceActive;

  return (
    <div className="border-t border-zinc-800 p-3">
      <Link
        href="/settings/appearance"
        onClick={onNavigate}
        className={cn(
          'mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-200 ease-out',
          appearanceActive ? 'bg-blue-500/10 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
        )}
      >
        <Palette className={cn('h-3.5 w-3.5', appearanceActive ? 'text-blue-400' : 'text-zinc-500')} />
        {t.nav.appearance}
      </Link>
      {role === 'admin' ? (
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            'mb-1 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-200 ease-out',
            integrationsActive ? 'bg-blue-500/10 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
          )}
        >
          <Settings className={cn('h-3.5 w-3.5', integrationsActive ? 'text-blue-400' : 'text-zinc-500')} />
          {t.nav.integrations}
        </Link>
      ) : null}
      <div className="flex items-center gap-2.5 rounded-md px-1 py-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-900 font-mono text-[11px] text-zinc-300">
          {initials(fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-zinc-50">{fullName}</p>
          <p className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">{role}</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-50"
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
  const { t } = useI18n();
  return (
    <>
      <div className="relative shrink-0 border-b border-zinc-800">
        <SidebarBrand />
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-md p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
            aria-label={t.common.closeMenu}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <AccountSwitcher accounts={accounts} activeAccountId={activeAccountId} />
      <NewTicketButton onNavigate={onNavigate} />
      <SidebarNav pathname={pathname} role={role} onNavigate={onNavigate} />
      <SidebarFooter
        fullName={fullName}
        role={role}
        pathname={pathname}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
      />
    </>
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
        <SidebarPanel {...sidebarProps} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label={t.common.closeMenu} onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950">
            <SidebarPanel {...sidebarProps} onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="md:pl-64">
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
            <Link
              href="/tickets/new"
              className="hidden h-9 items-center gap-1.5 rounded-md border border-zinc-800 px-3 text-[13px] text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-50 sm:inline-flex"
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
