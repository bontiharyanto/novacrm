'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export type ToastTone = 'success' | 'error';

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

const EVENT = 'novacrm:toast';
const STORAGE_KEY = 'novacrm_toast';

function emitToast(message: string, tone: ToastTone) {
  if (typeof window === 'undefined' || !message.trim()) return;
  const detail = { message: message.trim(), tone, at: Date.now() };
  window.dispatchEvent(new CustomEvent(EVENT, { detail }));
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(detail));
  } catch {
    // ignore quota / private mode
  }
}

export function toastSuccess(message: string) {
  emitToast(message, 'success');
}

export function toastError(message: string) {
  emitToast(message, 'error');
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { message?: string; tone?: ToastTone; at?: number };
        if (parsed.message && parsed.tone && parsed.at && Date.now() - parsed.at < 8000) {
          pushToast(parsed.message, parsed.tone);
        }
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }

    function onToast(event: Event) {
      const detail = (event as CustomEvent<{ message?: string; tone?: ToastTone }>).detail;
      if (!detail?.message || !detail.tone) return;
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      pushToast(detail.message, detail.tone);
    }

    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  function pushToast(message: string, tone: ToastTone) {
    const id = Date.now() + Math.random();
    setItems((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm shadow-none ${
              item.tone === 'success'
                ? 'border-emerald-500/30 bg-zinc-900 text-emerald-200'
                : 'border-rose-500/30 bg-zinc-900 text-rose-200'
            }`}
            role="status"
          >
            <p className="flex-1 leading-5">{item.message}</p>
            <button
              type="button"
              className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))}
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
