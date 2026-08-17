'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { signOutIdleAction } from '@/lib/auth/actions';
import {
  DEFAULT_IDLE_MINUTES,
  IDLE_COOKIE,
  IDLE_WARN_MS,
  idleTimeoutMs,
  parseIdleMinutes,
  shouldWarnIdle,
  type IdleMinutes,
} from '@/lib/auth/idle-timeout';
import { useI18n } from '@/components/layout/preferences-provider';
import { Button } from '@/components/ui/button';

function readLastActive() {
  if (typeof document === 'undefined') return Date.now();
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${IDLE_COOKIE}=`));
  const value = match ? Number(match.slice(IDLE_COOKIE.length + 1)) : NaN;
  return Number.isFinite(value) ? value : Date.now();
}

function writeLastActive(at = Date.now()) {
  document.cookie = `${IDLE_COOKIE}=${at}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
}

export function IdleSessionGuard({ minutes }: { minutes?: number }) {
  const { t } = useI18n();
  const idleMinutes = parseIdleMinutes(minutes ?? DEFAULT_IDLE_MINUTES);
  const [warn, setWarn] = useState(false);
  const lastWrite = useRef(0);
  const loggingOut = useRef(false);

  const markActive = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastWrite.current < 5_000) return;
    lastWrite.current = now;
    writeLastActive(now);
    setWarn(false);
  }, []);

  useEffect(() => {
    if (idleMinutes === 0) return;
    writeLastActive();
    const onActivity = () => markActive();
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, onActivity, { passive: true, capture: true }));
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const last = readLastActive();
      if (Date.now() - last >= idleTimeoutMs(idleMinutes as IdleMinutes)) {
        loggingOut.current = true;
        void signOutIdleAction();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    const timer = window.setInterval(() => {
      if (loggingOut.current) return;
      const last = readLastActive();
      const now = Date.now();
      if (now - last >= idleTimeoutMs(idleMinutes as IdleMinutes)) {
        loggingOut.current = true;
        void signOutIdleAction();
        return;
      }
      setWarn(shouldWarnIdle(last, idleMinutes as IdleMinutes, now));
    }, 1_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, onActivity, true));
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [idleMinutes, markActive]);

  if (idleMinutes === 0 || !warn) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4">
      <div className="flex max-w-lg items-center gap-3 rounded-lg border border-amber-500/40 bg-zinc-950/95 px-4 py-3 text-sm text-amber-100 shadow-lg">
        <p className="min-w-0 flex-1">{t.idlePolicy.warn.replace('{{n}}', String(Math.round(IDLE_WARN_MS / 1000)))}</p>
        <Button type="button" size="sm" onClick={() => markActive(true)}>
          {t.idlePolicy.stay}
        </Button>
      </div>
    </div>
  );
}
