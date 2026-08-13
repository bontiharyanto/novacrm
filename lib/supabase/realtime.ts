'use client';

import { useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export function useRealtimeTable(table: string, onChange: () => void) {
  useEffect(() => {
    let client: ReturnType<typeof createSupabaseBrowserClient> | null = null;

    try {
      client = createSupabaseBrowserClient();
    } catch {
      return;
    }

    const channel = client
      .channel(`realtime:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        onChange();
      })
      .subscribe();

    return () => {
      if (client) {
        void client.removeChannel(channel);
      }
    };
  }, [table, onChange]);
}
