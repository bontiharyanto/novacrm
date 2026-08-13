export function maskSecret(value?: string | null) {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return `••••${value.slice(-4)}`;
}

export function isMaskedSecret(value?: string | null) {
  if (!value) return true;
  return value.includes('•') || value.includes('*');
}
