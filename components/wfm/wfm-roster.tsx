'use client';

import { useMemo, useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { WfmNav } from '@/components/wfm/wfm-nav';
import { applyStandardRoster, deleteRosterEntry, importRosterFile, upsertRosterEntry } from '@/lib/wfm/actions';
import { formatShiftHours, shiftTemplateLabel } from '@/lib/wfm/default-shifts';
import type { WfmRosterEntry, WfmShiftTemplate } from '@/lib/wfm/schema';
import { useI18n } from '@/components/layout/preferences-provider';
import { useRouter } from 'next/navigation';
import { toastError, toastSuccess } from '@/components/ui/toast';

type Staff = { id: string; fullName: string };
type Group = { id: string; name: string };

export function WfmRoster({
  entries,
  templates,
  groups,
  staff,
  canEdit,
  selfOnly = false,
}: {
  entries: WfmRosterEntry[];
  templates: WfmShiftTemplate[];
  groups: Group[];
  staff: Staff[];
  canEdit: boolean;
  selfOnly?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [localCells, setLocalCells] = useState<Record<string, WfmRosterEntry | null>>({});
  const selected = templates.find((template) => template.id === templateId) ?? templates[0];
  const filtered = useMemo(() => {
    if (selfOnly) return entries;
    return groupId ? entries.filter((entry) => entry.groupId === groupId) : entries;
  }, [entries, groupId, selfOnly]);
  const byKey = useMemo(() => {
    const map = new Map<string, WfmRosterEntry>();
    for (const entry of filtered) map.set(`${entry.userId}:${entry.workDate}`, entry);
    return map;
  }, [filtered]);
  const members = useMemo(() => {
    if (selfOnly) return staff;
    const ids = new Set(filtered.map((entry) => entry.userId));
    const listed = staff.filter((person) => ids.has(person.id));
    return listed.length > 0 ? listed : staff;
  }, [filtered, selfOnly, staff]);

  async function assign(userId: string, workDate: string, entry?: WfmRosterEntry) {
    const shift = selected;
    const key = `${userId}:${workDate}`;
    if (!groupId) {
      toastError(t.wfm.emptyGroups);
      return;
    }
    if (!shift) {
      toastError(t.wfm.rosterCellFailed);
      return;
    }
    setPendingKey(key);
    try {
      if (entry && entry.templateId === shift.id) {
        const removed = await deleteRosterEntry(entry.id);
        if (removed.error) {
          toastError(removed.error);
          return;
        }
        setLocalCells((current) => ({ ...current, [key]: null }));
        router.refresh();
        return;
      }
      const result = await upsertRosterEntry({
        userId,
        groupId,
        workDate,
        templateId: shift.id,
        source: 'override',
      });
      if (result.error) {
        toastError(result.error);
        return;
      }
      setLocalCells((current) => ({
        ...current,
        [key]: {
          id: entry?.id ?? key,
          userId,
          groupId,
          workDate,
          templateId: shift.id,
          templateName: shift.name,
          startLocal: shift.startLocal,
          endLocal: shift.endLocal,
          source: 'override',
        },
      }));
      router.refresh();
    } catch {
      toastError(t.wfm.rosterCellFailed);
    } finally {
      setPendingKey(null);
    }
  }

  async function applyWeek() {
    if (!groupId || !templateId) return;
    setApplying(true);
    try {
      const result = await applyStandardRoster({
        groupId,
        templateId,
        fromDate: format(weekStart, 'yyyy-MM-dd'),
        toDate: format(addDays(weekStart, 6), 'yyyy-MM-dd'),
      });
      if (!result.data) {
        toastError(result.error ?? t.wfm.rosterApplyFailed);
        return;
      }
      toastSuccess(t.wfm.rosterApplied.replace('{{n}}', String(result.data.applied)));
      router.refresh();
    } catch {
      toastError(t.wfm.rosterApplyFailed);
    } finally {
      setApplying(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('groupId', groupId);
      const result = await importRosterFile(form);
      if (!result.data) {
        toastError(result.error ?? t.wfm.rosterImportFailed);
        return;
      }
      toastSuccess(t.wfm.rosterImported.replace('{{n}}', String(result.data.imported)));
      if (result.data.errors.length) {
        toastError(result.data.errors.slice(0, 3).join(' '));
      }
      router.refresh();
    } catch {
      toastError(t.wfm.rosterImportFailed);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <WfmNav selfOnly={selfOnly} />
      {selfOnly ? <p className="text-sm text-zinc-400">{t.wfm.myRosterHint}</p> : null}
      <div className="flex flex-wrap gap-2">
        {selfOnly ? null : (
          <Select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="max-w-xs">
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        )}
        {canEdit ? (
          <Select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="max-w-xs">
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {shiftTemplateLabel(template.name, template.startLocal, template.endLocal)}
              </option>
            ))}
          </Select>
        ) : null}
        {canEdit ? (
          <Button size="sm" variant="outline" disabled={!groupId || !templateId || applying} onClick={() => void applyWeek()}>
            {applying ? t.wfm.rosterApplying : t.wfm.rosterApplyWeek}
          </Button>
        ) : null}
        {canEdit ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <a href="/api/wfm/roster/template?format=csv" className="text-xs text-zinc-400 hover:text-zinc-200">
              {t.wfm.rosterTemplateCsv}
            </a>
            <a href="/api/wfm/roster/template?format=xlsx" className="text-xs text-zinc-400 hover:text-zinc-200">
              {t.wfm.rosterTemplateXlsx}
            </a>
            <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-700">
              {uploading ? t.wfm.rosterUploading : t.wfm.rosterUpload}
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                  event.target.value = '';
                }}
              />
            </label>
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">{t.wfm.agent}</th>
              {days.map((day) => (
                <th key={day.toISOString()} className="px-3 py-2 font-medium">
                  {format(day, 'EEE d')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((person) => (
              <tr key={person.id} className="border-b border-zinc-800/80">
                <td className="px-3 py-2.5 text-zinc-50">{person.fullName}</td>
                {days.map((day) => {
                  const ymd = format(day, 'yyyy-MM-dd');
                  const key = `${person.id}:${ymd}`;
                  const entry = key in localCells ? localCells[key] ?? undefined : byKey.get(key);
                  const saving = pendingKey === key;
                  return (
                    <td key={ymd} className="px-2 py-2">
                      {entry ? (
                        <button
                          type="button"
                          disabled={!canEdit || saving}
                          onClick={() => void assign(person.id, ymd, entry)}
                          className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-left text-xs text-zinc-200 hover:border-zinc-600 disabled:opacity-70"
                        >
                          {entry.templateName}
                          <span className="mt-0.5 block font-mono text-[10px] text-zinc-500">
                            {entry.startLocal && entry.endLocal
                              ? formatShiftHours(entry.startLocal, entry.endLocal)
                              : null}
                          </span>
                        </button>
                      ) : canEdit ? (
                        <button
                          type="button"
                          disabled={saving || !selected}
                          onClick={() => void assign(person.id, ymd)}
                          className="w-full rounded-md border border-dashed border-zinc-700 px-2 py-1 text-left text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-50"
                        >
                          {saving ? '…' : selected ? `+ ${selected.name}` : '+'}
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-700">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">
        {selfOnly ? t.wfm.myRosterHint : t.wfm.rosterHint} {canEdit ? t.wfm.rosterUploadHint : ''}
      </p>
    </div>
  );
}
