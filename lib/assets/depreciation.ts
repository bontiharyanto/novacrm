import { differenceInCalendarDays, differenceInCalendarMonths, parseISO } from 'date-fns';
import type { AssetRecord } from '@/lib/assets/schema';

export type WarrantyLevel = 'ok' | 'soon' | 'expired' | 'none';

export function getWarrantyLevel(expiry?: string): WarrantyLevel {
  if (!expiry) return 'none';
  const days = differenceInCalendarDays(parseISO(expiry), new Date());
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
}

export function getWarrantyLabel(expiry?: string) {
  const level = getWarrantyLevel(expiry);
  if (level === 'none') return 'No warranty';
  const days = differenceInCalendarDays(parseISO(expiry!), new Date());
  if (level === 'expired') return `Expired ${Math.abs(days)}d`;
  if (level === 'soon') return `${days}d left`;
  return `${days}d`;
}

export function getBookValue(asset: Pick<AssetRecord, 'cost' | 'purchaseDate' | 'usefulLifeMonths' | 'residualValue' | 'status'>) {
  const cost = asset.cost ?? 0;
  const residual = asset.residualValue ?? 0;
  if (!cost || !asset.purchaseDate) {
    return { bookValue: cost, depreciated: 0, percent: 0 };
  }
  if (asset.status === 'lost' || asset.status === 'retired') {
    return { bookValue: residual, depreciated: Math.max(0, cost - residual), percent: cost ? 100 : 0 };
  }
  const elapsed = Math.max(0, differenceInCalendarMonths(new Date(), parseISO(asset.purchaseDate)));
  const life = Math.max(1, asset.usefulLifeMonths || 36);
  const ratio = Math.min(1, elapsed / life);
  const depreciated = (cost - residual) * ratio;
  const bookValue = Math.max(residual, cost - depreciated);
  return {
    bookValue: Math.round(bookValue),
    depreciated: Math.round(depreciated),
    percent: Math.round(ratio * 100),
  };
}

export function formatIdr(value?: number) {
  if (value == null) return '—';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}
