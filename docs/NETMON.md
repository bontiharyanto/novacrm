# NETMON → NovaCRM

**NETMON** ([netmon.click](https://netmon.click)) is the NMS. **NovaCRM** is the operations desk. NETMON opens incidents here over the tenant **alert webhook**. There is no NovaCRM plugin named “NETMON” or “REST API”.

Lab tenant: `novacrm-demo`. Production NETMON: `https://demo.netmon.click` (and other `{slug}.netmon.click`).

## 1. Secret on NovaCRM

Admin only. **Settings → Integrations** (`/settings`).

1. Open the existing card **Other** (hint: alert / email / generic inbound).
2. Do **not** click **Tambah plugin**.
3. Set **Alert secret** yourself, random, **≥ 16 characters** (`openssl rand -hex 16`).
4. **Save**. Rejected: `change-me`, `local-alert-secret`, anything shorter than 16.

Keep the plaintext. NETMON encrypts it with its own `ENCRYPT_KEY`; a value copied from another NETMON database will not work.

## 2. Connector on NETMON

In NETMON: **Settings → Ticketing** → **Add NovaCRM** (new row). Do not rename **NETMON Helpdesk**.

| Field | Value |
| --- | --- |
| Base URL | `https://novacrm.click` |
| Tenant slug | this NovaCRM tenant (`novacrm-demo` in lab) |
| Alert webhook secret | the same Alert secret |

**Save**, then **Test connection**. “Tenant reachable” only means the slug exists. A wrong secret still looks reachable; ticket create then fails with `Unauthorized webhook`.

Enable the connector. Optional: auto-open on firing alerts.

## 3. What NETMON calls

```
POST https://novacrm.click/api/v1/t/{slug}/webhooks/alerts
```

Headers: `x-webhook-secret`, `X-Tenant-Id: {slug}` (`Authorization: Bearer` is also sent). Body includes `source: NETMON`, title, severity, host, fingerprint.

Repeat alerts within 24 hours update the **same** ticket.

Health (no secret required): `GET /api/v1/t/{slug}/health`.

## 4. Desk work

- New NETMON alerts appear as tickets (`INC…`) on the NovaCRM board.
- A reply from NETMON (**Tickets** → open the record → **Send response**) lands as a **comment** on that ticket. **Respond and resolve** also closes it.
- Agents work the ticket in NovaCRM as usual (assign, hold, escalate).

## 5. Optional: NovaCRM → NETMON

NETMON shows an **Inbound webhook** URL (`https://netmon.click/api/tickets/inbound/nm_…`). Paste it into a NovaCRM **workflow** webhook if comments made in NovaCRM must sync back.

`localhost` inbound URLs are not reachable from this cloud. Laptop NETMON can **create** tickets here; it cannot **receive** updates unless `APP_URL` is public.

## 6. Checklist

| Check | OK when |
| --- | --- |
| Alert secret ≥ 16 | Saved on **Other**, not a new plugin |
| NETMON connector | Provider label **NovaCRM**, not Helpdesk |
| Test + open ticket | NETMON ticket shows `INC…` and a link to `/tickets/{id}` |
| Reply | Comment visible on the NovaCRM ticket thread |
