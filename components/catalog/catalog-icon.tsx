'use client';

import { CATALOG_ICONS } from '@/lib/catalog/schema';
import type { CatalogVariable } from '@/lib/catalog/schema';
import { AlertTriangle, ClipboardList, KeyRound, Laptop, LayoutGrid, Wifi } from 'lucide-react';

const ICONS = {
  clipboard: ClipboardList,
  laptop: Laptop,
  key: KeyRound,
  app: LayoutGrid,
  wifi: Wifi,
  alert: AlertTriangle,
};

export function CatalogIcon({ id, className = 'h-4 w-4' }: { id?: string; className?: string }) {
  const Icon = ICONS[(id as keyof typeof ICONS) ?? 'clipboard'] ?? ClipboardList;
  return <Icon className={className} />;
}

export { CATALOG_ICONS };
export type { CatalogVariable };
