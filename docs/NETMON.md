# NETMON → NovaCRM

**NETMON** ([netmon.click](https://netmon.click)) is the NMS. **NovaCRM** is the operations desk.

Lab tenant: `novacrm-demo`. Production NETMON: `https://demo.netmon.click` (and other `{slug}.netmon.click`).

There is no NovaCRM plugin named “NETMON” or “REST API”. Both tickets and CMDB reuse the **Alert secret** on the **Other** integrations card.

## 1. Secret on NovaCRM

Admin only. **Settings → Integrations** (`/settings`).

1. Open the existing card **Other** (hint: alert / email / generic inbound).
2. Do **not** click **Tambah plugin**.
3. Set **Alert secret** yourself, random, **≥ 16 characters** (`openssl rand -hex 16`).
4. **Save**. Rejected: `change-me`, `local-alert-secret`, anything shorter than 16.

Keep the plaintext. NETMON encrypts it with its own `ENCRYPT_KEY`; a value copied from another NETMON database will not work.

## 2. Connector on NETMON

In NETMON: **Settings → Ticketing** → **Add NovaCRM**.

| Field | Value |
| --- | --- |
| Base URL | `https://novacrm.click` |
| Tenant slug | NovaCRM tenant (`novacrm-demo` in lab) |
| Alert webhook secret | The same Alert secret |
| Sync CMDB | On (default). CI create/update in NETMON upserts asset + CI here |
| NovaCRM account UUID | Optional. Empty = Internal account |

Enable the connector, **Save**, then **Test connection**.

## 3. Tickets (alerts)

`POST /api/v1/t/{slug}/webhooks/alerts`

Headers: `x-webhook-secret`, `X-Tenant-Id: {slug}`.

Repeat alerts within 24 hours update the same ticket (`fingerprint`).

## 4. CMDB (assets + CI)

`POST /api/v1/t/{slug}/webhooks/cmdb`

Same headers and Alert secret as tickets. Does **not** open a ticket.

NETMON is the source of truth for this path (outbound only). Payload:

```json
{
  "source": "NETMON",
  "op": "upsert",
  "fingerprint": "netmon:{netmonTenantId}:{ciId}",
  "accountId": null,
  "ci": {
    "id": "clxxxxxxxx",
    "name": "Core switch HQ",
    "type": "hardware",
    "assetTag": "SW-HQ-01",
    "serial": "SN123",
    "location": "Jakarta",
    "owner": "NOC",
    "status": "in_service"
  },
  "device": { "hostname": "sw-hq-01", "ip": "10.1.1.1" }
}
```

| `op` | Effect |
| --- | --- |
| `ping` | Auth check. No write. |
| `upsert` | Create or update an **asset** and a linked **CI**. Idempotent on `fingerprint`. |
| `retire` | Set the asset `retired`. Keep the CI so ticket history stays. |

Default account is the tenant **Internal** account. Status map: `in_service` → `active`, `maintenance` → `in_repair`, `retired` / delete in NETMON → `retired`, `outage` → `active` plus a note.

Response: `{ "data": { "assetId", "ciId", "assetTag" }, "error": null }`.

## Laptop vs cloud

| From | To | Result |
| --- | --- | --- |
| NETMON `localhost:3000` | NovaCRM cloud | Ticket and CMDB push **work** |
| NETMON `https://demo.netmon.click` | NovaCRM cloud | Works after the secret is saved on the VPS |
| NovaCRM cloud | NETMON `localhost` inbound URL | Does not work |
