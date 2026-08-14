'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CatalogVariable } from '@/lib/catalog/schema';

export function CatalogVariableFields({
  variables,
  answers,
  onChange,
}: {
  variables: CatalogVariable[];
  answers: Record<string, string | boolean>;
  onChange: (next: Record<string, string | boolean>) => void;
}) {
  if (variables.length === 0) {
    return null;
  }

  function patch(key: string, value: string | boolean) {
    onChange({ ...answers, [key]: value });
  }

  return (
    <div className="mt-5 space-y-4 border-t border-zinc-800 pt-5">
      {variables.map((variable) => (
        <div key={variable.key} className="space-y-1.5">
          <Label htmlFor={`catalog-${variable.key}`}>
            {variable.label}
            {variable.required ? <span className="text-rose-400"> *</span> : null}
          </Label>
          {variable.type === 'textarea' ? (
            <Textarea
              id={`catalog-${variable.key}`}
              required={variable.required}
              value={String(answers[variable.key] ?? '')}
              onChange={(event) => patch(variable.key, event.target.value)}
            />
          ) : variable.type === 'select' ? (
            <Select
              id={`catalog-${variable.key}`}
              required={variable.required}
              value={String(answers[variable.key] ?? '')}
              onChange={(event) => patch(variable.key, event.target.value)}
            >
              <option value="">Select</option>
              {(variable.options ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          ) : variable.type === 'checkbox' ? (
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                id={`catalog-${variable.key}`}
                type="checkbox"
                checked={Boolean(answers[variable.key])}
                onChange={(event) => patch(variable.key, event.target.checked)}
              />
              Confirm
            </label>
          ) : (
            <Input
              id={`catalog-${variable.key}`}
              required={variable.required}
              placeholder={variable.placeholder}
              value={String(answers[variable.key] ?? '')}
              onChange={(event) => patch(variable.key, event.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
