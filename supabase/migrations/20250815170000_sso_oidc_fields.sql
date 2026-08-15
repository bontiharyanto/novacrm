-- OIDC login policy on identity plugins: allowed email domains + default staff role.

update public.integration_plugins
set fields = coalesce(fields, '[]'::jsonb) ||
  '[{"key":"allowedDomains","label":"Allowed email domains","type":"text","placeholder":"bank.co.id, novacrm.app"},{"key":"defaultRole","label":"JIT role for those domains","type":"text","placeholder":"agent"}]'::jsonb
where slug in ('sso_google', 'sso_entra', 'sso_okta')
  and tenant_id is null
  and not exists (
    select 1
    from jsonb_array_elements(coalesce(fields, '[]'::jsonb)) item
    where item->>'key' = 'allowedDomains'
  );

notify pgrst, 'reload schema';
