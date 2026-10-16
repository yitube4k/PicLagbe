/**
 * V30 — প্যাকেজ প্রাইসিং হেল্পার
 * pricing_unit: 'event' = মোট প্যাকেজ দাম, 'hour' = প্রতি ঘণ্টা, 'photo' = প্রতি ছবি।
 * সব ডিসপ্লে/বুকিং/SEO এক জায়গা থেকে একক বুঝে দাম দেখায়।
 */
import { Package, PricingUnit } from './types';
import { toBn } from './utils';

export const UNIT_LABEL: Record<PricingUnit, string> = {
  event: 'মোট প্যাকেজ',
  hour: 'প্রতি ঘণ্টা',
  photo: 'প্রতি ছবি',
};

/** দামের পাশের ছোট সাফিক্স: '/ঘণ্টা' | '/ছবি' | '' */
export function unitSuffix(unit?: PricingUnit | null): string {
  if (unit === 'hour') return '/ঘণ্টা';
  if (unit === 'photo') return '/ছবি';
  return '';
}

/** প্রাইস লাইন: "৳১,৫০০/ঘণ্টা" | "৳১০০/ছবি" | "৳৫,০০০" */
export function priceLine(pkg: Pick<Package, 'price' | 'pricing_unit'>): string {
  const base = `৳${Number(pkg.price || 0).toLocaleString('en-IN')}`;
  return base + unitSuffix(pkg.pricing_unit);
}

/** অন্তর্ভুক্ত ছবি লেবেল: "১০ ছবি অন্তর্ভুক্ত" | '' */
export function photoCountLine(pkg: Pick<Package, 'photo_count' | 'pricing_unit'>): string {
  if (pkg.photo_count && pkg.photo_count > 0 && pkg.pricing_unit !== 'photo') {
    return `${toBn(pkg.photo_count)} ছবি অন্তর্ভুক্ত`;
  }
  return '';
}

/** বুকিংয়ের ডিফল্ট কোয়ান্টিটি (ঘণ্টা বা ছবি) */
export function defaultQty(pkg: Pick<Package, 'pricing_unit' | 'duration_hours' | 'photo_count'>): number {
  if (pkg.pricing_unit === 'hour') return pkg.duration_hours || 2;
  if (pkg.pricing_unit === 'photo') return pkg.photo_count || 10;
  return 1;
}

/** কোয়ান্টিটির সর্বোচ্চ সীমা */
export function qtyMax(pkg: Pick<Package, 'pricing_unit'>): number {
  if (pkg.pricing_unit === 'hour') return 12;
  if (pkg.pricing_unit === 'photo') return 100;
  return 1;
}

/** কোয়ান্টিটি লেবেল: "২ ঘণ্টা" | "১০ ছবি" | '' */
export function qtyLabel(pkg: Pick<Package, 'pricing_unit'>, qty: number): string {
  if (pkg.pricing_unit === 'hour') return `${toBn(qty)} ঘণ্টা`;
  if (pkg.pricing_unit === 'photo') return `${toBn(qty)} ছবি`;
  return '';
}

/** বুকিংয়ের মোট: event = price, hour/photo = price × qty */
export function bookingTotal(pkg: Pick<Package, 'price' | 'pricing_unit'>, qty: number): number {
  const p = Number(pkg.price) || 0;
  if (pkg.pricing_unit === 'hour' || pkg.pricing_unit === 'photo') return p * Math.max(1, qty);
  return p;
}

/**
 * "শুরু ৳X" এর জন্য নরমালাইজড শুরু-দাম (এক এককের দামকে বাস্তব সেশন-দামে আনে):
 * hour ×২ (সর্বনিম্ন ২ ঘণ্টা সেশন ধরে), photo ×১০ (সর্বনিম্ন ১০ ছবি ধরে), event = দাম।
 */
export function effectiveFromPrice(pkg: Pick<Package, 'price' | 'pricing_unit'>): number {
  const p = Number(pkg.price) || 0;
  if (pkg.pricing_unit === 'hour') return p * 2;
  if (pkg.pricing_unit === 'photo') return p * 10;
  return p;
}

/** ফটোগ্রাফারের সব প্যাকেজ থেকে সবচেয়ে কম বাস্তব শুরু-দাম */
export function photographerFromPrice(packages: Package[]): number | null {
  if (!packages.length) return null;
  return Math.min(...packages.map(effectiveFromPrice));
}
