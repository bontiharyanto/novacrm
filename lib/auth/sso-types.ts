export type SsoProviderOption = {
  kind: string;
  label: string;
  provider: 'google' | 'azure' | null;
  ready: boolean;
  hint?: string;
};
