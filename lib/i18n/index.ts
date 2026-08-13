import { en, type Dictionary } from '@/lib/i18n/en';
import { id } from '@/lib/i18n/id';
import type { Locale } from '@/lib/preferences';

export type { Dictionary };

export function getDictionary(locale: Locale): Dictionary {
  return locale === 'en' ? en : id;
}
