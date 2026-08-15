'use client';

import { useEffect } from 'react';
import { parseAccent } from '@/lib/tenants/accent';

export function AccentProvider({ color }: { color?: string | null }) {
  useEffect(() => {
    const accent = parseAccent(color);
    const root = document.documentElement;
    root.style.setProperty('--accent', accent.hex);
    root.style.setProperty('--accent-rgb', accent.rgb);
    root.style.setProperty('--accent-hover', accent.hover);
  }, [color]);

  return null;
}
