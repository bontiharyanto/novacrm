'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { WfmNav } from '@/components/wfm/wfm-nav';
import { assignAgentSkill, createSkill, removeAgentSkill } from '@/lib/wfm/actions';
import type { WfmAgentSkill, WfmSkill } from '@/lib/wfm/schema';
import { useI18n } from '@/components/layout/preferences-provider';

export function WfmSkills({
  skills,
  agentSkills,
  staff,
  canEdit,
}: {
  skills: WfmSkill[];
  agentSkills: WfmAgentSkill[];
  staff: Array<{ id: string; fullName: string }>;
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [userId, setUserId] = useState(staff[0]?.id ?? '');
  const [skillId, setSkillId] = useState(skills[0]?.id ?? '');
  const [level, setLevel] = useState(3);

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6 p-6">
        <WfmNav />
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">{t.wfm.agent}</th>
                <th className="px-3 py-2 font-medium">{t.wfm.skill}</th>
                <th className="px-3 py-2 font-medium">{t.wfm.level}</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {agentSkills.map((row) => (
                <tr key={row.id} className="border-b border-zinc-800/80">
                  <td className="px-3 py-2.5 text-zinc-50">{row.userName}</td>
                  <td className="px-3 py-2.5 text-zinc-300">{row.skillName}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">{row.level}</td>
                  <td className="px-3 py-2.5 text-right">
                    {canEdit ? (
                      <button
                        type="button"
                        className="text-xs text-zinc-500 hover:text-rose-300"
                        onClick={() => void removeAgentSkill(row.id).then(() => router.refresh())}
                      >
                        {t.common.cancel}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {canEdit ? (
        <aside className="space-y-6 border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.wfm.newSkill}</p>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t.wfm.skill} />
            <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder={t.wfm.category} />
            <Button
              size="sm"
              onClick={() =>
                void createSkill({ name, category: category || undefined }).then(() => {
                  setName('');
                  router.refresh();
                })
              }
            >
              {t.common.save}
            </Button>
          </div>
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.wfm.assignSkill}</p>
            <Select value={userId} onChange={(event) => setUserId(event.target.value)}>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.fullName}
                </option>
              ))}
            </Select>
            <Select value={skillId} onChange={(event) => setSkillId(event.target.value)}>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </Select>
            <Select value={String(level)} onChange={(event) => setLevel(Number(event.target.value))}>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {t.wfm.level} {value}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void assignAgentSkill({ userId, skillId, level }).then(() => router.refresh())}
            >
              {t.common.save}
            </Button>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
