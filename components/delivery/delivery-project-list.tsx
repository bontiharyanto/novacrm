'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/components/layout/preferences-provider';
import type { DeliveryProject, DeliveryProjectStatus } from '@/lib/delivery/schema';

function statusTone(status: DeliveryProjectStatus): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'blocked') return 'danger';
  if (status === 'in_progress') return 'info';
  if (status === 'cancelled') return 'neutral';
  return 'warning';
}

export function DeliveryProjectList({ readOnly = false }: { readOnly?: boolean }) {
  const { t } = useI18n();
  const [projects, setProjects] = useState<DeliveryProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/delivery/projects')
      .then((response) => response.json())
      .then((payload) => setProjects(payload.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-safe md:p-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.nav.delivery}</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-zinc-50">{t.common.delivery}</h1>
        <p className="mt-1.5 text-sm leading-6 text-zinc-500">{t.common.deliverySubtitle}</p>
      </div>
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : projects.length === 0 ? (
        <div className="nova-surface rounded-xl border p-8 text-center">
          <BriefcaseBusiness className="mx-auto h-6 w-6 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">{t.common.deliveryEmpty}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`${readOnly ? '/portal/projects' : '/delivery'}/${project.id}`}
              className="nova-surface rounded-xl border p-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-600"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-50">{project.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{project.accountName ?? project.externalId}</p>
                </div>
                <Badge tone={statusTone(project.status)}>{t.common.deliveryStatus[project.status]}</Badge>
              </div>
              <div className="mt-5 flex items-center justify-between text-[11px] text-zinc-500">
                <span>{t.common.deliveryProgress}</span>
                <span className="font-mono text-zinc-300">{project.progress}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${project.progress}%` }} />
              </div>
              <div className="mt-4 flex items-center justify-end text-xs text-zinc-500">
                {t.tickets.view} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
