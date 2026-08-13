'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/governance', label: 'Posture' },
  { href: '/governance/ropa', label: 'RoPA' },
  { href: '/governance/requests', label: 'DSAR' },
  { href: '/governance/breaches', label: 'Breach 72h' },
  { href: '/governance/settings', label: 'Notice' },
];

export function GovernanceNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => {
        const active = item.href === '/governance' ? pathname === '/governance' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide transition-all duration-200 ease-out hover:-translate-y-0.5',
              active
                ? 'border-blue-500/40 bg-blue-500/15 text-blue-200'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
