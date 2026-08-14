export const IMPORT_KINDS = ['accounts', 'users', 'assets', 'cmdb', 'ip_segments', 'tickets'] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];

export type ImportRowError = { row: number; message: string };
export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: ImportRowError[];
};

export type ImportPreviewAction = 'create' | 'update' | 'error';

export type ImportPreviewRow = {
  row: number;
  action: ImportPreviewAction;
  values: Record<string, string>;
  message?: string;
};

export type ImportPreview = {
  total: number;
  createCount: number;
  updateCount: number;
  errorCount: number;
  canCommit: boolean;
  columns: string[];
  rows: ImportPreviewRow[];
};

export type ImportColumn = {
  key: string;
  required?: boolean;
  hint: string;
};

export type ImportEntity = {
  kind: ImportKind;
  title: string;
  titleId: string;
  recommended: boolean;
  when: string;
  whenId: string;
  uniqueKey: string;
  uniqueKeyId: string;
  href: string;
  columns: ImportColumn[];
  sample: Record<string, string>[];
};

export const IMPORT_SKIP = [
  {
    title: 'Workflows / Flow Designer',
    titleId: 'Workflow / Flow Designer',
    reason: 'Graphs and conditions belong in the editor, not a spreadsheet.',
    reasonId: 'Graf dan kondisi tetap di editor, bukan spreadsheet.',
  },
  {
    title: 'SLA policies',
    titleId: 'Kebijakan SLA',
    reason: 'A handful of rows. Safer to set in the SLA screen.',
    reasonId: 'Hanya beberapa baris. Lebih aman di layar SLA.',
  },
  {
    title: 'Catalog variable sets',
    titleId: 'Variable set katalog',
    reason: 'Nested options do not flatten cleanly to one sheet.',
    reasonId: 'Opsi bersarang tidak rata di satu sheet.',
  },
  {
    title: 'CMDB relations',
    titleId: 'Relasi CMDB',
    reason: 'Import CIs first, then draw relations in the graph.',
    reasonId: 'Impor CI dulu, lalu gambar relasi di graph.',
  },
] as const;

