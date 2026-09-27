'use client';

import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { encodeAssetAssignee, parseAssetAssignee } from '@/lib/assets/assignee';

type GroupOption = { id: string; name: string };
type AgentOption = { id: string; fullName: string };

export function AssetAssigneeField({
  id = 'assignedTo',
  label = 'Assigned to',
  value,
  onChange,
  disabled,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const parsed = parseAssetAssignee(value);

  useEffect(() => {
    void Promise.all([
      fetch('/api/org/groups').then((response) => response.json()).catch(() => ({})),
      fetch('/api/agents').then((response) => response.json()).catch(() => ({})),
    ]).then(([groupPayload, agentPayload]) => {
      setGroups(Array.isArray(groupPayload.data) ? groupPayload.data : []);
      setAgents(Array.isArray(agentPayload.data) ? agentPayload.data : []);
    });
  }, []);

  const selected = useMemo(() => {
    if (!value) return '';
    if (parsed.kind && parsed.id) return encodeAssetAssignee(parsed.kind, parsed.id, parsed.label);
    return `custom:${value}`;
  }, [parsed.id, parsed.kind, parsed.label, value]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        value={selected}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value;
          if (!next || next === 'unassigned') {
            onChange('');
            return;
          }
          if (next.startsWith('custom:')) {
            onChange(next.slice(7));
            return;
          }
          onChange(next);
        }}
      >
        <option value="unassigned">Unassigned</option>
        {groups.length > 0 ? (
          <optgroup label="Groups">
            {groups.map((group) => (
              <option key={group.id} value={encodeAssetAssignee('group', group.id, group.name)}>
                {group.name}
              </option>
            ))}
          </optgroup>
        ) : null}
        {agents.length > 0 ? (
          <optgroup label="Agents">
            {agents.map((agent) => (
              <option key={agent.id} value={encodeAssetAssignee('agent', agent.id, agent.fullName)}>
                {agent.fullName}
              </option>
            ))}
          </optgroup>
        ) : null}
        {value && !parsed.kind ? <option value={`custom:${value}`}>{value}</option> : null}
      </Select>
      <p className="text-[11px] text-zinc-600">Pick an assignment group or an agent. Unassigned keeps the asset in pool.</p>
    </div>
  );
}
