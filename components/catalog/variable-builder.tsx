'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { CatalogVariable } from '@/lib/catalog/schema';

const TYPES: CatalogVariable['type'][] = ['text', 'textarea', 'select', 'checkbox'];

export function VariableBuilder({
  variables,
  onChange,
}: {
  variables: CatalogVariable[];
  onChange: (next: CatalogVariable[]) => void;
}) {
  function patch(index: number, data: Partial<CatalogVariable>) {
    onChange(variables.map((item, i) => (i === index ? { ...item, ...data } : item)));
  }

  function add() {
    const key = `field_${variables.length + 1}`;
    onChange([...variables, { key, label: 'New field', type: 'text', required: false }]);
  }

  return (
    <div className="space-y-3">
      {variables.length === 0 ? <p className="text-sm text-zinc-500">No variables yet.</p> : null}
      {variables.map((variable, index) => (
        <div key={`${variable.key}-${index}`} className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input value={variable.label} onChange={(event) => patch(index, { label: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Key</Label>
              <Input
                className="font-mono"
                value={variable.key}
                onChange={(event) => patch(index, { key: event.target.value.replace(/\s+/g, '_') })}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Select
              value={variable.type}
              onChange={(event) => patch(index, { type: event.target.value as CatalogVariable['type'] })}
            >
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={Boolean(variable.required)}
                onChange={(event) => patch(index, { required: event.target.checked })}
              />
              Required
            </label>
            <Button type="button" variant="ghost" onClick={() => onChange(variables.filter((_, i) => i !== index))}>
              Remove
            </Button>
          </div>
          {variable.type === 'select' ? (
            <Input
              placeholder="Options, comma separated"
              value={(variable.options ?? []).join(', ')}
              onChange={(event) =>
                patch(index, {
                  options: event.target.value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          ) : null}
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add}>
        Add variable
      </Button>
    </div>
  );
}
