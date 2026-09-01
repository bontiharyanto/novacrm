'use client';

import { useCallback, useEffect, useState } from 'react';
import { PortalMajorBanner } from '@/components/portal/portal-major-banner';
import type { AffectingMajor } from '@/lib/tickets/major-impact';

export function useAffectingMajors(location?: string, accountId?: string) {
  const [majors, setMajors] = useState<AffectingMajor[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    const needle = location?.trim();
    if (needle) params.set('location', needle);
    if (accountId) params.set('accountId', accountId);
    const query = params.toString();
    const response = await fetch(`/api/majors/affecting-me${query ? `?${query}` : ''}`);
    const payload = await response.json().catch(() => ({ data: [] }));
    setMajors(payload.data ?? []);
    setLoading(false);
  }, [location, accountId]);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => void load(), location?.trim() ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [load, location]);

  return { majors, loading };
}

export function PortalMajorAlert({
  location,
  accountId,
  selectable,
  selectedId,
  onSelect,
}: {
  location?: string;
  accountId?: string;
  selectable?: boolean;
  selectedId?: string;
  onSelect?: (majorId: string | null) => void;
}) {
  const { majors, loading } = useAffectingMajors(location, accountId);
  if (loading || majors.length === 0) return null;
  return (
    <PortalMajorBanner
      majors={majors}
      variant={location?.trim() || accountId ? 'create' : 'home'}
      selectable={selectable}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}
