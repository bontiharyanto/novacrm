'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';
import { useI18n } from '@/components/layout/preferences-provider';
import { localizedRole, localizedRoleHint } from '@/lib/i18n/labels';
import type { AppRole } from '@/lib/rbac/roles';
import { cn } from '@/lib/utils';

const roleTone: Record<AppRole, BadgeTone> = {
  customer: 'neutral',
  agent: 'info',
  team_lead: 'info',
  supervisor: 'warning',
  pm_delivery: 'warning',
  dco: 'warning',
  manager: 'success',
  admin: 'neutral',
  superadmin: 'danger',
};

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

export function SidebarUserCard({
  fullName,
  role,
  tenantName,
  rail = false,
  onSignOut,
}: {
  fullName: string;
  role: AppRole;
  tenantName?: string | null;
  rail?: boolean;
  onSignOut: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const roleLabel = localizedRole(t, role);
  const roleHint = localizedRoleHint(t, role);

  if (rail) {
    return (
      <div className="flex flex-col items-center gap-1 px-1.5 pb-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--accent)_35%,theme(colors.zinc.800))] bg-zinc-950 font-mono text-[10px] text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          title={`${fullName} · ${roleLabel}${tenantName ? ` · ${tenantName}` : ''}`}
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
    );
  }

  return (
    <div className="sidebar-user-card mx-3 mb-2 overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-900/60">
      <div className="h-0.5 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--accent)_70%,transparent),color-mix(in_srgb,var(--accent)_20%,transparent))]" />
      <div className="flex items-start gap-2.5 p-2.5">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] font-medium text-zinc-100',
            'border-[color-mix(in_srgb,var(--accent)_35%,theme(colors.zinc.800))] bg-zinc-950',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
          )}
        >
          {initials(fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-4 text-zinc-50">{fullName}</p>
          {tenantName ? (
            <p className="mt-0.5 truncate text-[11px] text-zinc-500">{tenantName}</p>
          ) : null}
          <Badge tone={roleTone[role]} className="mt-1.5" title={roleHint}>
            {roleLabel}
          </Badge>
        </div>
        <form action={onSignOut}>
          <button
            type="submit"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-50"
            aria-label={t.common.signOut}
            title={t.common.signOut}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
      {role === 'supervisor' || role === 'team_lead' ? (
        <div className="border-t border-zinc-800/60 px-2.5 py-1.5">
          <Link
            href="/tickets?queue=unassigned"
            className="text-[11px] text-zinc-500 transition-colors hover:text-[color-mix(in_srgb,var(--accent)_85%,white)]"
          >
            {t.nav.quickUnassigned}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
