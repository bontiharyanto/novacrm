'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useI18n } from '@/components/layout/preferences-provider';
import { APP_ROLES, ROLE_LABEL, type AppRole } from '@/lib/rbac/roles';
import {
  CAPABILITY_ACTIONS,
  CAPABILITY_SUBJECTS,
  type CapabilityAction,
  type CapabilityCell,
  type CapabilitySubject,
} from '@/lib/rbac/capabilities';

function subjectLabel(subject: CapabilitySubject, t: ReturnType<typeof useI18n>['t']) {
  const labels: Partial<Record<CapabilitySubject, string>> = {
    Ticket: t.nav.allTickets,
    Asset: t.nav.assets,
    Cmdb: t.nav.cmdb,
    Account: t.nav.accounts,
    Org: t.nav.organization,
    Sla: t.nav.sla,
    User: t.nav.users,
    Workflow: t.nav.automation,
    Catalog: t.nav.catalog,
    Governance: t.nav.governance,
    Wfm: t.nav.wfm,
    Knowledge: t.nav.knowledge,
    Capability: t.nav.capabilities,
  };
  return labels[subject] ?? subject;
}

export function CapabilityMatrix() {
  const { t } = useI18n();
  const [matrix, setMatrix] = useState<CapabilityCell[]>([]);
  const [action, setAction] = useState<CapabilityAction>('read');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/api/rbac/capabilities')
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? t.common.saveFailed);
        setMatrix(payload.data ?? []);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t.common.saveFailed))
      .finally(() => setLoading(false));
  }, [t.common.saveFailed]);

  const cells = useMemo(
    () => new Map(matrix.filter((cell) => cell.action === action).map((cell) => [`${cell.role}:${cell.subject}`, cell])),
    [action, matrix],
  );

  async function toggle(cell: CapabilityCell) {
    const key = `${cell.role}:${cell.action}:${cell.subject}`;
    setSaving(key);
    const response = await fetch('/api/rbac/capabilities', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: cell.role,
        action: cell.action,
        subject: cell.subject,
        allowed: !cell.allowed,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? t.common.capabilitySaveFailed);
    } else {
      setMatrix((current) => current.map((item) => (
        item.role === cell.role && item.action === cell.action && item.subject === cell.subject
          ? { ...item, allowed: !cell.allowed, overridden: true }
          : item
      )));
      setError('');
    }
    setSaving('');
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-safe md:p-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.nav.capabilities}</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-zinc-50">{t.common.capabilityTitle}</h1>
        <p className="mt-1.5 text-sm leading-6 text-zinc-500">{t.common.capabilitySubtitle}</p>
      </div>
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm text-zinc-300">{t.common.capabilityAction[action]}</CardTitle>
            <p className="mt-1 text-xs text-zinc-500">{t.common.capabilityOverride} · {t.common.capabilityAllowed} / {t.common.capabilityDenied}</p>
          </div>
          <Select value={action} onChange={(event) => setAction(event.target.value as CapabilityAction)} className="h-9 w-auto min-w-[140px] text-xs">
            {CAPABILITY_ACTIONS.map((value) => <option key={value} value={value}>{t.common.capabilityAction[value]}</option>)}
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-zinc-500">{t.common.loading}</p> : null}
          {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}
          {!loading ? (
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/60">
                    <th className="sticky left-0 z-10 bg-zinc-950 px-3 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                      {t.common.capabilityTitle}
                    </th>
                    {APP_ROLES.map((role) => (
                      <th key={role} className="px-2 py-3 text-center text-[10px] uppercase tracking-[0.1em] text-zinc-500">
                        {ROLE_LABEL[role]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CAPABILITY_SUBJECTS.map((subject) => (
                    <tr key={subject} className="border-b border-zinc-800/70 last:border-b-0">
                      <th className="sticky left-0 bg-zinc-900 px-3 py-2.5 text-left font-medium text-zinc-300">
                        {subjectLabel(subject, t)}
                        <span className="ml-2 font-mono text-[10px] text-zinc-600">{subject}</span>
                      </th>
                      {APP_ROLES.map((role: AppRole) => {
                        const cell = cells.get(`${role}:${subject}`);
                        if (!cell) return <td key={role} className="px-2 py-2" />;
                        const key = `${cell.role}:${cell.action}:${cell.subject}`;
                        return (
                          <td key={role} className="px-2 py-2 text-center">
                            <button
                              type="button"
                              disabled={saving === key}
                              aria-label={`${ROLE_LABEL[role]} ${subject} ${action}`}
                              title={cell.overridden ? t.common.capabilityOverride : t.common.capabilityDefault}
                              onClick={() => void toggle(cell)}
                              className={`inline-flex min-w-[72px] items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                                cell.allowed
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                  : 'border-zinc-700 bg-zinc-950 text-zinc-600 hover:border-zinc-500 hover:text-zinc-400'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${cell.allowed ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                              {cell.allowed ? t.common.capabilityAllowed : t.common.capabilityDenied}
                              {cell.overridden ? <Badge tone="info" className="ml-1 px-1 text-[9px]">O</Badge> : null}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
