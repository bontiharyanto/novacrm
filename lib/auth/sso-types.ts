export type SsoOauthProvider = 'google' | 'azure' | `custom:${string}`;

export type SsoProviderOption = {
  kind: string;
  label: string;
  provider: SsoOauthProvider | null;
  mode?: 'oauth' | 'saml';
  ready: boolean;
  hint?: string;
  tenantSlug?: string;
};
