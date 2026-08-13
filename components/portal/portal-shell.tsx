'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, LogOut, Plus, Scale, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';

export function PortalShell({ children, fullName }: { children: React.ReactNode; fullName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-blue-400">NovaCRM Portal</p>
            <p className="mt-0.5 text-sm text-white">{fullName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/portal"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all duration-200 ease-out hover:-translate-y-0.5',
                pathname === '/portal' ||
                (pathname.startsWith('/portal/') &&
                  !pathname.startsWith('/portal/catalog') &&
                  pathname !== '/portal/new' &&
                  !pathname.startsWith('/portal/privacy'))
                  ? 'bg-blue-500/15 text-blue-300'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white',
              )}
            >
              <Ticket className="h-3.5 w-3.5" /> My tickets
            </Link>
            <Link
              href="/portal/catalog"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all duration-200 ease-out hover:-translate-y-0.5',
                pathname.startsWith('/portal/catalog')
                  ? 'bg-blue-500/15 text-blue-300'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white',
              )}
            >
              <BookOpen className="h-3.5 w-3.5" /> Catalog
            </Link>
            <Link
              href="/portal/privacy"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all duration-200 ease-out hover:-translate-y-0.5',
                pathname.startsWith('/portal/privacy')
                  ? 'bg-blue-500/15 text-blue-300'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white',
              )}
            >
              <Scale className="h-3.5 w-3.5" /> Privacy
            </Link>
            <Link
              href="/portal/new"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all duration-200 ease-out hover:-translate-y-0.5',
                pathname === '/portal/new'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-500',
              )}
            >
              <Plus className="h-3.5 w-3.5" /> New request
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
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
