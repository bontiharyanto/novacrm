import { verifyWebhookSecret } from '@/lib/webhooks/verify';
import { getWebhookSecretFromDb } from '@/lib/settings/integrations';

export async function verifyInboundSecret(
  provided: string | null | undefined,
  envExpected: string | undefined,
  dbKind: 'alert' | 'email' | 'generic' | 'whatsapp' | 'telegram',
  tenantId?: string,
) {
  if (verifyWebhookSecret(provided, envExpected)) return true;
  const dbSecret = await getWebhookSecretFromDb(dbKind, tenantId);
  return verifyWebhookSecret(provided, dbSecret);
}
