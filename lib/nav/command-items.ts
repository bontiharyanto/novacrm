import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BarChart3,
  BookMarked,
  BookOpen,
  BriefcaseBusiness,
  Bug,
  Building,
  Building2,
  CalendarClock,
  ClipboardList,
  Clock,
  GitBranch,
  History,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Lightbulb,
  Mail,
  Package,
  Palette,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  Upload,
  UserCog,
  Users,
  Workflow,
} from 'lucide-react';
import type { Dictionary } from '@/lib/i18n';
import { canAccessConfig, canRole, type AppRole } from '@/lib/rbac/ability';
import { isTenantAdminRole } from '@/lib/rbac/roles';
import { WFM_SIDEBAR_LABEL_KEYS, wfmNavTabsForRole } from '@/lib/wfm/nav-config';
import { showsDeliveryNav } from '@/lib/nav/delivery-nav';

type NavLabelKey = keyof Dictionary['nav'];

export type CommandNavGroupId =
  | 'operations'
  | 'serviceDesk'
  | 'inventory'
  | 'analytics'
  | 'administration'
  | 'platform'
  | 'settings';

export type CommandNavItem = {
  href: string;
  labelKey: NavLabelKey;
  icon: LucideIcon;
  /** Static label when not in nav dictionary (e.g. "New ticket") */
  label?: string;
  visible?: (role: AppRole) => boolean;
};

export type CommandNavGroup = {
  id: CommandNavGroupId;
  labelKey: NavLabelKey;
  items: CommandNavItem[];
};

function wfmCommandItems(role: AppRole): CommandNavItem[] {
  const canManageWfm = canRole(role, 'create', 'Wfm');
  return wfmNavTabsForRole(canManageWfm).map((tab) => ({
    href: tab.href,
    labelKey: WFM_SIDEBAR_LABEL_KEYS[tab.key] as NavLabelKey,
    icon: CalendarClock,
    visible: (r) => canRole(r, 'read', 'Wfm'),
  }));
}

