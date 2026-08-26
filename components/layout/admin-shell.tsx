'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookMarked,
  BookOpen,
  Bug,
  Building2,
  Building,
  ChevronDown,
  ClipboardList,
  Clock,
  Folder,
  FolderOpen,
  GitBranch,
  History,
  CalendarClock,
  Gauge,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  Package,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
  Plus,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Lightbulb,
  Ticket,
  Upload,
  UserCog,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOutAction } from '@/lib/auth/actions';
import { AskAiButton, AssistantWidget } from '@/components/assistant/assistant-widget';
import { CommandPalette } from '@/components/layout/command-palette';
import { AccountSwitcher } from '@/components/accounts/account-switcher';
import { PreferenceControls } from '@/components/layout/preference-controls';
import { useI18n } from '@/components/layout/preferences-provider';
import type { Dictionary } from '@/lib/i18n';
import type { AccountRecord } from '@/lib/accounts/schema';
import type { AppRole, Actions, Subjects } from '@/lib/rbac/ability';
import { canRole } from '@/lib/rbac/ability';
import { isTenantAdminRole, ROLE_LABEL } from '@/lib/rbac/roles';
import { PresenceControl } from '@/components/layout/presence-control';
import { ShiftBanner } from '@/components/layout/shift-banner';
import { NotificationBell } from '@/components/layout/notification-bell';
import { IdleSessionGuard } from '@/components/layout/idle-session-guard';
import { BrandWelcome } from '@/components/brand/brand-welcome';
import { NovaWordmark, BrandMark } from '@/components/brand/nova-mark';
import { NAV_PINS_COOKIE, parseNavPins, serializeNavPins, type NavPin } from '@/lib/nav/pins';
import type { QueueCounts } from '@/lib/tickets/queue-counts-types';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { cn } from '@/lib/utils';

const SIDEBAR_RAIL_COOKIE = 'novacrm_sidebar_rail';
const NAV_COLLAPSE_COOKIE = 'novacrm_nav_collapse';
const NAV_FOLDERS_COOKIE = 'novacrm_nav_folders';

type NavKey = keyof Dictionary['nav'];
type NavItem = { href: string; labelKey: NavKey; icon: typeof Ticket; action?: Actions; subject?: Subjects };
type ProcessItem = {
  href: string;
  type: string | null;
  labelKey: NavKey;
  icon: typeof Ticket;
  badgeKey?: keyof QueueCounts;
};
type SectionId = 'overview' | 'serviceDesk' | 'configuration' | 'platform' | 'favorites';
type FolderId = 'people' | 'inventory';

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1] ?? '') : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

function readRailPreference() {
  return readCookie(SIDEBAR_RAIL_COOKIE) === '1';
}

