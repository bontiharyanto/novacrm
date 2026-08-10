'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/settings/notifications', label: 'Notifications' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-zinc-800 bg-zinc-950/95 p-6 lg:block">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400">NovaCRM</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Operations</h1>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
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
            <div className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
              Live
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
