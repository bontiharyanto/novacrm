import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionProfile();
  if (!session) {
    redirect('/login');
  }
  if (session.profile.role !== 'customer') {
    redirect('/tickets');
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-blue-400">NovaCRM Portal</p>
        <h1 className="mt-1 text-lg font-medium text-white">{session.profile.fullName}</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}