function readCollapsedSections(): Partial<Record<SectionId, boolean>> {
  try {
    const raw = readCookie(NAV_COLLAPSE_COOKIE);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Record<SectionId, boolean>>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function readCollapsedFolders(): Partial<Record<FolderId, boolean>> {
  try {
    const raw = readCookie(NAV_FOLDERS_COOKIE);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Record<FolderId, boolean>>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function formatBadge(count: number) {
  if (count <= 0) return null;
  return count > 99 ? '99+' : String(count);
}

const overviewItems: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, action: 'read', subject: 'Ticket' },
  { href: '/wfm', labelKey: 'wfm', icon: CalendarClock, action: 'read', subject: 'Wfm' },
  { href: '/reports', labelKey: 'reports', icon: BarChart3, action: 'read', subject: 'Ticket' },
  { href: '/insights', labelKey: 'insights', icon: Lightbulb, action: 'read', subject: 'Ticket' },
  { href: '/audit', labelKey: 'audit', icon: History, action: 'read', subject: 'Ticket' },
];

const processItems: ProcessItem[] = [
  { href: '/tickets?type=incident', type: 'incident', labelKey: 'incidents', icon: AlertTriangle, badgeKey: 'incident' },
  { href: '/tickets?type=problem', type: 'problem', labelKey: 'problems', icon: Bug, badgeKey: 'problem' },
  { href: '/tickets?type=change', type: 'change', labelKey: 'changes', icon: GitBranch, badgeKey: 'change' },
  { href: '/cab', type: 'cab', labelKey: 'cab', icon: ShieldCheck, badgeKey: 'cab' },
  { href: '/tickets?type=request', type: 'request', labelKey: 'requests', icon: ClipboardList, badgeKey: 'request' },
  { href: '/tickets', type: null, labelKey: 'allTickets', icon: Ticket, badgeKey: 'all' },
];

const peopleItems: NavItem[] = [
  { href: '/accounts', labelKey: 'accounts', icon: Building2, action: 'update', subject: 'Account' },
  { href: '/org', labelKey: 'organization', icon: Users, action: 'update', subject: 'Org' },
  { href: '/users', labelKey: 'users', icon: UserCog, action: 'read', subject: 'User' },
];

const inventoryItems: NavItem[] = [
  { href: '/assets', labelKey: 'assets', icon: Package, action: 'read', subject: 'Asset' },
  { href: '/cmdb', labelKey: 'cmdb', icon: LayoutGrid, action: 'read', subject: 'Cmdb' },
  { href: '/import', labelKey: 'import', icon: Upload, action: 'create', subject: 'Import' },
];

const configurationFlatItems: NavItem[] = [
  { href: '/sla', labelKey: 'sla', icon: Clock, action: 'update', subject: 'Sla' },
];

const configurationItems: NavItem[] = [...peopleItems, ...configurationFlatItems, ...inventoryItems];

const platformItems: NavItem[] = [
  { href: '/tenants', labelKey: 'tenants', icon: Building, action: 'read', subject: 'Tenant' },
  { href: '/catalog', labelKey: 'catalog', icon: BookOpen, action: 'update', subject: 'Catalog' },
  { href: '/knowledge', labelKey: 'knowledge', icon: BookMarked, action: 'read', subject: 'Knowledge' },
  { href: '/workflows', labelKey: 'automation', icon: Workflow, action: 'read', subject: 'Workflow' },
  { href: '/governance', labelKey: 'governance', icon: Scale, action: 'update', subject: 'Governance' },
];

const pinCatalog: NavItem[] = [
  ...overviewItems,
  ...processItems.map((item) => ({ href: item.href, labelKey: item.labelKey, icon: item.icon })),
  ...configurationItems,
  ...platformItems,
];

function resolvePinIcon(href: string) {
  return pinCatalog.find((item) => item.href === href)?.icon ?? Ticket;
}

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
  rail = false,
  badge,
  pinned,
  onPinToggle,
  pinLabel,
  unpinLabel,
}: {
  href: string;
  label: string;
  icon: typeof Ticket;
  active: boolean;
  onNavigate?: () => void;
  rail?: boolean;
  badge?: number | null;
  pinned?: boolean;
  onPinToggle?: () => void;
  pinLabel?: string;
  unpinLabel?: string;
}) {
  const badgeText = badge != null ? formatBadge(badge) : null;

  return (
    <div className="group relative flex items-center">
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        title={rail ? (badgeText ? `${label} (${badgeText})` : label) : undefined}
        className={cn(
          'relative flex h-8 min-w-0 flex-1 items-center rounded-md text-[13px] leading-none outline-none transition-[color,background-color] duration-200 ease-out',
          'focus-visible:ring-1 focus-visible:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]',
          rail ? 'justify-center px-0' : 'gap-2 px-2',
          !rail && onPinToggle ? (badgeText ? 'pr-14' : 'pr-7') : null,
          active
            ? 'bg-zinc-800/70 font-medium text-zinc-50'
            : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-100',
        )}
      >
        {!rail ? (
          <span
            className={cn(
              'nova-accent-bar absolute inset-y-1.5 left-0 w-[2px] rounded-full transition-opacity duration-200',
              active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
            )}
          />
        ) : null}
        <Icon
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-colors duration-200',
            active ? 'nova-accent-icon' : 'text-zinc-500 group-hover:text-zinc-300',
          )}
        />
        {!rail ? <span className="min-w-0 flex-1 truncate">{label}</span> : <span className="sr-only">{label}</span>}
        {badgeText ? (
          <span
            className={cn(
              'shrink-0 font-mono tabular-nums',
              rail
                ? 'absolute right-0 top-0 min-w-[14px] rounded bg-blue-500 px-0.5 text-center text-[9px] font-semibold leading-[14px] text-white'
                : 'rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 ring-1 ring-zinc-700/80',
            )}
          >
            {badgeText}
          </span>
        ) : null}
      </Link>
      {!rail && onPinToggle ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onPinToggle();
          }}
          className={cn(
            'absolute right-0.5 top-1/2 z-10 -translate-y-1/2 rounded p-1 text-zinc-500 transition-[opacity,color,background-color] duration-150',
            'hover:bg-zinc-800 hover:text-zinc-200',
            'opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
            pinned && 'opacity-100 text-amber-400/90',
          )}
          title={pinned ? unpinLabel : pinLabel}
          aria-label={pinned ? unpinLabel : pinLabel}
        >
          {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
        </button>
      ) : null}
    </div>
  );
}

