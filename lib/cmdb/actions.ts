export type CmdbItem = {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  assetId?: string;
  attributes: Record<string, string>;
  relations: Array<{ targetId: string; type: string }>;
  createdAt: string;
};

const cmdbItems = new Map<string, CmdbItem>();

export async function listCmdbItems() {
  return Array.from(cmdbItems.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createCmdbItem(input: unknown) {
  const payload = input as Partial<CmdbItem> & { name?: string; type?: string; assetId?: string };

  const item: CmdbItem = {
    id: `CMDB-${Date.now()}`,
    tenantId: 'demo-tenant',
    name: payload.name || 'New configuration item',
    type: payload.type || 'service',
    assetId: payload.assetId,
    attributes: payload.attributes || {},
    relations: payload.relations || [],
    createdAt: new Date().toISOString(),
  };

  cmdbItems.set(item.id, item);
  return { data: item, error: null };
}

export async function getCmdbById(itemId: string) {
  return cmdbItems.get(itemId) ?? null;
}
