-- SMTP relay card on Integrations (Mailpit, Google, Microsoft 365, corporate host).

insert into public.integration_plugins (
  tenant_id, slug, label, hint, category, ui_variant, fields, help_test, help_after, test_spec, sort_order, is_active
)
select * from (
  values
  (
    null::uuid,
    'smtp',
    'SMTP',
    'Relay / Mailpit / Google / Microsoft 365',
    'mail',
    'fields',
    '[
      {"key":"host","label":"Host","type":"text","required":true,"placeholder":"smtp.office365.com"},
      {"key":"port","label":"Port","type":"text","required":true,"placeholder":"587"},
      {"key":"encryption","label":"Encryption","type":"text","placeholder":"starttls, tls, or none"},
      {"key":"username","label":"Username","type":"text","placeholder":"Optional for Mailpit"},
      {"key":"password","label":"Password","type":"password","secret":true},
      {"key":"from","label":"From","type":"text","required":true,"placeholder":"NovaCRM <no-reply@company.com>"}
    ]'::jsonb,
    'Sends a test to your login email. Port 587 uses STARTTLS, 465 uses TLS. Mailpit on the laptop needs host 127.0.0.1 and port 54325, encryption none.',
    'Ticket email uses this relay when the Email (Resend) API key is empty. Save, then Test connection.',
    '{"kind":"builtin"}'::jsonb,
    42,
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