export const IMPORT_CATALOG: ImportEntity[] = [
  {
    kind: 'accounts',
    title: 'Accounts',
    titleId: 'Akun',
    recommended: true,
    when: 'Go-live customer list. Upsert by slug or code.',
    whenId: 'Daftar customer go-live. Upsert by slug atau code.',
    uniqueKey: 'code or slug',
    uniqueKeyId: 'code atau slug',
    href: '/accounts',
    columns: [
      { key: 'name', required: true, hint: 'Customer display name' },
      { key: 'code', hint: 'Short code, e.g. BNI' },
      { key: 'slug', hint: 'URL key; generated from name if empty' },
      { key: 'status', hint: 'active | paused | archived' },
    ],
    sample: [
      { name: 'Bank Nusantara', code: 'BNI', slug: 'bank-nusantara', status: 'active' },
      { name: 'Garuda Logistics', code: 'GRD', slug: 'garuda-logistics', status: 'active' },
    ],
  },
  {
    kind: 'users',
    title: 'Users',
    titleId: 'Pengguna',
    recommended: true,
    when: 'Staff and portal logins. New rows need a password. Existing email updates name and phone.',
    whenId: 'Login staf dan portal. Baris baru wajib password. Email yang sudah ada hanya update nama dan telepon.',
    uniqueKey: 'email',
    uniqueKeyId: 'email',
    href: '/users',
    columns: [
      { key: 'fullName', required: true, hint: 'Display name' },
      { key: 'email', required: true, hint: 'Login email' },
      { key: 'role', required: true, hint: 'superadmin | admin | manager | supervisor | team_lead | agent | customer' },
      { key: 'password', required: true, hint: 'Required for new users, min 8 chars' },
      { key: 'phone', hint: 'Optional' },
      { key: 'accountCode', hint: 'Account code or slug. Falls back to the active account.' },
    ],
    sample: [
      { fullName: 'Sari Agent', email: 'sari.agent@novacrm.app', role: 'agent', password: 'ChangeMe!2026', phone: '081200000001', accountCode: 'INT' },
      { fullName: 'Budi Portal', email: 'budi@banknusantara.id', role: 'customer', password: 'ChangeMe!2026', phone: '', accountCode: 'BNK' },
    ],
  },
  {
    kind: 'assets',
    title: 'Assets',
    titleId: 'Aset',
    recommended: true,
    when: 'Hardware inventory. Upsert by assetTag in the tenant.',
    whenId: 'Inventori hardware. Upsert by assetTag di tenant.',
    uniqueKey: 'assetTag',
    uniqueKeyId: 'assetTag',
    href: '/assets',
    columns: [
      { key: 'name', required: true, hint: 'Asset name' },
      { key: 'assetTag', required: true, hint: 'Unique tag, e.g. AST-1001' },
      { key: 'type', hint: 'laptop | server | network | printer | mobile | custom slug' },
      { key: 'status', hint: 'active | in_repair | retired | lost' },
      { key: 'brand', hint: 'Optional' },
      { key: 'model', hint: 'Optional' },
      { key: 'serial', hint: 'Optional' },
      { key: 'purchaseDate', hint: 'YYYY-MM-DD' },
      { key: 'warrantyExpiry', hint: 'YYYY-MM-DD' },
      { key: 'cost', hint: 'Number' },
      { key: 'location', hint: 'Optional' },
      { key: 'assignedTo', hint: 'Person or desk' },
      { key: 'accountCode', hint: 'Account code or slug. Falls back to the active account.' },
    ],
    sample: [
      {
        name: 'ThinkPad T14',
        assetTag: 'AST-2001',
        type: 'laptop',
        status: 'active',
        brand: 'Lenovo',
        model: 'T14',
        serial: 'PF0TEST1',
        purchaseDate: '2025-01-15',
        warrantyExpiry: '2028-01-15',
        cost: '18500000',
        location: 'Jakarta HQ',
        assignedTo: 'Sari Agent',
        accountCode: 'BNK',
      },
    ],
  },
  {
    kind: 'cmdb',
    title: 'CMDB CIs',
    titleId: 'CI CMDB',
    recommended: true,
    when: 'After assets. Upsert by name + type in the account. Link hardware with assetTag.',
    whenId: 'Setelah aset. Upsert by name + type di akun. Hubungkan hardware lewat assetTag.',
    uniqueKey: 'name + type + account',
    uniqueKeyId: 'name + type + akun',
    href: '/cmdb',
    columns: [
      { key: 'name', required: true, hint: 'CI name' },
      { key: 'type', required: true, hint: 'server | application | network | database | …' },
      { key: 'assetTag', hint: 'Existing asset tag to link' },
      { key: 'environment', hint: 'Stored in attributes.environment' },
      { key: 'owner', hint: 'Stored in attributes.owner' },
      { key: 'accountCode', hint: 'Account code or slug' },
    ],
    sample: [
      { name: 'core-switch-01', type: 'network', assetTag: '', environment: 'prod', owner: 'NetOps', accountCode: 'BNK' },
      { name: 'internet-banking', type: 'application', assetTag: '', environment: 'prod', owner: 'AppOps', accountCode: 'BNK' },
    ],
  },
  {
    kind: 'ip_segments',
    title: 'IP segments',
    titleId: 'Segmen IP',
    recommended: true,
    when: 'Network CIDR plan. Upsert by CIDR in the account. Optionally bind to a CI name.',
    whenId: 'Rencana CIDR. Upsert by CIDR di akun. Bisa diikat ke nama CI.',
    uniqueKey: 'cidr + account',
    uniqueKeyId: 'cidr + akun',
    href: '/cmdb',
    columns: [
      { key: 'cidr', required: true, hint: '10.20.2.0/24' },
      { key: 'name', hint: 'Label; defaults to CIDR' },
      { key: 'vlan', hint: '1–4094' },
      { key: 'gateway', hint: 'IPv4' },
      { key: 'purpose', hint: 'user | mgmt | voice | …' },
      { key: 'ciName', hint: 'Existing CI name to attach' },
      { key: 'accountCode', hint: 'Account code or slug' },
    ],
    sample: [
      { cidr: '10.20.2.0/24', name: 'BNI user VLAN', vlan: '20', gateway: '10.20.2.1', purpose: 'user', ciName: 'core-switch-01', accountCode: 'BNK' },
    ],
  },
  {
    kind: 'tickets',
    title: 'Tickets',
    titleId: 'Tiket',
    recommended: false,
    when: 'Cutover from another desk only. Creates new tickets. Does not send notifications.',
    whenId: 'Hanya cutover dari desk lama. Membuat tiket baru. Tidak mengirim notifikasi.',
    uniqueKey: 'insert only',
    uniqueKeyId: 'insert saja',
    href: '/tickets',
    columns: [
      { key: 'title', required: true, hint: 'Short title' },
      { key: 'type', hint: 'incident | problem | change | request' },
      { key: 'priority', hint: 'low | medium | high | critical' },
      { key: 'status', hint: 'open | in_progress | waiting | hold | resolved | closed' },
      { key: 'description', hint: 'Plain text' },
      { key: 'requesterName', hint: 'Defaults to Customer' },
      { key: 'requesterEmail', hint: 'Matched to a profile when present' },
      { key: 'assetTag', hint: 'Existing asset tag' },
      { key: 'accountCode', hint: 'Account code or slug' },
    ],
    sample: [
      {
        title: 'VPN timeout after hours',
        type: 'incident',
        priority: 'high',
        status: 'open',
        description: 'Users cannot stay on VPN after 18:00.',
        requesterName: 'Budi Portal',
        requesterEmail: 'budi@banknusantara.id',
        assetTag: 'AST-2001',
        accountCode: 'BNK',
      },
    ],
  },
];

export function getImportEntity(kind: string): ImportEntity | undefined {
  return IMPORT_CATALOG.find((item) => item.kind === kind);
}

export function isImportKind(value: string): value is ImportKind {
  return IMPORT_KINDS.includes(value as ImportKind);
}
