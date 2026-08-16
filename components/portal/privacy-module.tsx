'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const PrivacyModuleContext = createContext(false);

export function PrivacyModuleProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return <PrivacyModuleContext.Provider value={enabled}>{children}</PrivacyModuleContext.Provider>;
}

export function usePrivacyEnabled() {
  return useContext(PrivacyModuleContext);
}

export function usePublicPrivacyEnabled() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void fetch('/api/governance/public')
      .then((response) => response.json())
      .then((payload) => {
        setEnabled(Boolean(payload.data?.enabled));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  return { enabled, ready };
}
