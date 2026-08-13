import type { CatalogVariable } from '@/lib/catalog/schema';

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'item';
}

export function mergeVariables(setVars: CatalogVariable[] | undefined, itemVars: CatalogVariable[] | undefined) {
  const merged: CatalogVariable[] = [];
  const seen = new Set<string>();
  for (const variable of [...(setVars ?? []), ...(itemVars ?? [])]) {
    if (seen.has(variable.key)) continue;
    seen.add(variable.key);
    merged.push(variable);
  }
  return merged;
}

export function parseVariables(value: unknown): CatalogVariable[] {
  if (!Array.isArray(value)) return [];
  const result: CatalogVariable[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const key = String(row.key ?? '').trim();
    const label = String(row.label ?? '').trim();
    if (!key || !label) continue;
    const type =
      row.type === 'textarea' || row.type === 'select' || row.type === 'checkbox' ? row.type : 'text';
    const parsed: CatalogVariable = {
      key,
      label,
      type,
      required: Boolean(row.required),
    };
    if (Array.isArray(row.options)) {
      parsed.options = row.options.map((option) => String(option));
    }
    if (row.placeholder) {
      parsed.placeholder = String(row.placeholder);
    }
    result.push(parsed);
  }
  return result;
}

export function formatAnswers(variables: CatalogVariable[], answers: Record<string, unknown>) {
  return variables
    .map((variable) => {
      const raw = answers[variable.key];
      const value = raw === true ? 'Yes' : raw === false || raw == null || raw === '' ? '—' : String(raw);
      return `${variable.label}: ${value}`;
    })
    .join('\n');
}

export function missingRequired(variables: CatalogVariable[], answers: Record<string, unknown>) {
  return variables
    .filter((variable) => variable.required)
    .filter((variable) => {
      const value = answers[variable.key];
      if (variable.type === 'checkbox') return value !== true && value !== 'true';
      return value == null || String(value).trim() === '';
    })
    .map((variable) => variable.label);
}
