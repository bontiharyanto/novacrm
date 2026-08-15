'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import type { KnowledgeArticle } from '@/lib/knowledge/schema';
import { formatRelativeId } from '@/lib/utils/dates';

export function KnowledgeBrowse() {
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);

  const load = useCallback(async () => {
    const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
    const response = await fetch(`/api/knowledge${suffix}`);
    const payload = await response.json().catch(() => ({}));
    setArticles(payload.data ?? []);
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  useRealtimeTable('knowledge_articles', load);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-5 p-6"
    >
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Platform</p>
        <h1 className="text-2xl font-semibold text-zinc-50">Knowledge</h1>
        <p className="mt-1 text-sm text-zinc-500">Articles published from resolved tickets. Search before opening a duplicate.</p>
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or body" />
      <div className="grid gap-3 md:grid-cols-2">
        {articles.length === 0 ? (
          <p className="text-sm text-zinc-500">No published articles yet. Resolve a ticket and use Publish to knowledge.</p>
        ) : (
          articles.map((article) => (
            <Card key={article.id}>
              <CardContent className="space-y-2 p-4">
                <p className="text-sm font-medium text-zinc-50">{article.title}</p>
                <p className="line-clamp-4 text-xs leading-5 text-zinc-500">{article.body}</p>
                <p className="text-[11px] text-zinc-600">
                  {article.category ?? 'General'} · {formatRelativeId(article.updatedAt)}
                  {article.ticketId ? (
                    <>
                      {' · '}
                      <Link href={`/tickets/${article.ticketId}`} className="text-blue-300 hover:text-blue-200">
                        Source ticket
                      </Link>
                    </>
                  ) : null}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </motion.div>
  );
}
