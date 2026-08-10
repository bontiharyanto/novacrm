export type AssetRecord = {
  id: string;
  tenantId: string;
  name: string;
  assetTag: string;
  type: 'laptop' | 'server' | 'network' | 'printer' | 'mobile';
  brand?: string;
  model?: string;
  serial?: string;
  purchaseDate?: string;
  cost?: number;
  status: 'active' | 'in_repair' | 'retired' | 'lost';
  location?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
};

const assets = new Map<string, AssetRecord>();

export async function listAssets() {
  return Array.from(assets.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createAsset(input: unknown) {
  const payload = input as Partial<AssetRecord> & {
    name?: string;
    type?: AssetRecord['type'];
    status?: AssetRecord['status'];
    assignedTo?: string;
    location?: string;
    notes?: string;
  };

  const name = payload.name?.trim() || 'Untitled asset';
  const assetType = payload.type || 'laptop';
  const status = payload.status || 'active';
  const assetTag = `AST-${Date.now().toString().slice(-6)}`;

  const record: AssetRecord = {
    id: `AST-${Date.now()}`,
    tenantId: 'demo-tenant',
    name,
    assetTag,
    type: assetType,
    brand: payload.brand,
    model: payload.model,
    serial: payload.serial,
    purchaseDate: payload.purchaseDate,
    cost: payload.cost,
    status,
    location: payload.location,
    assignedTo: payload.assignedTo,
    notes: payload.notes,
    createdAt: new Date().toISOString(),
  };

  assets.set(record.id, record);
  return { data: record, error: null };
}

export async function getAssetById(assetId: string) {
  return assets.get(assetId) ?? null;
}
