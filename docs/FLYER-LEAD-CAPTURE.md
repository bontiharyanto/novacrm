# Flyer lead capture

The public flyer at `https://www.novacrm.click/` includes a bilingual discovery form at `#kontak`.

## Production configuration

Set these values in `.env.production`:

```dotenv
PUBLIC_LEAD_TENANT_ID=<tenant uuid used for sales leads>
LEAD_NOTIFICATION_EMAIL=sales@your-company.example
FLYER_PUBLIC_ORIGIN=https://www.novacrm.click
```

`WEBHOOK_TENANT_ID` is used as a compatibility fallback when `PUBLIC_LEAD_TENANT_ID` is not set. Set the dedicated variable in production so sales leads are not mixed with webhook/demo data.

## Data and protection

- The API is `POST /api/public/leads` on the application host.
- Flyer submissions are stored in `public.demo_leads`.
- The public flyer can insert only through the server API; anonymous reads are not allowed.
- Admin and manager users can read and update leads inside their tenant.
- Redis rate limiting allows five submissions per IP in ten minutes.
- A honeypot rejects automated submissions without exposing the result.
- Privacy consent is required; marketing consent is stored separately.
- UTM source, medium, and campaign values are retained for attribution.
- A notification email is sent to `LEAD_NOTIFICATION_EMAIL` after a successful insert.

Apply `20250831120000_demo_leads.sql` before testing the production form. The form uses the existing application host so the static flyer container does not need to process database requests.
