'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useI18n } from '@/components/layout/preferences-provider';
import { getInbox, markInboxAllRead, markInboxItemRead } from '@/lib/notifications/inbox-actions';
import type { InboxItem } from '@/lib/notifications/inbox';
import { formatRelativeId } from '@/lib/utils/dates';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export function NotificationBell({ homeHref = '/tickets' }: { homeHref?: string }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [panel, setPanel] = useState({ top: 0, left: 0, width: 352 });
  const rootRef = useRef<HTMLDivElement>(null);

  function placePanel() {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(352, window.innerWidth - 16);
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    setPanel({ top: rect.bottom + 8, left, width });
  }

  const load = useCallback(async () => {
    const result = await getInbox();
    setItems(result.data);
    setUnread(result.unread);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let client: ReturnType<typeof createSupabaseBrowserClient> | null = null;
    try {
      client = createSupabaseBrowserClient();
    } catch {
      return;
    }
    const channel = client
      .channel('realtime:in_app_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'in_app_notifications' }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void client?.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', onPointer);
    return () => window.removeEventListener('mousedown', onPointer);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          placePanel();
          setOpen((value) => !value);
        }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50"
        aria-label={t.inbox.open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-medium text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className="fixed z-[90] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl"
          style={{ top: panel.top, left: panel.left, width: panel.width }}
        >
          <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
            <p className="text-xs font-medium text-zinc-200">{t.inbox.title}</p>
            {unread > 0 ? (
              <button
                type="button"
                className="text-[11px] text-blue-300 hover:text-blue-200"
                onClick={() => {
                  void markInboxAllRead().then(() => load());
                }}
              >
                {t.inbox.markAll}
              </button>
            ) : null}
          </div>
          <div className="max-h-[24rem] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-zinc-500">{t.inbox.empty}</p>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href || homeHref}
                  onClick={() => {
                    if (!item.readAt) void markInboxItemRead(item.id);
                    setOpen(false);
                  }}
                  className={`block border-b border-zinc-800/80 px-3 py-2.5 last:border-0 hover:bg-zinc-800/60 ${
                    item.readAt ? '' : 'bg-blue-500/5'
                  }`}
                >
                  <p className={`text-xs ${item.readAt ? 'text-zinc-300' : 'font-medium text-zinc-50'}`}>{item.title}</p>
                  {item.body ? <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-zinc-500">{item.body}</p> : null}
                  <p className="mt-1 text-[10px] text-zinc-600">{formatRelativeId(item.createdAt, locale)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
