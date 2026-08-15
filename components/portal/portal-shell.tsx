'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, LogOut, Plus, Scale, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import { signOutAction } from '@/lib/auth/actions';
import { PreferenceControls } from '@/components/layout/preference-controls';
import { useI18n } from '@/components/layout/preferences-provider';
import { NovaMark } from '@/components/brand/nova-mark';
import { cn } from '@/lib/utils';

export function PortalShell({ children, fullName }: { children: React.ReactNode; fullName: string }) {
  const pathname = usePathname();
  const { t } = useI18n();


  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 pt-safe backdrop-blur md:px-6 md:py-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <NovaMark size={28} />
              <div>
                <p className="nova-accent-text font-mono text-[11px] uppercase tracking-[0.2em]">{t.brand.portal}</p>
                <p className="mt-0.5 text-sm text-zinc-50">{fullName}</p>
              </div>
            </div>
            <PreferenceControls compact />
          </div>
          <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:justify-end sm:overflow-visible sm:px-0">
            <Link
              href="/portal"
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all duration-200 ease-out hover:-translate-y-0.5',
                pathname === '/portal' ||
                (pathname.startsWith('/portal/') &&
                  !pathname.startsWith('/portal/catalog') &&
                  pathname !== '/portal/new' &&
                  !pathname.startsWith('/portal/privacy'))
                  ? 'nova-accent-nav'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50',
              )}
            >
              <Ticket className="h-3.5 w-3.5" /> {t.portal.myTickets}
            </Link>
            <Link
              href="/portal/catalog"
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all duration-200 ease-out hover:-translate-y-0.5',
                pathname.startsWith('/portal/catalog')
                  ? 'nova-accent-nav'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50',
              )}
            >
              <BookOpen className="h-3.5 w-3.5" /> {t.portal.catalog}
            </Link>
            <Link
              href="/portal/privacy"
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all duration-200 ease-out hover:-translate-y-0.5',
                pathname.startsWith('/portal/privacy')
                  ? 'nova-accent-nav'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50',
              )}
            >
              <Scale className="h-3.5 w-3.5" /> {t.portal.privacy}
            </Link>
            <Link
              href="/portal/new"
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all duration-200 ease-out hover:-translate-y-0.5',
                pathname === '/portal/new'
                  ? 'nova-accent-btn text-white'
                  : 'nova-accent-btn text-white',
              )}
            >
              <Plus className="h-3.5 w-3.5" /> {t.portal.newRequest}
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
              >
                <LogOut className="h-3.5 w-3.5" /> {t.common.signOut}
              </button>
            </form>
          </div>
        </div>
      </header>
      <motion.main
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.main>
    </div>
  );
}