function NavSection({
  id,
  title,
  children,
  divided = false,
  collapsed,
  onToggle,
  rail = false,
}: {
  id: SectionId;
  title: string;
  children: ReactNode;
  divided?: boolean;
  collapsed?: boolean;
  onToggle?: (id: SectionId) => void;
  rail?: boolean;
}) {
  if (rail) {
    return (
      <div className={cn('px-1.5', divided && 'mt-2 border-t border-zinc-800/60 pt-2')}>
        <nav className="flex flex-col gap-0.5">{children}</nav>
      </div>
    );
  }

  return (
    <div className={cn('px-2', divided && 'mt-2.5 border-t border-zinc-800/60 pt-2.5')}>
      <button
        type="button"
        onClick={() => onToggle?.(id)}
        className="mb-1 flex w-full items-center gap-1 rounded-md px-2 py-0.5 text-left transition-colors hover:bg-zinc-900/60"
        aria-expanded={!collapsed}
      >
        <p className="min-w-0 flex-1 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600">{title}</p>
        <ChevronDown
          className={cn(
            'h-3 w-3 shrink-0 text-zinc-600 transition-transform duration-200 ease-out',
            collapsed && '-rotate-90',
          )}
        />
      </button>
      {!collapsed ? <nav className="flex flex-col gap-0.5">{children}</nav> : null}
    </div>
  );
}

