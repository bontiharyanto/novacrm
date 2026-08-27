'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Home, KeyRound, LogOut, Plus, Scale } from 'lucide-react';
import { motion } from 'framer-motion';
import { signOutAction } from '@/lib/auth/actions';
import { PreferenceControls } from '@/components/layout/preference-controls';
import { NotificationBell } from '@/components/layout/notification-bell';
import { AskAiButton, AssistantWidget } from '@/components/assistant/assistant-widget';
import { useI18n } from '@/components/layout/preferences-provider';
import { BrandMark } from '@/components/brand/nova-mark';
import { PortalWelcome } from '@/components/portal/portal-welcome';
import { IdleSessionGuard } from '@/components/layout/idle-session-guard';
import { PrivacyModuleProvider, usePrivacyEnabled } from '@/components/portal/privacy-module';
import { useMarkPrivacySeen } from '@/components/portal/portal-consent-banner';
import { cn } from '@/lib/utils';
import type { PendingCsatTicket } from '@/lib/csat/schema';

function isHomePath(pathname: string) {
  return (
    pathname === '/portal' ||
    (pathname.startsWith('/portal/') &&
      !pathname.startsWith('/portal/catalog') &&
      pathname !== '/portal/new' &&
      !pathname.startsWith('/portal/account') &&
      !pathname.startsWith('/portal/privacy'))
  );
}

function tabClass(active: boolean) {
  return cn(
    'relative inline-flex h-9 shrink-0 items-center gap-1.5 px-2.5 text-[13px] transition-colors duration-200 ease-out',
    active ? 'text-zinc-50' : 'text-zinc-500 hover:text-zinc-200',
  );
}

export function PortalShell({
  children,
  fullName,
  userId,
  privacyEnabled = false,
  pendingCsat = [],
  idleTimeoutMinutes = 30,
  logoUrl,
  tenantName,
}: {
  children: React.ReactNode;
  fullName: string;
  userId?: string;
  privacyEnabled?: boolean;
  pendingCsat?: PendingCsatTicket[];
  idleTimeoutMinutes?: number;
  logoUrl?: string | null;
  tenantName?: string;
}) {
  return (
    <PrivacyModuleProvider enabled={privacyEnabled}>
      <PortalShellInner
        fullName={fullName}
        userId={userId}
        pendingCsat={pendingCsat}
        idleTimeoutMinutes={idleTimeoutMinutes}
        logoUrl={logoUrl}
        tenantName={tenantName}
      >
        {children}
      </PortalShellInner>
    </PrivacyModuleProvider>
  );
}

function PortalShellInner({
  children,
  fullName,
  userId,
  pendingCsat,
  idleTimeoutMinutes,
  logoUrl,
  tenantName,
}: {
  children: React.ReactNode;
  fullName: string;
  userId?: string;
  pendingCsat: PendingCsatTicket[];
  idleTimeoutMinutes: number;
  logoUrl?: string | null;
  tenantName?: string;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const privacyEnabled = usePrivacyEnabled();
  const [agentOpen, setAgentOpen] = useState(false);
  const firstName = fullName.trim().split(/\s+/)[0] || fullName;
  useMarkPrivacySeen(privacyEnabled);

  const csatLocked = pendingCsat.length > 0;
  const rateHref = csatLocked ? `/portal/${pendingCsat[0].id}?rate=1` : '/portal';

  const tabs = [
    { href: rateHref, label: t.portal.home, icon: Home, active: isHomePath(pathname) },
    ...(!csatLocked
      ? [{ href: '/portal/catalog', label: t.portal.catalog, icon: BookOpen, active: pathname.startsWith('/portal/catalog') }]
      : []),
    ...(privacyEnabled && !csatLocked
      ? [{ href: '/portal/privacy', label: t.portal.privacy, icon: Scale, active: pathname.startsWith('/portal/privacy') }]
      : []),
  ];

  return (
    <div
      className={cn(
        'min-h-dvh bg-zinc-950 text-zinc-100 transition-[padding] duration-200 ease-out',
        agentOpen && 'md:pr-[400px]',
      )}
    >
      <PortalWelcome />
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 pt-safe backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 md:h-14 md:flex-row md:items-center md:gap-6 md:px-6">
          <div className="flex h-12 items-center justify-between gap-3 md:h-auto md:flex-1">
            <Link href={rateHref} className="flex min-w-0 items-center gap-2.5">
              <BrandMark size={26} logoUrl={logoUrl} logoAlt={tenantName ?? t.brand.name} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium tracking-tight text-zinc-50">{firstName}</span>
                <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {t.brand.portal}
                </span>
              </span>
            </Link>
            <div className="flex items-center gap-1.5">
              <NotificationBell homeHref={rateHref} userId={userId} />
              {!csatLocked ? <AskAiButton onClick={() => setAgentOpen(true)} /> : null}
              <PreferenceControls compact />
              <Link
                href="/portal/account"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
                aria-label={t.portal.changePassword}
                title={t.portal.changePassword}
              >
                <KeyRound className="h-3.5 w-3.5" />
              </Link>
              <form action={signOutAction} className="hidden md:block">
                <button
                  type="submit"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
                  aria-label={t.common.signOut}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </form>
              {!csatLocked ? (
                <Link
                  href="/portal/catalog"
                  className="nova-accent-btn inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-[12px] font-medium text-white transition-all duration-200 ease-out hover:-translate-y-px"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.portal.newRequest}</span>
                </Link>
              ) : null}
            </div>
          </div>
          <nav className="-mx-4 flex items-center gap-0.5 overflow-x-auto border-t border-zinc-800/60 px-2 md:mx-0 md:border-0 md:px-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link key={tab.href} href={tab.href} className={tabClass(tab.active)}>
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.active ? (
                    <span className="nova-accent-bar absolute inset-x-2 -bottom-px h-px rounded-full md:bottom-0" />
                  ) : null}
                </Link>
              );
            })}
            <form action={signOutAction} className="ml-auto md:hidden">
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 px-2.5 text-[13px] text-zinc-500"
                aria-label={t.common.signOut}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </nav>
        </div>
      </header>
      <motion.main
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.main>
      {!csatLocked ? (
        <AssistantWidget
          firstName={firstName}
          open={agentOpen}
          onOpenChange={setAgentOpen}
          variant="portal"
        />
      ) : null}
      <IdleSessionGuard minutes={idleTimeoutMinutes} />
    </div>
  );
}
