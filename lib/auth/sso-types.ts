export type SsoOauthProvider = 'google' | 'azure' | `custom:${string}`;

export type SsoProviderOption = {
  kind: string;
  label: string;
  provider: SsoOauthProvider | null;
  ready: boolean;
  hint?: string;
  tenantSlug?: string;
};
