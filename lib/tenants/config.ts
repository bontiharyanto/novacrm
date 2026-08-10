export type TenantConfig = {
  id: string;
  name: string;
  slug: string;
  accentColor: string;
  timezone: string;
  supportEmail: string;
  status: 'active' | 'paused' | 'archived';
};

const tenantStore = new Map<string, TenantConfig>([
  [
    'default',
    {
      id: 'default',
      name: 'NovaCRM Demo Tenant',
      slug: 'novacrm-demo',
      accentColor: '#3b82f6',
      timezone: 'Asia/Jakarta',
      supportEmail: 'support@novacrm.app',
      status: 'active',
    },
  ],
]);

export function getTenantConfig(tenantId = 'default') {
  return tenantStore.get(tenantId) ?? tenantStore.get('default');
}

export function upsertTenantConfig(input: Partial<TenantConfig> & { id?: string }) {
  const nextId = input.id ?? 'default';
  const current = tenantStore.get(nextId) ?? tenantStore.get('default');

  const next: TenantConfig = {
    id: nextId,
    name: input.name ?? current?.name ?? 'NovaCRM Tenant',
    slug: input.slug ?? current?.slug ?? 'novacrm',
    accentColor: input.accentColor ?? current?.accentColor ?? '#3b82f6',
    timezone: input.timezone ?? current?.timezone ?? 'UTC',
    supportEmail: input.supportEmail ?? current?.supportEmail ?? 'support@novacrm.app',
    status: input.status ?? current?.status ?? 'active',
  };

  tenantStore.set(nextId, next);
  return next;
}
