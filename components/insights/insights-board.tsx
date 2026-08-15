'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { enUS, id as idLocale } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Building2,
  Clock,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/components/layout/preferences-provider';
import { isTenantAdminRole } from '@/lib/rbac/roles';
import { canRole, type AppRole } from '@/lib/rbac/ability';
import { INSIGHT_KINDS, type InsightCard, type InsightKind, type InsightsBoard } from '@/lib/insights/schema';
import { sanitizeInsightCard } from '@/lib/insights/parse';

const KIND_ICON: Record<InsightKind, LucideIcon> = {
  queue_pressure: Activity,
  sla_risk: Clock,
  workforce_load: AlertTriangle,
  account_health: Building2,
};

function tone(severity: InsightCard['severity']) {
  if (severity === 'success') return 'success' as const;
  if (severity === 'warning') return 'warning' as const;
  if (severity === 'danger') return 'danger' as const;
  return 'info' as const;
}

function mergeCards(current: InsightCard[], next: InsightCard[]) {
  const map = new Map(current.map((card) => [card.kind, card]));
  for (const card of next) map.set(card.kind, card);
  return INSIGHT_KINDS.map((kind) => map.get(kind)).filter((card): card is InsightCard => Boolean(card));
}

export function InsightsBoardView({
  initial,
  role,
}: {
  initial: InsightsBoard;
  role: AppRole;
}) {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'en' ? enUS : idLocale;
  const [board, setBoard] = useState(initial);
  const [running, setRunning] = useState<InsightKind | 'all' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canOpenIntegrations = isTenantAdminRole(role) && canRole(role, 'read', 'NotificationSettings');

  const labels = useMemo(
    () => ({
      queue_pressure: t.insights.kinds.queue_pressure,
      sla_risk: t.insights.kinds.sla_risk,
      workforce_load: t.insights.kinds.workforce_load,
      account_health: t.insights.kinds.account_health,
    }),
    [t],
  );

  const subtitles = useMemo(
    () => ({
      queue_pressure: t.insights.subtitles.queue_pressure,
      sla_risk: t.insights.subtitles.sla_risk,
      workforce_load: t.insights.subtitles.workforce_load,
      account_health: t.insights.subtitles.account_health,
    }),
    [t],
  );

  async function run(kind?: InsightKind) {
    setError(null);
    setRunning(kind ?? 'all');
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kind ? { kind, locale } : { all: true, locale }),
      });
      const payload = await response.json();
      if (!response.ok || payload.error) {
        setError(payload.error ?? t.insights.failed);
        return;
      }
      const next = kind ? [payload.data as InsightCard] : (payload.data as InsightCard[]);
      setBoard((prev) => ({ ...prev, cards: mergeCards(prev.cards, next.filter(Boolean)) }));
    } catch {
      setError(t.insights.failed);
    } finally {
      setRunning(null);
    }
  }

  function generatedLabel(value: string) {
    return `${t.insights.generated} ${format(new Date(value), 'd MMM yyyy, HH:mm', { locale: dateLocale })}`;
  }

  function severityLabel(severity: InsightCard['severity']) {
    if (severity === 'success') return t.insights.severity.success;
    if (severity === 'warning') return t.insights.severity.warning;
    if (severity === 'danger') return t.insights.severity.danger;
    return t.insights.severity.info;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-5 p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{t.nav.overview}</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-50">{t.insights.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">{t.insights.subtitle}</p>
        </div>
        <Button disabled={running !== null} onClick={() => void run()}>
          <Sparkles className="h-3.5 w-3.5" />
          {running === 'all' ? t.insights.running : t.insights.runAll}
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
      ) : null}

      {!board.aiConfigured ? (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400">
          {t.insights.noProvider}{' '}
          {canOpenIntegrations ? (
            <Link href="/settings" className="text-blue-400 hover:text-blue-300">
              {t.nav.integrations}
            </Link>
          ) : (
            t.insights.askAdmin
          )}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {board.cards.map((item) => {
          const card = sanitizeInsightCard(item);
          const Icon = KIND_ICON[card.kind];
          const busy = running === card.kind || running === 'all';
          return (
            <Card key={card.kind} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">
                    <Icon className="h-3.5 w-3.5 text-blue-400" />
                    {labels[card.kind]}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={tone(card.severity)}>{severityLabel(card.severity)}</Badge>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(card.kind)}>
                      <Sparkles className="h-3 w-3" />
                      {busy && running !== 'all' ? t.insights.running : t.insights.run}
                    </Button>
                  </div>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-zinc-50">{card.title}</h2>
                <p className="mt-1 text-sm text-zinc-400">{card.summary || subtitles[card.kind]}</p>
                <p className="mt-3 flex-1 whitespace-pre-line text-sm leading-6 text-zinc-300">{card.body}</p>
                <div className="mt-5 border-t border-zinc-800 pt-4">
                  <div className="grid grid-cols-3 gap-3 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                    <div>
                      {t.insights.model}
                      <p className="mt-1 font-mono text-xs normal-case tracking-normal text-zinc-200">{card.model ?? '—'}</p>
                    </div>
                    <div>
                      {t.insights.tokens}
                      <p className="mt-1 font-mono text-xs normal-case tracking-normal text-zinc-200">
                        {card.tokensIn}/{card.tokensOut}
                      </p>
                    </div>
                    <div>
                      {t.insights.latency}
                      <p className="mt-1 font-mono text-xs normal-case tracking-normal text-zinc-200">{card.latencyMs} ms</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-zinc-500">{generatedLabel(card.generatedAt)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}
