'use client';

import { useMemo, useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { WfmNav } from '@/components/wfm/wfm-nav';
import { deleteRosterEntry, upsertRosterEntry } from '@/lib/wfm/actions';
import type { WfmRosterEntry, WfmShiftTemplate } from '@/lib/wfm/schema';
import { useI18n } from '@/components/layout/preferences-provider';
import { useRouter } from 'next/navigation';

type Staff = { id: string; fullName: string };
type Group = { id: string; name: string };

export function WfmRoster({
  entries,
  templates,
  groups,
  staff,
  canEdit,
}: {
  entries: WfmRosterEntry[];
  templates: WfmShiftTemplate[];
  groups: Group[];
  staff: Staff[];
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const filtered = useMemo(
    () => (groupId ? entries.filter((entry) => entry.groupId === groupId) : entries),
    [entries, groupId],
  );
  const byKey = useMemo(() => {
    const map = new Map<string, WfmRosterEntry>();
    for (const entry of filtered) map.set(`${entry.userId}:${entry.workDate}`, entry);
    return map;
  }, [filtered]);
  const members = useMemo(() => {
    const ids = new Set(filtered.map((entry) => entry.userId));
    const listed = staff.filter((person) => ids.has(person.id));
    return listed.length > 0 ? listed : staff;
  }, [filtered, staff]);

  async function assign(userId: string, workDate: string) {
    if (!groupId || !templateId) return;
    await upsertRosterEntry({ userId, groupId, workDate, templateId, source: 'override' });
    router.refresh();
  }

  return (
    <div className="space-y-6 p-6">
      <WfmNav />
      <div className="flex flex-wrap gap-2">
        <Select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="max-w-xs">
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
        {canEdit ? (
          <Select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="max-w-xs">
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} {template.startLocal}-{template.endLocal}
              </option>
            ))}
          </Select>
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
                  const entry = byKey.get(`${person.id}:${ymd}`);
                  return (
                    <td key={ymd} className="px-2 py-2">
                      {entry ? (
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => void deleteRosterEntry(entry.id).then(() => router.refresh())}
                          className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-left text-xs text-zinc-200 hover:border-zinc-600 disabled:opacity-70"
                        >
                          {entry.templateName}
                          <span className="mt-0.5 block font-mono text-[10px] text-zinc-500">
                            {entry.startLocal}-{entry.endLocal}
                          </span>
                        </button>
                      ) : canEdit ? (
                        <Button size="sm" variant="ghost" className="w-full" onClick={() => void assign(person.id, ymd)}>
                          +
                        </Button>
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
      <p className="text-xs text-zinc-500">{t.wfm.rosterHint}</p>
    </div>
  );
}
