'use client';

import { useEffect, useId, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export function useRealtimeTable(table: string, onChange: () => void) {
  const reactId = useId().replace(/:/g, '');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let client: ReturnType<typeof createSupabaseBrowserClient> | null = null;

    try {
      client = createSupabaseBrowserClient();
    } catch {
      return;
    }

    // Unique topic per hook instance — shared names throw after the first subscribe().
    const channel = client
      .channel(`realtime:${table}:${reactId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        onChangeRef.current();
      })
      .subscribe();

    return () => {
      if (client) {
        void client.removeChannel(channel);
      }
    };
  }, [table, reactId]);
}
