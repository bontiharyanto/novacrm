const DEFAULT_ACCENT = '#3b82f6';

export function accentCss(hex?: string | null) {
  const accent = parseAccent(hex);
  return `:root{--accent:${accent.hex};--accent-rgb:${accent.rgb};--accent-hover:${accent.hover}}`;
}

export function parseAccent(hex?: string | null) {
  const match = /^#([0-9a-fA-F]{6})$/.exec((hex ?? '').trim());
  const value = match?.[1] ?? DEFAULT_ACCENT.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const darken = (n: number) => Math.max(0, Math.round(n * 0.82));
  return {
    hex: `#${value.toLowerCase()}`,
    rgb: `${r} ${g} ${b}`,
    hover: `#${[darken(r), darken(g), darken(b)].map((n) => n.toString(16).padStart(2, '0')).join('')}`,
  };
}
