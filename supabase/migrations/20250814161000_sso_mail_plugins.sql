-- Identity (SSO) + mail plugins. Catalog-driven cards; no UI hardcode.

alter table public.integration_plugins drop constraint if exists integration_plugins_category_check;
alter table public.integration_plugins
  add constraint integration_plugins_category_check
  check (category in ('builtin', 'chat', 'itsm', 'crm', 'identity', 'mail', 'other'));

insert into public.integration_plugins (
  tenant_id, slug, label, hint, category, ui_variant, fields, help_test, help_after, test_spec, sort_order, is_active
)
select * from (
  values
  (
    null::uuid,
    'gmail',
    'Gmail',
    'Google Workspace · mail',
    'mail',
    'fields',
    '[{"key":"clientId","label":"Client ID","type":"text","required":true},{"key":"clientSecret","label":"Client secret","type":"password","secret":true,"required":true},{"key":"accessToken","label":"Access token","type":"password","secret":true,"required":true,"placeholder":"ya29..."}]'::jsonb,
    'Calls Gmail users.me.profile with the OAuth access token (scope gmail.readonly or gmail.send).',
    'Use this for inbound mailbox watch and outbound ticket mail from a Google Workspace inbox.',
    '{"kind":"http","url":"https://gmail.googleapis.com/gmail/v1/users/me/profile","method":"GET","auth":{"type":"bearer","tokenField":"accessToken"}}'::jsonb,
    45,
    true
  ),
  (
    null,
    'exchange',
    'Exchange',
    'Microsoft 365 · Outlook',
    'mail',
    'fields',
    '[{"key":"tenantId","label":"Directory (tenant) ID","type":"text","required":true},{"key":"clientId","label":"Application (client) ID","type":"text","required":true},{"key":"clientSecret","label":"Client secret","type":"password","secret":true,"required":true},{"key":"accessToken","label":"Access token","type":"password","secret":true,"required":true}]'::jsonb,
    'Calls Microsoft Graph /me/mailFolders with the access token. App registration needs Mail.Read or Mail.Send.',
    'Connect Exchange Online to send and ingest mailbox messages for the service desk.',
    '{"kind":"http","url":"https://graph.microsoft.com/v1.0/me/mailFolders","method":"GET","auth":{"type":"bearer","tokenField":"accessToken"}}'::jsonb,
    46,
    true
  ),
  (
    null,
    'sso_entra',
    'SSO · Entra ID',
    'Microsoft Entra ID / Azure AD',
    'identity',
    'fields',
    '[{"key":"tenantId","label":"Directory (tenant) ID","type":"text","required":true,"placeholder":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"},{"key":"clientId","label":"Application (client) ID","type":"text","required":true},{"key":"clientSecret","label":"Client secret","type":"password","secret":true,"required":true},{"key":"accessToken","label":"Access token","type":"password","secret":true,"required":true}]'::jsonb,
    'Calls Graph /organization with the access token from an Entra app (openid + Organization.Read.All).',
    'Staff can sign in with Microsoft after the OIDC client is trusted. Map groups to NovaCRM roles separately.',
    '{"kind":"http","url":"https://graph.microsoft.com/v1.0/organization","method":"GET","auth":{"type":"bearer","tokenField":"accessToken"}}'::jsonb,
    72,
    true
  ),
  (
    null,
    'sso_google',
    'SSO · Google',
    'Google Workspace OIDC',
    'identity',
    'fields',
    '[{"key":"clientId","label":"Client ID","type":"text","required":true,"placeholder":"....apps.googleusercontent.com"},{"key":"clientSecret","label":"Client secret","type":"password","secret":true,"required":true},{"key":"accessToken","label":"Access token","type":"password","secret":true,"required":true}]'::jsonb,
    'Calls Google userinfo with the OAuth access token from an OIDC Web client.',
    'Enable Google sign-in for staff on this tenant. Keep Gmail as a separate mail plugin.',
    '{"kind":"http","url":"https://openidconnect.googleapis.com/v1/userinfo","method":"GET","auth":{"type":"bearer","tokenField":"accessToken"}}'::jsonb,
    73,
    true
  ),
  (
    null,
    'sso_okta',
    'SSO · Okta',
    'OIDC / API token',
    'identity',
    'fields',
    '[{"key":"baseUrl","label":"Okta domain","type":"url","required":true,"placeholder":"https://your-org.okta.com"},{"key":"clientId","label":"OIDC client ID","type":"text"},{"key":"clientSecret","label":"OIDC client secret","type":"password","secret":true},{"key":"apiToken","label":"API token","type":"password","secret":true,"required":true}]'::jsonb,
    'Calls /api/v1/org with an Okta SSWS API token from Security → API.',
    'Use OIDC for staff login. The API token is only for the connection test and directory sync later.',
    '{"kind":"http","url":"{{baseUrl}}/api/v1/org","method":"GET","auth":{"type":"ssws","tokenField":"apiToken"}}'::jsonb,
    74,
    true
  ),
  (
    null,
    'sso_saml',
    'SSO · SAML',
    'SAML 2.0 IdP',
    'identity',
    'fields',
    '[{"key":"idpEntityId","label":"IdP entity ID","type":"text","required":true},{"key":"ssoUrl","label":"SSO URL","type":"url","required":true,"placeholder":"https://idp.example.com/sso"},{"key":"metadataUrl","label":"Metadata URL","type":"url","placeholder":"https://idp.example.com/metadata"},{"key":"certificate","label":"IdP signing cert (PEM)","type":"textarea","secret":true}]'::jsonb,
    'Saves IdP entity ID, SSO URL, and cert. If Metadata URL is set, Test fetches the XML over HTTPS.',
    'Map NameID / email to profiles. Role claims stay in NovaCRM RBAC. ACS path: /api/auth/saml/acs.',
    '{"kind":"http","url":"{{metadataUrl}}","method":"GET"}'::jsonb,
    75,
    true
  ),
  (
    null,
    'teams',
    'Microsoft Teams',
    'Graph · channel notify',
    'chat',
    'fields',
    '[{"key":"tenantId","label":"Directory (tenant) ID","type":"text","required":true},{"key":"clientId","label":"Application (client) ID","type":"text","required":true},{"key":"clientSecret","label":"Client secret","type":"password","secret":true,"required":true},{"key":"accessToken","label":"Access token","type":"password","secret":true,"required":true},{"key":"teamId","label":"Team ID","type":"text"},{"key":"channelId","label":"Channel ID","type":"text"}]'::jsonb,
    'Calls Graph /me with the access token. Channel ID is optional until you send ticket alerts.',
    'Post SLA and assignment notices into a Teams channel from workflow actions.',
    '{"kind":"http","url":"https://graph.microsoft.com/v1.0/me","method":"GET","auth":{"type":"bearer","tokenField":"accessToken"}}'::jsonb,
    82,
    true
  )
) as seed(
  tenant_id, slug, label, hint, category, ui_variant, fields, help_test, help_after, test_spec, sort_order, is_active
)
where not exists (
  select 1 from public.integration_plugins existing
  where existing.slug = seed.slug and existing.tenant_id is null
);

notify pgrst, 'reload schema';
