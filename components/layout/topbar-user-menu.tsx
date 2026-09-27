'use client';

import { useEffect, useRef, useState } from 'react';
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

export function TopbarUserMenu({
  fullName,
  role,
  tenantName,
  onSignOut,
}: {
  fullName: string;
  role: AppRole;
  tenantName?: string | null;
  onSignOut: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const roleLabel = localizedRole(t, role);
  const roleHint = localizedRoleHint(t, role);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'inline-flex h-8 max-w-[12rem] items-center gap-2 rounded-md border border-zinc-800/80 bg-zinc-900/40 px-1.5 pr-2',
          'text-left transition-colors duration-200 hover:border-zinc-700 hover:bg-zinc-900',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]',
          open && 'border-zinc-700 bg-zinc-900',
        )}
      >
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border font-mono text-[10px] font-medium text-zinc-100',
            'border-[color-mix(in_srgb,var(--accent)_35%,theme(colors.zinc.800))] bg-zinc-950',
          )}
        >
          {initials(fullName)}
        </span>
        <span className="min-w-0 hidden sm:block">
          <span className="block truncate text-[12px] font-medium leading-4 text-zinc-100">{fullName}</span>
          <span className="block truncate text-[10px] leading-3 text-zinc-500">{roleLabel}</span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-64 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl shadow-black/40"
        >
          <div className="border-b border-zinc-800 px-3 py-2.5">
            <p className="truncate text-[13px] font-medium text-zinc-50">{fullName}</p>
            {tenantName ? <p className="mt-0.5 truncate text-[11px] text-zinc-500">{tenantName}</p> : null}
            <Badge tone={roleTone[role]} className="mt-2" title={roleHint}>
              {roleLabel}
            </Badge>
          </div>
          {role === 'supervisor' || role === 'team_lead' ? (
            <Link
              href="/tickets?queue=unassigned"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-[12px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              {t.nav.quickUnassigned}
            </Link>
          ) : null}
          <form action={onSignOut}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t.common.signOut}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
