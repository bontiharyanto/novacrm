export type AssetAssigneeKind = 'group' | 'agent';

export function encodeAssetAssignee(kind: AssetAssigneeKind, id: string, label: string) {
  return `${kind}:${id}:${label}`.slice(0, 120);
}

export function parseAssetAssignee(value?: string | null) {
  if (!value?.trim()) {
    return { kind: null as AssetAssigneeKind | null, id: '', label: '' };
  }
  const match = value.trim().match(/^(group|agent):([^:]+):(.+)$/);
  if (match) {
    return {
      kind: match[1] as AssetAssigneeKind,
      id: match[2],
      label: match[3],
    };
  }
  return { kind: null as AssetAssigneeKind | null, id: '', label: value.trim() };
}

export function formatAssetAssignee(value?: string | null, empty = 'Unassigned') {
  const parsed = parseAssetAssignee(value);
  if (!parsed.label) return empty;
  if (parsed.kind === 'group') return `Group · ${parsed.label}`;
  if (parsed.kind === 'agent') return `Agent · ${parsed.label}`;
  return parsed.label;
}
