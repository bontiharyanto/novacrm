import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PrivacyNoticeArticle } from '@/components/governance/privacy-notice-article';
import { PreferenceControls } from '@/components/layout/preference-controls';
import { NovaMark } from '@/components/brand/nova-mark';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function PublicPrivacyPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('privacy_settings').select('is_published').eq('is_published', true).limit(1).maybeSingle();
  if (!data) {
    redirect('/login');
  }

  return (
    <div className="min-h-dvh bg-zinc-950 px-4 py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/login" className="flex items-center gap-2.5">
            <NovaMark size={28} />
            <span className="text-[13px] font-medium tracking-tight text-zinc-50">NovaCRM</span>
          </Link>
          <PreferenceControls compact />
        </div>
        <section className="nova-surface rounded-xl border p-5 md:p-6">
          <PrivacyNoticeArticle />
        </section>
        <p className="text-center text-[12px] text-zinc-600">
          <Link href="/login" className="hover:text-zinc-300">
            NovaCRM
          </Link>
        </p>
      </div>
    </div>
  );
}
