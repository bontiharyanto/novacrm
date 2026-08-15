'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { KnowledgeArticle } from '@/lib/knowledge/schema';

export function KnowledgeHints({ title, browseHref }: { title: string; browseHref?: string }) {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const query = title.trim();
    if (query.length < 4) {
      setArticles([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/knowledge?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((payload) => setArticles((payload.data ?? []).slice(0, 4)))
        .catch(() => setArticles([]));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [title]);

  if (articles.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Knowledge</p>
        {browseHref ? (
          <Link href={browseHref} className="text-[11px] text-blue-300 hover:text-blue-200">
            Browse
          </Link>
        ) : null}
      </div>
      <ul className="mt-2 space-y-1.5">
        {articles.map((article) => {
          const open = openId === article.id;
          return (
            <li key={article.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : article.id)}
                className="text-left text-sm text-blue-300 hover:text-blue-200"
              >
                {article.title}
              </button>
              <p className={open ? 'mt-1 whitespace-pre-wrap text-[11px] leading-5 text-zinc-400' : 'line-clamp-2 text-[11px] text-zinc-500'}>
                {article.body}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
