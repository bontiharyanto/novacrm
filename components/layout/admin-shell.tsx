'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { AppRole } from '@/lib/rbac/ability';

const navItems: Array<{ href: string; label: string; roles: AppRole[] }> = [
  { href: '/tickets', label: 'Tickets', roles: ['admin', 'agent'] },
  { href: '/assets', label: 'Assets', roles: ['admin', 'agent'] },
  { href: '/cmdb', label: 'CMDB', roles: ['admin', 'agent'] },
  { href: '/workflows', label: 'Automation', roles: ['admin', 'agent'] },
  { href: '/settings/notifications', label: 'Notifications', roles: ['admin'] },
];

export function AgentShell({
  children,
  role,
  fullName,
}: {
  children: React.ReactNode;
  role: AppRole;
  fullName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = navItems.filter((item) => item.roles.includes(role));

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-zinc-800 bg-zinc-950/95 p-6 lg:block">
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-blue-400">NovaCRM</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Operations</h1>
        </div>

        <nav className="space-y-2">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? 'bg-blue-500/15 text-blue-300' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="border-b border-zinc-800 bg-zinc-950/70 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Workspace</p>
              <h2 className="text-lg font-medium text-white">Support desk</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-white">{fullName}</p>
                <p className="font-mono text-[11px] uppercase tracking-wide text-zinc-500">{role}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