function useQueueCounts(accountKey?: string | null) {
  const [counts, setCounts] = useState<QueueCounts | null>(null);

  const refresh = useCallback(() => {
    void fetch('/api/tickets/queue-counts')
      .then((res) => res.json())
      .then((json: { data?: QueueCounts | null }) => {
        if (json.data) setCounts(json.data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, accountKey]);

  useRealtimeTable('tickets', refresh);

  return counts;
}

function useNavPins() {
  const [pins, setPins] = useState<NavPin[]>([]);

  useEffect(() => {
    setPins(parseNavPins(readCookie(NAV_PINS_COOKIE)));
  }, []);

  const togglePin = useCallback((href: string, labelKey: string) => {
    setPins((prev) => {
      const exists = prev.some((item) => item.href === href);
      const next = exists
        ? prev.filter((item) => item.href !== href)
        : [...prev.filter((item) => item.href !== href), { href, labelKey }].slice(-12);
      writeCookie(NAV_PINS_COOKIE, serializeNavPins(next));
      return next;
    });
  }, []);

  const isPinned = useCallback((href: string) => pins.some((item) => item.href === href), [pins]);

  return { pins, togglePin, isPinned };
}

function ProcessNav({
  onNavigate,
  rail,
  collapsed,
  onToggle,
  pins,
  accountKey,
}: {
  onNavigate?: () => void;
  rail?: boolean;
  collapsed?: boolean;
  onToggle?: (id: SectionId) => void;
  pins: ReturnType<typeof useNavPins>;
  accountKey?: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const counts = useQueueCounts(accountKey);
  const activeType = searchParams.get('type');
  const onDesk = pathname === '/tickets';

  return (
    <NavSection
      id="serviceDesk"
      title={t.nav.serviceDesk}
      divided
      rail={rail}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      {processItems.map((item) => {
        const active =
          item.type === 'cab'
            ? pathname.startsWith('/cab')
            : onDesk && ((item.type === null && !activeType) || item.type === activeType);
        const badge = item.badgeKey && counts ? counts[item.badgeKey] : null;
        return (
          <div key={item.href} className={!rail && item.type === null ? 'mt-1 border-t border-zinc-800/60 pt-1' : undefined}>
            <NavLink
              href={item.href}
              label={t.nav[item.labelKey]}
              icon={item.icon}
              active={active}
              onNavigate={onNavigate}
              rail={rail}
              badge={badge}
              pinned={pins.isPinned(item.href)}
              onPinToggle={() => pins.togglePin(item.href, item.labelKey)}
              pinLabel={t.nav.pin}
              unpinLabel={t.nav.unpin}
            />
          </div>
        );
      })}
    </NavSection>
  );
}

function NestedFolder({
  id,
  title,
  items,
  pathname,
  role,
  onNavigate,
  rail,
  collapsed,
  onToggle,
  pins,
}: {
  id: FolderId;
  title: string;
  items: NavItem[];
  pathname: string;
  role: AppRole;
  onNavigate?: () => void;
  rail?: boolean;
  collapsed: boolean;
  onToggle: (id: FolderId) => void;
  pins: ReturnType<typeof useNavPins>;
}) {
  const { t } = useI18n();
  const visible = items.filter((item) => !item.subject || canRole(role, item.action ?? 'read', item.subject));
  if (visible.length === 0) return null;

  const childActive = visible.some((item) => isPathActive(pathname, item.href));
  const effectivelyCollapsed = collapsed && !childActive;
  const FolderIcon = effectivelyCollapsed ? Folder : FolderOpen;

  if (rail) {
    return (
      <>
        {visible.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={t.nav[item.labelKey]}
            icon={item.icon}
            active={isPathActive(pathname, item.href)}
            onNavigate={onNavigate}
            rail
          />
        ))}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className={cn(
          'flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors duration-200',
          childActive ? 'text-zinc-200' : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-100',
        )}
        aria-expanded={!effectivelyCollapsed}
      >
        <FolderIcon className={cn('h-3.5 w-3.5 shrink-0', childActive ? 'nova-accent-icon' : 'text-zinc-500')} />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 shrink-0 text-zinc-600 transition-transform duration-200 ease-out',
            effectivelyCollapsed && '-rotate-90',
          )}
        />
      </button>
      {!effectivelyCollapsed ? (
        <div className="ml-2.5 flex flex-col gap-0.5 border-l border-zinc-800/70 pl-1.5">
          {visible.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={t.nav[item.labelKey]}
              icon={item.icon}
              active={isPathActive(pathname, item.href)}
              onNavigate={onNavigate}
              pinned={pins.isPinned(item.href)}
              onPinToggle={() => pins.togglePin(item.href, item.labelKey)}
              pinLabel={t.nav.pin}
              unpinLabel={t.nav.unpin}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ConfigurationNav({
  pathname,
  role,
  onNavigate,
  rail,
  collapsed,
  onToggle,
  folderCollapsed,
  onToggleFolder,
  pins,
}: {
  pathname: string;
  role: AppRole;
  onNavigate?: () => void;
  rail?: boolean;
  collapsed?: boolean;
  onToggle?: (id: SectionId) => void;
  folderCollapsed: Partial<Record<FolderId, boolean>>;
  onToggleFolder: (id: FolderId) => void;
  pins: ReturnType<typeof useNavPins>;
}) {
  const { t } = useI18n();
  const hasPeople = peopleItems.some((item) => !item.subject || canRole(role, item.action ?? 'read', item.subject));
  const hasInventory = inventoryItems.some(
    (item) => !item.subject || canRole(role, item.action ?? 'read', item.subject),
  );
  const flatVisible = configurationFlatItems.filter(
    (item) => !item.subject || canRole(role, item.action ?? 'read', item.subject),
  );
  if (!hasPeople && !hasInventory && flatVisible.length === 0) return null;

  return (
    <NavSection
      id="configuration"
      title={t.nav.configuration}
      divided
      rail={rail}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <NestedFolder
        id="people"
        title={t.nav.people}
        items={peopleItems}
        pathname={pathname}
        role={role}
        onNavigate={onNavigate}
        rail={rail}
        collapsed={Boolean(folderCollapsed.people)}
        onToggle={onToggleFolder}
        pins={pins}
      />
      {flatVisible.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={t.nav[item.labelKey]}
          icon={item.icon}
          active={isPathActive(pathname, item.href)}
          onNavigate={onNavigate}
          rail={rail}
          pinned={pins.isPinned(item.href)}
          onPinToggle={() => pins.togglePin(item.href, item.labelKey)}
          pinLabel={t.nav.pin}
          unpinLabel={t.nav.unpin}
        />
      ))}
      <NestedFolder
        id="inventory"
        title={t.nav.inventory}
        items={inventoryItems}
        pathname={pathname}
        role={role}
        onNavigate={onNavigate}
        rail={rail}
        collapsed={Boolean(folderCollapsed.inventory)}
        onToggle={onToggleFolder}
        pins={pins}
      />
    </NavSection>
  );
}

function FavoritesNav({
  pins,
  onNavigate,
  rail,
  collapsed,
  onToggle,
}: {
  pins: ReturnType<typeof useNavPins>;
  onNavigate?: () => void;
  rail?: boolean;
  collapsed?: boolean;
  onToggle?: (id: SectionId) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  if (pins.pins.length === 0) return null;

  return (
    <NavSection
      id="favorites"
      title={t.nav.favorites}
      divided={false}
      rail={rail}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      {pins.pins.map((pin) => {
        const Icon = resolvePinIcon(pin.href);
        const labelKey = pin.labelKey as NavKey;
        const label = (t.nav[labelKey] as string | undefined) ?? pin.labelKey;
        const [path, query] = pin.href.split('?');
        const pinType = query ? new URLSearchParams(query).get('type') : null;
        const active =
          path === '/tickets'
            ? pathname === '/tickets' &&
              ((pinType === null && !searchParams.get('type')) || searchParams.get('type') === pinType)
            : isPathActive(pathname, pin.href);
        return (
          <NavLink
            key={pin.href}
            href={pin.href}
            label={label}
            icon={Icon}
            active={active}
            onNavigate={onNavigate}
            rail={rail}
            pinned
            onPinToggle={() => pins.togglePin(pin.href, pin.labelKey)}
            pinLabel={t.nav.pin}
            unpinLabel={t.nav.unpin}
          />
        );
      })}
    </NavSection>
  );
}

function ItemSection({
  id,
  title,
  items,
  pathname,
  role,
  onNavigate,
  divided = true,
  rail = false,
  collapsed,
  onToggle,
  pins,
}: {
  id: SectionId;
  title: string;
  items: NavItem[];
  pathname: string;
  role: AppRole;
  onNavigate?: () => void;
  divided?: boolean;
  rail?: boolean;
  collapsed?: boolean;
  onToggle?: (id: SectionId) => void;
  pins?: ReturnType<typeof useNavPins>;
}) {
  const { t } = useI18n();
  const visible = items.filter((item) => !item.subject || canRole(role, item.action ?? 'read', item.subject));
  if (visible.length === 0) return null;

  return (
    <NavSection id={id} title={title} divided={divided} rail={rail} collapsed={collapsed} onToggle={onToggle}>
      {visible.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={t.nav[item.labelKey]}
          icon={item.icon}
          active={isPathActive(pathname, item.href)}
          onNavigate={onNavigate}
          rail={rail}
          pinned={pins?.isPinned(item.href)}
          onPinToggle={pins ? () => pins.togglePin(item.href, item.labelKey) : undefined}
          pinLabel={t.nav.pin}
          unpinLabel={t.nav.unpin}
        />
      ))}
    </NavSection>
  );
}

function SidebarBrand({
  onClose,
  logoUrl,
  rail,
  onToggleRail,
}: {
  onClose?: () => void;
  logoUrl?: string | null;
  rail?: boolean;
  onToggleRail?: () => void;
}) {
  const { t } = useI18n();
  if (rail) {
    return (
      <div className="flex h-12 shrink-0 flex-col items-center justify-center gap-1 px-1.5">
        <Link href="/dashboard" className="inline-flex" title={t.brand.name}>
          <BrandMark size={26} logoUrl={logoUrl} logoAlt={t.brand.name} />
        </Link>
        {onToggleRail ? (
          <button
            type="button"
            onClick={onToggleRail}
            className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800/80 hover:text-zinc-50"
            aria-label={t.common.expandSidebar}
            title={t.common.expandSidebar}
          >
            <PanelLeftOpen className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-3">
      <NovaWordmark
        subtitle={t.brand.operations}
        size={26}
        className="min-w-0 gap-2"
        logoUrl={logoUrl}
        logoAlt={t.brand.name}
      />
      <div className="flex items-center gap-0.5">
        {onToggleRail ? (
          <button
            type="button"
            onClick={onToggleRail}
            className="hidden rounded-md p-1.5 text-zinc-500 transition-colors duration-200 ease-out hover:bg-zinc-800/80 hover:text-zinc-50 md:inline-flex"
            aria-label={t.common.collapseSidebar}
            title={t.common.collapseSidebar}
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 transition-colors duration-200 ease-out hover:bg-zinc-800/80 hover:text-zinc-50"
            aria-label={t.common.closeMenu}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function NewTicketButton({ onNavigate, rail }: { onNavigate?: () => void; rail?: boolean }) {
  const { t } = useI18n();
  if (rail) {
    return (
      <div className="px-1.5 pb-2">
        <Link
          href="/tickets/new"
          onClick={onNavigate}
          title={t.common.newTicket}
          className="nova-accent-btn flex h-8 w-full items-center justify-center rounded-md text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-200 ease-out hover:-translate-y-px"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="sr-only">{t.common.newTicket}</span>
        </Link>
      </div>
    );
  }
  return (
    <div className="px-3 pb-3">
      <Link
        href="/tickets/new"
        onClick={onNavigate}
        className="nova-accent-btn group flex h-8 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-200 ease-out hover:-translate-y-px"
      >
        <Plus className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
        {t.common.newTicket}
        <kbd className="ml-0.5 hidden rounded border border-white/15 bg-black/10 px-1 font-mono text-[10px] text-white/70 lg:inline">
          ⌘N
        </kbd>
      </Link>
    </div>
  );
}

function SidebarNav({
  pathname,
  role,
  onNavigate,
  rail,
  collapsed,
  onToggleSection,
  folderCollapsed,
  onToggleFolder,
  pins,
  accountKey,
}: {
  pathname: string;
  role: AppRole;
  onNavigate?: () => void;
  rail?: boolean;
  collapsed: Partial<Record<SectionId, boolean>>;
  onToggleSection: (id: SectionId) => void;
  folderCollapsed: Partial<Record<FolderId, boolean>>;
  onToggleFolder: (id: FolderId) => void;
  pins: ReturnType<typeof useNavPins>;
  accountKey?: string | null;
}) {
  const { t } = useI18n();
  return (
    <div className="relative min-h-0 flex-1">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3 bg-gradient-to-b from-zinc-950 to-transparent" />
      <div className="nova-scroll-thin h-full overflow-y-auto pb-3 pt-1">
        <Suspense fallback={null}>
          <FavoritesNav
            pins={pins}
            onNavigate={onNavigate}
            rail={rail}
            collapsed={collapsed.favorites}
            onToggle={onToggleSection}
          />
        </Suspense>
        <ItemSection
          id="overview"
          title={t.nav.overview}
          items={overviewItems}
          pathname={pathname}
          role={role}
          onNavigate={onNavigate}
          divided={pins.pins.length > 0}
          rail={rail}
          collapsed={collapsed.overview}
          onToggle={onToggleSection}
          pins={pins}
        />
        <Suspense fallback={null}>
          <ProcessNav
            onNavigate={onNavigate}
            rail={rail}
            collapsed={collapsed.serviceDesk}
            onToggle={onToggleSection}
            pins={pins}
            accountKey={accountKey}
          />
        </Suspense>
        <ConfigurationNav
          pathname={pathname}
          role={role}
          onNavigate={onNavigate}
          rail={rail}
          collapsed={collapsed.configuration}
          onToggle={onToggleSection}
          folderCollapsed={folderCollapsed}
          onToggleFolder={onToggleFolder}
          pins={pins}
        />
        <ItemSection
          id="platform"
          title={t.nav.platform}
          items={platformItems}
          pathname={pathname}
          role={role}
          onNavigate={onNavigate}
          rail={rail}
          collapsed={collapsed.platform}
          onToggle={onToggleSection}
          pins={pins}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-gradient-to-t from-zinc-950 to-transparent" />
    </div>
  );
}

function SidebarFooter({
  fullName,
  role,
  pathname,
  onNavigate,
  onSignOut,
  rail = false,
}: {
  fullName: string;
  role: AppRole;
  pathname: string;
  onNavigate?: () => void;
  onSignOut: () => void | Promise<void>;
  rail?: boolean;
}) {
  const { t } = useI18n();
  const appearanceActive = pathname === '/settings/appearance';
  const securityActive = pathname.startsWith('/settings/security');
  const usageActive = pathname.startsWith('/settings/usage');
  const notificationsActive = pathname.startsWith('/settings/notifications');
  const reportScheduleActive = pathname.startsWith('/settings/reports');
  const integrationsActive =
    pathname.startsWith('/settings') &&
    !appearanceActive &&
    !securityActive &&
    !usageActive &&
    !notificationsActive &&
    !reportScheduleActive;
  const roleLabel = t.roles[role] ?? ROLE_LABEL[role] ?? role;

  const settings = (
    <>
      <NavLink
        href="/settings/appearance"
        label={t.nav.appearance}
        icon={Palette}
        active={appearanceActive}
        onNavigate={onNavigate}
        rail={rail}
      />
      <NavLink
        href="/settings/security"
        label={t.nav.security}
        icon={ShieldCheck}
        active={securityActive}
        onNavigate={onNavigate}
        rail={rail}
      />
      <NavLink
        href="/settings/usage"
        label={t.nav.usage}
        icon={Gauge}
        active={usageActive}
        onNavigate={onNavigate}
        rail={rail}
      />
      {isTenantAdminRole(role) ? (
        <>
          <NavLink
            href="/settings"
            label={t.nav.integrations}
            icon={Settings}
            active={integrationsActive}
            onNavigate={onNavigate}
            rail={rail}
          />
          <NavLink
            href="/settings/notifications"
            label={t.nav.notifications}
            icon={Mail}
            active={notificationsActive}
            onNavigate={onNavigate}
            rail={rail}
          />
          <NavLink
            href="/settings/reports"
            label={t.nav.reportSchedule}
            icon={BarChart3}
            active={reportScheduleActive}
            onNavigate={onNavigate}
            rail={rail}
          />
        </>
      ) : null}
    </>
  );

  if (rail) {
    return (
      <div className="shrink-0 border-t border-zinc-800/60 px-1.5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <nav className="mb-1.5 flex flex-col gap-0.5">{settings}</nav>
        <div className="flex flex-col items-center gap-1">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 font-mono text-[10px] text-zinc-300"
            title={`${fullName} · ${roleLabel}`}
          >
            {initials(fullName)}
          </div>
          <form action={onSignOut}>
            <button
              type="submit"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-50"
              aria-label={t.common.signOut}
              title={t.common.signOut}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-zinc-800/60 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <nav className="mb-1.5 flex flex-col gap-0.5">{settings}</nav>
      <div className="space-y-1.5 rounded-lg border border-zinc-800/70 bg-zinc-900/50 p-1.5">
        <div className="flex items-center gap-2 px-1 py-0.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 font-mono text-[10px] text-zinc-300">
            {initials(fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] leading-4 text-zinc-50">{fullName}</p>
            <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-500">{roleLabel}</p>
          </div>
          <form action={onSignOut}>
            <button
              type="submit"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors duration-200 ease-out hover:bg-zinc-800 hover:text-zinc-50"
              aria-label={t.common.signOut}
              title={t.common.signOut}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
        {canRole(role, 'update', 'Wfm') ? <PresenceControl /> : null}
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
  logoUrl,
  rail = false,
  onToggleRail,
  collapsed,
  onToggleSection,
  folderCollapsed,
  onToggleFolder,
  pins,
}: {
  role: AppRole;
  fullName: string;
  accounts: AccountRecord[];
  activeAccountId?: string | null;
  pathname: string;
  onNavigate?: () => void;
  onSignOut: () => void | Promise<void>;
  onClose?: () => void;
  logoUrl?: string | null;
  rail?: boolean;
  onToggleRail?: () => void;
  collapsed: Partial<Record<SectionId, boolean>>;
  onToggleSection: (id: SectionId) => void;
  folderCollapsed: Partial<Record<FolderId, boolean>>;
  onToggleFolder: (id: FolderId) => void;
  pins: ReturnType<typeof useNavPins>;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-zinc-800/60">
        <SidebarBrand onClose={onClose} logoUrl={logoUrl} rail={rail} onToggleRail={onToggleRail} />
        {!rail ? <AccountSwitcher accounts={accounts} activeAccountId={activeAccountId} /> : null}
        <NewTicketButton onNavigate={onNavigate} rail={rail} />
      </div>
      <SidebarNav
        pathname={pathname}
        role={role}
        onNavigate={onNavigate}
        rail={rail}
        collapsed={collapsed}
        onToggleSection={onToggleSection}
        folderCollapsed={folderCollapsed}
        onToggleFolder={onToggleFolder}
        pins={pins}
        accountKey={activeAccountId ?? 'all'}
      />
      <SidebarFooter
        fullName={fullName}
        role={role}
        pathname={pathname}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        rail={rail}
      />
    </div>
  );
}

function TopbarIconButton({
  onClick,
  label,
  children,
  className,
}: {
  onClick?: () => void;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-zinc-400 transition-colors duration-200 ease-out',
        'hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AgentShell({
  children,
  role,
  fullName,
  userId,
  accounts,
  activeAccountId,
  idleTimeoutMinutes = 30,
  logoUrl,
}: {
  children: ReactNode;
  role: AppRole;
  fullName: string;
  userId?: string;
  accounts: AccountRecord[];
  activeAccountId?: string | null;
  idleTimeoutMinutes?: number;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [rail, setRail] = useState(false);
  const [collapsed, setCollapsed] = useState<Partial<Record<SectionId, boolean>>>({});
  const [folderCollapsed, setFolderCollapsed] = useState<Partial<Record<FolderId, boolean>>>({});
  const pins = useNavPins();
  const onAssistant = pathname.startsWith('/assistant');
  const activeAccount = accounts.find((account) => account.id === activeAccountId);

  useEffect(() => {
    setRail(readRailPreference());
    setCollapsed(readCollapsedSections());
    setFolderCollapsed(readCollapsedFolders());
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    if (pathname.startsWith('/assistant')) setAgentOpen(false);
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
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setRail((prev) => {
          const next = !prev;
          writeCookie(SIDEBAR_RAIL_COOKIE, next ? '1' : '0');
          return next;
        });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  function toggleRail() {
    setRail((prev) => {
      const next = !prev;
      writeCookie(SIDEBAR_RAIL_COOKIE, next ? '1' : '0');
      return next;
    });
  }

  function toggleSection(id: SectionId) {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      writeCookie(NAV_COLLAPSE_COOKIE, JSON.stringify(next));
      return next;
    });
  }

  function toggleFolder(id: FolderId) {
    setFolderCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      writeCookie(NAV_FOLDERS_COOKIE, JSON.stringify(next));
      return next;
    });
  }

  const sidebarProps = {
    role,
    fullName,
    accounts,
    activeAccountId,
    pathname,
    onSignOut: signOutAction,
    logoUrl,
    collapsed,
    onToggleSection: toggleSection,
    folderCollapsed,
    onToggleFolder: toggleFolder,
    pins,
  };

  const desktopWidth = rail ? 'w-14' : 'w-[15.5rem]';
  const desktopPad = rail ? 'md:pl-14' : 'md:pl-[15.5rem]';

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-zinc-800/80 bg-zinc-950 transition-[width] duration-200 ease-out md:flex',
          desktopWidth,
        )}
      >
        <SidebarPanel {...sidebarProps} rail={rail} onToggleRail={toggleRail} />
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <div key="mobile-shell" className="fixed inset-0 z-50 md:hidden">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
              aria-label={t.common.closeMenu}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -24, opacity: 0.96 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative flex h-full w-[min(16rem,88vw)] flex-col border-r border-zinc-800 bg-zinc-950 pt-safe shadow-2xl shadow-black/50"
            >
              <SidebarPanel
                {...sidebarProps}
                rail={false}
                onNavigate={() => setMobileOpen(false)}
                onClose={() => setMobileOpen(false)}
              />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      <div
        className={cn(
          'transition-[padding] duration-200 ease-out',
          desktopPad,
          agentOpen && 'md:pr-[400px]',
        )}
      >
        <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 pt-safe backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/70">
          <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-3 md:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <TopbarIconButton
                className="border-zinc-800 md:hidden"
                label={t.common.openMenu}
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </TopbarIconButton>

              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className={cn(
                  'group flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-zinc-800/90 bg-zinc-900/40 px-2.5 text-left text-[13px] text-zinc-500',
                  'transition-colors duration-200 ease-out hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-300',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]',
                  'max-w-xl',
                )}
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-zinc-500 group-hover:text-zinc-300" />
                <span className="truncate">{t.common.search}</span>
                <kbd className="ml-auto hidden rounded border border-zinc-800 bg-zinc-950/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 sm:inline">
                  ⌘K
                </kbd>
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <PreferenceControls compact />
              <NotificationBell userId={userId} />
              {onAssistant ? null : <AskAiButton onClick={() => setAgentOpen(true)} />}
            </div>

            <div className="hidden h-4 w-px shrink-0 bg-zinc-800 lg:block" aria-hidden />

            <div className="hidden shrink-0 items-center gap-1 lg:flex">
              <Link
                href="/select-account?change=1"
                className={cn(
                  'inline-flex h-8 max-w-[12rem] items-center gap-1.5 truncate rounded-md border border-zinc-800/80 px-2 text-[12px] text-zinc-400',
                  'transition-colors duration-200 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100',
                )}
                title={t.accountPick.change}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                <span className="truncate">
                  {activeAccount
                    ? activeAccount.code
                      ? `${activeAccount.code} · ${activeAccount.name}`
                      : activeAccount.name
                    : t.accountPick.allAccounts}
                </span>
              </Link>

              <Link
                href="/tickets/new"
                className={cn(
                  'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-800 px-2.5 text-[13px] text-zinc-300',
                  'transition-colors duration-200 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-50',
                )}
                aria-label={t.common.newTicket}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t.common.new}</span>
                <kbd className="hidden font-mono text-[10px] text-zinc-600 xl:inline">⌘N</kbd>
              </Link>
            </div>

            <Link
              href="/tickets/new"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-50 lg:hidden"
              aria-label={t.common.newTicket}
            >
              <Plus className="h-3.5 w-3.5" />
            </Link>

            <form action={signOutAction} className="md:hidden">
              <button
                type="submit"
                aria-label={t.common.signOut}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-400',
                  'transition-colors duration-200 ease-out hover:bg-zinc-900 hover:text-zinc-100',
                )}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative min-h-[calc(100dvh-3rem)]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--accent)_8%,transparent),transparent_70%)]" aria-hidden />
          <div className="relative mx-auto w-full max-w-[1600px]">
            {canRole(role, 'read', 'Wfm') ? <ShiftBanner /> : null}
            {children}
          </div>
        </motion.main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} role={role} />
      <AssistantWidget
        firstName={fullName.split(' ')[0] || fullName}
        open={agentOpen}
        onOpenChange={setAgentOpen}
        hidden={onAssistant}
      />
      <IdleSessionGuard minutes={idleTimeoutMinutes} />
      <BrandWelcome variant="desk" />
    </div>
  );
}