export function commandNavGroupsForRole(role: AppRole): CommandNavGroup[] {
  const groups: CommandNavGroup[] = [
    {
      id: 'operations',
      labelKey: 'operations',
      items: [
        { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, visible: (r) => canRole(r, 'read', 'OperationsDashboard') },
        {
          href: '/delivery/dashboard',
          labelKey: 'delivery',
          icon: BriefcaseBusiness,
          visible: (r) => showsDeliveryNav(r) && canRole(r, 'read', 'DeliveryProject'),
        },
        {
          href: '/delivery/reports',
          labelKey: 'deliveryReports',
          icon: BarChart3,
          visible: (r) => showsDeliveryNav(r) && canRole(r, 'read', 'DeliveryReport'),
        },
        { href: '/knowledge', labelKey: 'knowledge', icon: BookMarked, visible: (r) => canRole(r, 'read', 'Knowledge') },
        ...wfmCommandItems(role),
      ],
    },
    {
      id: 'serviceDesk',
      labelKey: 'serviceDesk',
      items: [
        { href: '/tickets?queue=mine', labelKey: 'myTickets', icon: Inbox },
        { href: '/tickets?type=incident', labelKey: 'incidents', icon: AlertTriangle },
        { href: '/tickets?type=problem', labelKey: 'problems', icon: Bug },
        { href: '/tickets?type=change', labelKey: 'changes', icon: GitBranch },
        { href: '/cab', labelKey: 'cab', icon: ShieldCheck, visible: (r) => canRole(r, 'read', 'OperationsCab') },
        { href: '/tickets?type=request', labelKey: 'requests', icon: ClipboardList },
        { href: '/tickets', labelKey: 'allTickets', icon: Ticket },
        { href: '/tickets/new', labelKey: 'allTickets', icon: Ticket, label: 'newTicket' },
      ],
    },
    {
      id: 'inventory',
      labelKey: 'inventory',
      items: [
        { href: '/assets', labelKey: 'assets', icon: Package, visible: (r) => canRole(r, 'read', 'Asset') },
        { href: '/assets/new', labelKey: 'assets', icon: Package, label: 'newAsset' },
        { href: '/cmdb', labelKey: 'cmdb', icon: LayoutGrid, visible: (r) => canRole(r, 'read', 'Cmdb') },
        { href: '/cmdb/new', labelKey: 'cmdb', icon: LayoutGrid, label: 'newCi' },
      ],
    },
    {
      id: 'analytics',
      labelKey: 'analytics',
      items: [
        { href: '/reports', labelKey: 'reports', icon: BarChart3, visible: (r) => canRole(r, 'read', 'OperationsReports') },
        { href: '/insights', labelKey: 'insights', icon: Lightbulb, visible: (r) => canRole(r, 'read', 'OperationsInsights') },
        { href: '/audit', labelKey: 'audit', icon: History, visible: (r) => canRole(r, 'read', 'OperationsAudit') },
        { href: '/assistant', labelKey: 'assistant', icon: Sparkles },
      ],
    },
    {
      id: 'administration',
      labelKey: 'administration',
      items: [
        { href: '/accounts', labelKey: 'accounts', icon: Building2, visible: (r) => canAccessConfig(r, 'accounts') },
        { href: '/org', labelKey: 'organization', icon: Users, visible: (r) => canAccessConfig(r, 'org') },
        { href: '/users', labelKey: 'users', icon: UserCog, visible: (r) => canAccessConfig(r, 'users') },
        { href: '/sla', labelKey: 'sla', icon: Clock, visible: (r) => canAccessConfig(r, 'sla') },
        { href: '/sla/uc/new', labelKey: 'sla', icon: Clock, label: 'newUc', visible: (r) => canRole(r, 'create', 'Sla') },
        { href: '/catalog', labelKey: 'catalog', icon: BookOpen, visible: (r) => canAccessConfig(r, 'catalog') },
        { href: '/catalog/new', labelKey: 'catalog', icon: BookOpen, label: 'newCatalog', visible: (r) => canAccessConfig(r, 'catalog') },
        { href: '/workflows', labelKey: 'automation', icon: Workflow, visible: (r) => canRole(r, 'read', 'Workflow') },
        { href: '/workflows/new', labelKey: 'automation', icon: Workflow, label: 'newFlow', visible: (r) => canRole(r, 'read', 'Workflow') },
        { href: '/governance', labelKey: 'governance', icon: Scale, visible: (r) => canAccessConfig(r, 'governance') },
        { href: '/governance/requests', labelKey: 'governance', icon: Scale, label: 'dsar', visible: (r) => canAccessConfig(r, 'governance') },
        { href: '/import', labelKey: 'import', icon: Upload, visible: (r) => canRole(r, 'create', 'Import') },
      ],
    },
    {
      id: 'platform',
      labelKey: 'platform',
      items: [
        { href: '/tenants', labelKey: 'tenants', icon: Building, visible: (r) => canRole(r, 'read', 'Tenant') },
        { href: '/tenants/new', labelKey: 'tenants', icon: Building, label: 'newTenant', visible: (r) => canRole(r, 'create', 'Tenant') },
        { href: '/settings/capabilities', labelKey: 'capabilities', icon: ShieldCheck, visible: (r) => canRole(r, 'update', 'Capability') },
      ],
    },
    {
      id: 'settings',
      labelKey: 'tenantSettings',
      items: [
        { href: '/settings/security', labelKey: 'security', icon: ShieldCheck },
        { href: '/settings/appearance', labelKey: 'appearance', icon: Palette },
        { href: '/settings', labelKey: 'integrations', icon: Settings, visible: (r) => isTenantAdminRole(r) },
        { href: '/settings/notifications', labelKey: 'notifications', icon: Mail, visible: (r) => isTenantAdminRole(r) },
        { href: '/settings/reports', labelKey: 'reportSchedule', icon: BarChart3, visible: (r) => isTenantAdminRole(r) },
      ],
    },
  ];

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.visible || item.visible(role)),
    }))
    .filter((group) => group.items.length > 0);
}

export function resolveCommandItemLabel(
  item: CommandNavItem,
  t: Dictionary,
): string {
  if (item.label === 'newTicket') return t.common.newTicket;
  if (item.label === 'newAsset') return t.command.newAsset;
  if (item.label === 'newCi') return t.command.newCi;
  if (item.label === 'newCatalog') return t.command.newCatalog;
  if (item.label === 'newFlow') return t.command.newFlow;
  if (item.label === 'dsar') return t.command.dsar;
  if (item.label === 'newUc') return t.command.newUc;
  if (item.label === 'newTenant') return t.command.newTenant;
  return t.nav[item.labelKey];
}
