export type DetailField = 'symptom' | 'location' | 'impact' | 'contact';

export type TicketDetails = {
  title: string;
  symptom: boolean;
  location: boolean;
  impact: boolean;
  contact: boolean;
};

export const SYMPTOM_CHIPS = [
  { id: 'vpn', label: 'VPN tidak connect', prompt: 'VPN tidak connect' },
  { id: 'wifi', label: 'WiFi lemah / putus', prompt: 'WiFi lemah atau sering putus' },
  { id: 'lan', label: 'LAN / switch down', prompt: 'LAN atau switch down' },
  { id: 'wan', label: 'Internet / WAN down', prompt: 'Internet atau WAN down' },
  { id: 'cctv', label: 'CCTV offline', prompt: 'CCTV offline atau tidak merekam' },
  { id: 'nvr', label: 'NVR tidak rekam', prompt: 'NVR atau DVR tidak merekam' },
  { id: 'app', label: 'Aplikasi error', prompt: 'Aplikasi error atau tidak bisa dibuka' },
  { id: 'db', label: 'Database down', prompt: 'Database tidak bisa diakses' },
  { id: 'email', label: 'Email tidak masuk', prompt: 'Email tidak masuk atau tidak terkirim' },
  { id: 'pc', label: 'PC / laptop mati', prompt: 'PC atau laptop tidak nyala' },
  { id: 'print', label: 'Printer error', prompt: 'Printer error atau tidak jalan' },
  { id: 'pwd', label: 'Lupa password', prompt: 'Lupa password atau akun terkunci' },
  { id: 'slow', label: 'Sistem lambat', prompt: 'Sistem atau jaringan lambat' },
  { id: 'access', label: 'Tidak bisa akses', prompt: 'Tidak bisa akses sistem atau folder' },
] as const;

const SYMPTOM_RE = new RegExp(
  [
    'masalah\\s*:',
    'gejala',
    'keluhan',
    'insiden',
    'incident',
    'gangguan',
    'trouble',
    '\\bissue\\b',
    '\\bproblem\\b',
    'rusak',
    'error',
    'gagal',
    'gak bisa',
    'ga bisa',
    'nggak bisa',
    'tidak bisa',
    'tidak mau',
    'tidak jalan',
    'tidak nyala',
    'tidak hidup',
    'tidak connect',
    'tidak terhubung',
    'tidak merekam',
    'tidak rekam',
    'tidak masuk',
    'tidak terkirim',
    'tidak keluar',
    'tidak muncul',
    'tidak terbuka',
    'tidak kebuka',
    'tidak merespon',
    'tidak merespons',
    'cannot connect',
    "can'?t connect",
    'unable to',
    'unavailable',
    'timeout',
    'time ?out',
    'down',
    'offline',
    'outage',
    'putus',
    'mati',
    'blank',
    'hitam',
    'blur',
    'buram',
    'pecah',
    'bergaris',
    'berbayang',
    'noise',
    'lag',
    'lambat',
    'lemot',
    'lelet',
    'slow',
    'hang',
    'freeze',
    'stuck',
    'crash',
    'bsod',
    'blue screen',
    'restart sendiri',
    'reboot',
    'overheat',
    'panas',
    'berisik',
    'install',
    'instal',
    'akses',
    'access',
    'denied',
    'ditolak',
    'terkunci',
    'locked',
    'lupa password',
    'reset password',
    'password',
    'otp',
    'mfa',
    'login',
    'sign ?in',
    'quality',
    'footage',
    'rekaman',
    'playback',
    'nvr',
    'dvr',
    'cctv',
    'kamera',
    'camera',
    'vpn',
    'wifi',
    'wi-?fi',
    'lan',
    'wan',
    'internet',
    'jaringan',
    'switch',
    'firewall',
    'printer',
    'print',
    'scanner',
    'laptop',
    'notebook',
    'pc\\b',
    'komputer',
    'monitor',
    'email',
    'outlook',
    'database',
    '\\bdb\\b',
    'sql',
    'aplikasi',
    '\\bapp\\b',
    'software',
    'lisensi',
    'license',
    'sertifikat',
    'certificate',
    '500\\b',
    '404\\b',
    '403\\b',
    'sinyal',
    'disconnect',
    'drop',
    'packet loss',
    'latency',
    'ping',
    'desktop',
    'handphone',
    '\\bhp\\b',
    'mouse',
    'keyboard',
    'proyektor',
    'projector',
    'absensi',
    'fingerprint',
    'telepon',
    'ip phone',
    'lisensi habis',
    'aktivasi',
  ].join('|'),
  'i',
);

const LOCATION_RE = new RegExp(
  [
    '\\blokasi\\b',
    'nama perangkat',
    'nama alat',
    'device name',
    '\\bperangkat\\b',
    '\\bdevice\\b',
    '\\bkamera\\b',
    '\\bcam\\b',
    'lantai',
    'lt\\.?\\s*\\d',
    'floor',
    'site',
    'kantor',
    'office',
    'gedung',
    'building',
    'ruang',
    'ruangan',
    'room',
    'lobby',
    'lobi',
    'parkir',
    'basement',
    'gudang',
    'warehouse',
    'cabang',
    'branch',
    'hq',
    'head ?office',
    'thamrin',
    'jakarta',
    'surabaya',
    'bandung',
    'medan',
    'semarang',
    'yogyakarta',
    'jogja',
    'denpasar',
    'bali',
    'makassar',
    'palembang',
    'balikpapan',
    'manado',
    'malang',
    'bogor',
    'depok',
    'tangerang',
    'bekasi',
    'batam',
    'padang',
    'pekanbaru',
    'banjarmasin',
    'pontianak',
    'datacenter',
    'data center',
    '\\bdc\\b',
    'rak',
    'rack',
    'pos\\b',
    'pintu',
    'gate',
    'area',
  ].join('|'),
  'i',
);

