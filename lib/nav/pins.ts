export const NAV_PINS_COOKIE = 'novacrm_nav_pins';

export type NavPin = {
  href: string;
  labelKey: string;
};

export function parseNavPins(raw: string | null | undefined): NavPin[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as NavPin[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.href === 'string' && typeof item.labelKey === 'string')
      .slice(0, 12);
  } catch {
    return [];
  }
}

export function serializeNavPins(pins: NavPin[]) {
  return JSON.stringify(pins.slice(0, 12));
}
