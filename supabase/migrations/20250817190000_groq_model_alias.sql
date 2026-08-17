-- Groq retired llama-3.1-8b-instant and llama-3.3-70b-versatile on 2026-08-16.
-- Rewrite stored AI configs so Test / Assistant keep working without a UI save.

update public.integrations
set config = jsonb_set(
  config,
  '{model}',
  to_jsonb(
    case config->>'model'
      when 'llama-3.1-8b-instant' then 'openai/gpt-oss-20b'
      when 'llama3-8b-8192' then 'openai/gpt-oss-20b'
      when 'llama-3.3-70b-versatile' then 'openai/gpt-oss-120b'
      when 'llama3-70b-8192' then 'openai/gpt-oss-120b'
      else coalesce(config->>'model', 'openai/gpt-oss-20b')
    end
  )
)
where kind = 'ai'
  and config->>'model' in (
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
    'llama3-8b-8192',
    'llama3-70b-8192'
  );

notify pgrst, 'reload schema';
