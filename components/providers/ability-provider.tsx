'use client';

import { AbilityProvider as CaslAbilityProvider } from '@casl/react';
import { defineAbilityFor, type AppRole } from '@/lib/rbac/ability';

export function AbilityProvider({ role, children }: { role: AppRole; children: React.ReactNode }) {
  return <CaslAbilityProvider value={defineAbilityFor(role)}>{children}</CaslAbilityProvider>;
}
