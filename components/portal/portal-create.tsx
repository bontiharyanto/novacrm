'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { CatalogOtherForm, type TicketKind } from '@/components/catalog/catalog-other-form';
import { useI18n } from '@/components/layout/preferences-provider';

export function PortalCreate() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const raw = searchParams.get('type');
  const initialType: TicketKind = raw === 'request' ? 'request' : 'incident';
  const [ticketType, setTicketType] = useState<TicketKind>(initialType);
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
        <div className="mt-5 max-w-md rounded-xl border border-zinc-700 bg-zinc-900/80 p-1.5 shadow-lg shadow-black/20">
          <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {t.portal.ticketKind}
          </p>
          <div className="grid grid-cols-2 gap-1">
            {(['incident', 'request'] as const).map((kind) => {
              const selected = ticketType === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTicketType(kind)}
                  className={`rounded-lg px-4 py-3 text-left transition-all duration-200 ease-out ${
                    selected
                      ? 'nova-accent-btn text-white shadow-md shadow-blue-500/20'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                  }`}
                >
                  <span className="block text-sm font-semibold">{t.tickets.type[kind]}</span>
                  <span className={`mt-0.5 block text-[11px] ${selected ? 'text-white/70' : 'text-zinc-600'}`}>
                    {t.tickets.typeHint[kind]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <CatalogOtherForm
        defaultType={ticketType}
        ticketType={ticketType}
        onTicketTypeChange={setTicketType}
        showTypeToggle={false}
      />
    </motion.div>
  );
}
