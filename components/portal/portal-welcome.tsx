'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NovaMark } from '@/components/brand/nova-mark';
import { useI18n } from '@/components/layout/preferences-provider';

const COOKIE = 'novacrm_portal_welcome';

function consumeWelcomeFlag() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('welcome') === '1';
  const fromCookie = document.cookie.split(';').some((part) => part.trim().startsWith(`${COOKIE}=`));
  if (!fromQuery && !fromCookie) return false;

  if (fromCookie) {
    document.cookie = `${COOKIE}=; Max-Age=0; path=/`;
  }
  if (fromQuery) {
    params.delete('welcome');
    const search = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`);
  }
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function PortalWelcome() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (consumeWelcomeFlag()) setOpen(true);
  }, []);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <motion.div
            className="flex flex-col items-center"
            initial={{ scale: 0.62, opacity: 0 }}
            animate={{ scale: [0.62, 1.14, 1], opacity: 1 }}
            transition={{ duration: 1.65, times: [0, 0.52, 1], ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => {
              window.setTimeout(() => setOpen(false), 1100);
            }}
          >
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <NovaMark size={88} />
            </div>
            <p className="mt-4 text-[22px] font-semibold tracking-tight text-zinc-50">{t.brand.name}</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">{t.brand.portal}</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