const IMPACT_RE = new RegExp(
  [
    '\\bterdampak\\b',
    'affected',
    '\\bimpact\\b',
    'pengguna',
    'user\\b',
    'users',
    'karyawan',
    'staff',
    'semua',
    'seluruh',
    'banyak',
    'beberapa',
    'satu orang',
    '1 orang',
    '\\d+\\s*(orang|user|pengguna|pc|unit|kamera|area)',
    'saya sendiri',
    'hanya saya',
    'tim\\b',
    'team',
    'divisi',
    'departemen',
    'dept',
    'security',
    'keamanan',
    'finance',
    'keuangan',
    'ops',
    'operation',
    'sales',
    'cs\\b',
    'area',
    'cabang',
    'pelindo',
    'perusahaan',
    'organisasi',
    'tenant',
  ].join('|'),
  'i',
);

const CONTACT_RE =
  /(kontak|hubungi|dihubungi|wa\b|whatsapp|telepon|telp|hp\b|ext\.?|08\d{7,}|\+62\d{7,}|62\d{8,}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;

const NEXT_FIELD = String.raw`(?=\s+(?:lokasi|terdampak|kontak|masalah|nomor|email|siapa|location|affected|contact|device)\b|$)`;

export const DETAIL_FIELD_LABELS: Record<'en' | 'id', Record<DetailField, string>> = {
  id: {
    symptom: 'Apa masalahnya',
    location: 'Lokasi / nama perangkat',
    impact: 'Siapa yang terdampak',
    contact: 'Nomor atau email yang bisa dihubungi',
  },
  en: {
    symptom: 'What is wrong',
    location: 'Location / device name',
    impact: 'Who is affected',
    contact: 'Phone or email to contact',
  },
};

export function buildDetailTemplate(missing: DetailField[], locale: 'en' | 'id' = 'id') {
  return missing.map((field) => `${DETAIL_FIELD_LABELS[locale][field]}: `).join('\n');
}

function labeledValue(text: string, labels: string) {
  const match = text.match(new RegExp(`(?:${labels})[^\\n:]{0,48}:[ \\t]*([^\\n]*)${NEXT_FIELD}`, 'i'));
  return match?.[1]?.replace(/[|/,-]+$/g, '').trim() ?? '';
}

function hasLabelColon(text: string, labels: string) {
  return new RegExp(`(?:${labels})[^\\n:]{0,48}:`, 'i').test(text);
}

function leftoverAfter(text: string, noise: RegExp) {
  return text
    .replace(noise, ' ')
    .replace(/\b(siapa|yang|nomor|atau|email|bisa|dihubungi|what|who|phone|contact)\b/gi, ' ')
    .replace(/[:/|,-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasLocation(text: string) {
  const labels = 'lokasi|nama perangkat|nama alat|location|device name|perangkat';
  if (hasLabelColon(text, labels)) return labeledValue(text, labels).length >= 2;
  if (LOCATION_RE.test(text) && leftoverAfter(text, /lokasi|nama|perangkat|alat|device|di/gi).length >= 2) return true;
  return LOCATION_RE.test(text) && !/^\s*(lokasi|nama perangkat|device)\s*$/i.test(text);
}

export function hasImpact(text: string) {
  const labels = 'terdampak|siapa yang terdampak|affected|impact';
  if (hasLabelColon(text, labels)) return labeledValue(text, labels).length >= 2;
  return IMPACT_RE.test(text);
}

export function hasContact(text: string) {
  const labels = 'kontak|nomor|email|hubungi|dihubungi|contact|phone|whatsapp|wa';
  if (hasLabelColon(text, labels)) return labeledValue(text, labels).length >= 3;
  return CONTACT_RE.test(text);
}

export function isDetailFollowUp(text: string) {
  return (
    /\b(lokasi|terdampak|kontak|nama perangkat|device|email|nomor|affected|contact|location)\b/i.test(text) ||
    hasLocation(text) ||
    hasImpact(text) ||
    hasContact(text)
  );
}

export function hasSymptom(text: string) {
  return SYMPTOM_RE.test(text);
}

export function inspectDetails(text: string): TicketDetails {
  const titleLine =
    text
      .split('\n')
      .map((line) => line.replace(/^masalah\s*:\s*/i, '').trim())
      .find(Boolean) ?? '';
  return {
    title: titleLine.slice(0, 200),
    symptom: hasSymptom(text),
    location: hasLocation(text),
    impact: hasImpact(text),
    contact: hasContact(text),
  };
}

export function missingDetails(text: string): DetailField[] {
  const found = inspectDetails(text);
  const missing: DetailField[] = [];
  if (!found.symptom) missing.push('symptom');
  if (!found.location) missing.push('location');
  if (!found.impact) missing.push('impact');
  if (!found.contact) missing.push('contact');
  return missing;
}

export function hasCompleteDetails(text: string) {
  return missingDetails(text).length === 0;
}

export function formatIssueFromForm(fields: {
  title: string;
  location: string;
  impact: string;
  contact: string;
  details: string;
}) {
  return [
    `Masalah: ${fields.title.trim()}`,
    `Lokasi: ${fields.location.trim()}`,
    `Terdampak: ${fields.impact.trim()}`,
    `Kontak: ${fields.contact.trim()}`,
    fields.details.trim() ? `Detail: ${fields.details.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
