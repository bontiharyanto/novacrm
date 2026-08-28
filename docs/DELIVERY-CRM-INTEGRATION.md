# Delivery ↔ Work Order Management CRM

**Status:** generic adapter ready; provider-specific mapping remains outside
NovaCRM  
**Source of truth:** external CRM owns Closed Won, project, and commercial
Work Order lifecycle  
**Execution system:** NovaCRM owns ticket tasks, phase execution, activity,
and customer-safe progress

## Boundary

The customer portal does not create a delivery project. The external CRM or
internal DCO creates the project. NovaCRM receives the project, creates or
links execution work, and publishes approved progress to the customer portal.

```text
CRM Closed Won
    → signed project/work-order webhook
    → NovaCRM delivery_projects + delivery_phases
    → DCO creates Request / Work Order ticket
    → ticket_tasks + WBS dependencies + activities
    → customer-visible progress in /portal/projects
```

## Configure the integration

As admin/superadmin, open **Settings → Integrations** and configure the
**Work Order Management CRM** plugin:

- `baseUrl`: CRM API base URL;
- `webhookUrl`: optional NovaCRM-to-CRM outbound endpoint;
- `apiKey`: credential for outbound calls;
- `webhookSecret`: secret for inbound calls.

Use a secret of at least 16 characters. Do not put the secret in the URL or
commit it to Git.

## Inbound endpoint

```text
POST /api/v1/t/{tenantSlug}/integrations/work-order/{provider}/webhook
```

Headers:

```text
Content-Type: application/json
X-Webhook-Secret: <configured-secret>
```

The endpoint validates the tenant, provider, secret, payload, and idempotency
key before upserting records. Replaying the same `eventType:eventId` is safe
and returns a duplicate result.

## Payload contract

Minimum project payload:

```json
{
  "eventId": "crm-event-001",
  "eventType": "project.created",
  "project": {
    "externalId": "CRM-PROJECT-001",
    "accountExternalId": "CRM-ACCOUNT-001",
    "name": "Network rollout Jakarta",
    "status": "planned",
    "executionMode": "sequential",
    "plannedStart": "2026-09-01",
    "plannedEnd": "2026-10-15"
  },
  "phases": [
    {
      "key": "feasibility",
      "title": "Determine customer order feasibility (Survey)",
      "status": "completed",
      "sortOrder": 0,
      "customerVisible": true
    }
  ]
}
```

Optional Work Order:

```json
{
  "externalId": "CRM-WO-001",
  "number": "WO-0001",
  "title": "Network rollout Jakarta",
  "status": "open"
}
```

`accountExternalId` must already map to
`accounts.external_provider` + `accounts.external_id`, unless the payload
provides a valid internal `accountId`. Unknown account mappings are rejected
to prevent data landing in the wrong tenant/customer.

## Outbound event envelope

When NovaCRM creates a delivery request or changes a phase, the generic
adapter can send:

```json
{
  "eventId": "work_order.created:ticket-uuid",
  "eventType": "work_order.created",
  "projectId": "nova-project-uuid",
  "payload": {
    "ticketId": "ticket-uuid",
    "number": "REQ0000001",
    "title": "Install branch router"
  }
}
```

Outbound requests use `Authorization: Bearer <apiKey>` and
`X-Idempotency-Key`. Production outbound URLs must use HTTPS. Each attempt is
recorded in `integration_events` as `outbound`, `processed`, or `failed`.

## Failure handling

- Duplicate event: ignored safely.
- Invalid secret: `401`.
- Invalid payload or missing account mapping: `400`.
- CRM unavailable on outbound: recorded as `failed`; retry policy belongs in
  the queue/worker layer before production scale-up.
- Never expose `source_payload` or integration credentials to customer users.

## Security checklist

- [ ] Use a separate secret per tenant/provider.
- [ ] Use HTTPS for CRM callbacks and outbound URLs.
- [ ] Rotate API keys and webhook secrets.
- [ ] Map account IDs before enabling project sync.
- [ ] Restrict `customer_visible` to approved phase/activity content.
- [ ] Monitor `integration_events` for failed and repeated events.
- [ ] Test replay and out-of-order events in a staging tenant.
