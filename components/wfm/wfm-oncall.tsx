'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { WfmNav } from '@/components/wfm/wfm-nav';
import { createOncallRotation, createOncallSlot } from '@/lib/wfm/actions';
import type { WfmOncallRotation } from '@/lib/wfm/schema';
import { formatRelativeId } from '@/lib/utils/dates';
import { useI18n } from '@/components/layout/preferences-provider';

export function WfmOncall({
  rotations,
  groups,
  staff,
  canEdit,
}: {
  rotations: WfmOncallRotation[];
  groups: Array<{ id: string; name: string; kind: string }>;
  staff: Array<{ id: string; fullName: string }>;
  canEdit: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const oncallGroups = groups.filter((group) => group.kind === 'oncall');
  const [groupId, setGroupId] = useState(oncallGroups[0]?.id ?? groups[0]?.id ?? '');
  const [name, setName] = useState('Weekly');
  const [rotationId, setRotationId] = useState(rotations[0]?.id ?? '');
  const [primaryUserId, setPrimaryUserId] = useState(staff[0]?.id ?? '');
  const [backupUserId, setBackupUserId] = useState(staff[1]?.id ?? '');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6 p-6">
        <WfmNav />
        {rotations.map((rotation) => (
          <section key={rotation.id} className="overflow-hidden rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-50">{rotation.name}</p>
                <p className="text-xs text-zinc-500">{rotation.groupName}</p>
              </div>
              <Badge tone="info">{rotation.cadenceHours}h</Badge>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{t.wfm.window}</th>
                  <th className="px-3 py-2 font-medium">{t.wfm.primary}</th>
                  <th className="px-3 py-2 font-medium">{t.wfm.backup}</th>
                </tr>
              </thead>
              <tbody>
                {rotation.slots.map((slot) => (
                  <tr key={slot.id} className="border-b border-zinc-800/80">
                    <td className="px-3 py-2.5 text-zinc-300">
                      {formatRelativeId(slot.startsAt, locale)} → {formatRelativeId(slot.endsAt, locale)}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-50">{slot.primaryName}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{slot.backupName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        {rotations.length === 0 ? (
          <p className="rounded-xl border border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">{t.wfm.emptyOncall}</p>
        ) : null}
      </div>
      {canEdit ? (
        <aside className="space-y-6 border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.wfm.newRotation}</p>
            <Select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              {(oncallGroups.length ? oncallGroups : groups).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
            <Button
              size="sm"
              onClick={() => void createOncallRotation({ groupId, name, cadenceHours: 168 }).then(() => router.refresh())}
            >
              {t.common.save}
            </Button>
          </div>
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.wfm.newSlot}</p>
            <Select value={rotationId} onChange={(event) => setRotationId(event.target.value)}>
              {rotations.map((rotation) => (
                <option key={rotation.id} value={rotation.id}>
                  {rotation.name}
                </option>
              ))}
            </Select>
            <Input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
            <Input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
            <Select value={primaryUserId} onChange={(event) => setPrimaryUserId(event.target.value)}>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName}
                </option>
              ))}
            </Select>
            <Select value={backupUserId} onChange={(event) => setBackupUserId(event.target.value)}>
              <option value="">{t.wfm.backup}</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void createOncallSlot({
                  rotationId,
                  startsAt: new Date(startsAt).toISOString(),
                  endsAt: new Date(endsAt).toISOString(),
                  primaryUserId,
                  backupUserId: backupUserId || undefined,
                }).then(() => router.refresh())
              }
            >
              {t.common.save}
            </Button>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
