'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/components/layout/preferences-provider';
import type { AccountRecord } from '@/lib/accounts/schema';
import type { DeliveryProject, DeliveryProjectStatus } from '@/lib/delivery/schema';

function statusTone(status: DeliveryProjectStatus): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'blocked') return 'danger';
  if (status === 'in_progress') return 'info';
  if (status === 'cancelled') return 'neutral';
  return 'warning';
}

export function DeliveryProjectList({
  readOnly = false,
  canManage = false,
  accounts = [],
}: {
  readOnly?: boolean;
  canManage?: boolean;
  accounts?: AccountRecord[];
}) {
  const { t } = useI18n();
  const [projects, setProjects] = useState<DeliveryProject[]>([]);
  const [loading, setLoading] = useState(true);
  const customerAccounts = accounts.filter((account) => account.type === 'customer');
  const [accountId, setAccountId] = useState(customerAccounts[0]?.id ?? accounts[0]?.id ?? '');
  const [projectName, setProjectName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [executionMode, setExecutionMode] = useState<'sequential' | 'parallel'>('sequential');
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  const reloadProjects = useCallback(async () => {
    const response = await fetch('/api/delivery/projects');
    const payload = await response.json().catch(() => ({}));
    setProjects(payload.data ?? []);
  }, []);

  useEffect(() => {
    void reloadProjects()
      .finally(() => setLoading(false));
  }, [reloadProjects]);

  async function createProject(sample = false) {
    if (!accountId) return;
    setSaving(true);
    setFormMessage('');
    const response = await fetch('/api/delivery/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId,
        externalProvider: sample ? 'manual_seed' : 'manual',
        externalId: sample ? `DEMO-${accountId.slice(0, 8)}` : externalId,
        name: sample ? 'Demo Network Delivery Project' : projectName,
        description: sample ? 'Sample project untuk validasi progress delivery di portal.' : '',
        executionMode,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFormMessage(payload.error ?? t.common.createFailed);
    } else {
      setProjectName('');
      setExternalId('');
      setFormMessage(t.common.created);
      await reloadProjects();
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-safe md:p-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.nav.delivery}</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-zinc-50">{t.common.delivery}</h1>
        <p className="mt-1.5 text-sm leading-6 text-zinc-500">{t.common.deliverySubtitle}</p>
      </div>
      {canManage ? (
        <section className="nova-surface rounded-xl border p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.common.deliveryManualTitle}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{t.common.deliveryManualHint}</p>
          <div className="mt-4 grid gap-2 md:grid-cols-[1.3fr_1.3fr_1fr_150px_auto]">
            <Select value={accountId} onChange={(event) => setAccountId(event.target.value)} aria-label={t.common.account}>
              {customerAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </Select>
            <Input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder={t.common.deliveryProjectName} />
            <Input value={externalId} onChange={(event) => setExternalId(event.target.value)} placeholder={t.common.deliveryExternalIdPlaceholder} />
            <Select value={executionMode} onChange={(event) => setExecutionMode(event.target.value as 'sequential' | 'parallel')} aria-label={t.tickets.tasks.title}>
              <option value="sequential">{t.tickets.tasks.sequential}</option>
              <option value="parallel">{t.tickets.tasks.parallel}</option>
            </Select>
            <Button disabled={saving || !accountId || !projectName.trim() || !externalId.trim()} onClick={() => void createProject()}>
              {t.common.deliveryCreateProject}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" disabled={saving || !accountId} onClick={() => void createProject(true)}>
              {t.common.deliverySeedSample}
            </Button>
            <span className="text-xs text-zinc-600">{t.common.deliverySeedSampleHint}</span>
            {formMessage ? <span className="text-xs text-zinc-400">{formMessage}</span> : null}
          </div>
        </section>
      ) : null}
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
