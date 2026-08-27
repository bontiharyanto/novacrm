'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { CatalogOtherForm } from '@/components/catalog/catalog-other-form';
import { useI18n } from '@/components/layout/preferences-provider';

export function PortalCreate() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const raw = searchParams.get('type');
  const ticketType = raw === 'request' ? 'request' : 'incident';
  const isIncident = ticketType === 'incident';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="mx-auto max-w-3xl space-y-6 p-4 pb-safe md:p-8"
    >
      <div>
        <Link href="/portal/catalog" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
          <ArrowLeft className="h-3.5 w-3.5" /> {t.portal.catalog}
        </Link>
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-zinc-50">
          {isIncident ? t.portal.reportIncident : t.portal.newRequest}
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          {isIncident ? t.portal.reportIncidentHint : t.portal.newRequestHint}
        </p>
      </div>
      <CatalogOtherForm key={ticketType} defaultType={ticketType} />
    </motion.div>
  );
}
