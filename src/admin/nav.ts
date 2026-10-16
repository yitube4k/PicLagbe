import type { IconName } from './icons';

/* ═══ V18 Admin navigation config — Gemini 4 Argon spec ═══
   Mobile bottom nav 5 slots: dashboard / bookings / photographers / KYC / আরও
   More sheet 3×3: posts, requests, chats — users, reviews, categories — blog, audit, settings
   Desktop rail: 4 logical groups. */

export type AdminSlug =
  | 'dashboard' | 'notification' | 'user' | 'photographer' | 'post' | 'booking' | 'review'
  | 'blog' | 'category' | 'kyc' | 'requests' | 'chat' | 'audit' | 'settings';

export type BadgeKey = 'pendingPosts' | 'pendingKyc' | 'pendingRoleReq' | 'pendingPhotographers';

export interface AdminNavItem {
  slug: AdminSlug;
  label: string;
  sub: string;
  icon: IconName;
  badgeKey?: BadgeKey;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { slug: 'dashboard',    label: 'ওভারভিউ',      sub: 'পুরো সাইটের এক নজরে অবস্থা',            icon: 'dashboard' },
  { slug: 'notification', label: 'নোটিফিকেশন',   sub: 'সব গুরুত্বপূর্ণ ইভেন্টের লাইভ ফিড',      icon: 'bell' },
  { slug: 'booking',      label: 'বুকিং',        sub: 'সব বুকিং দেখা, স্ট্যাটাস ও এডিট',        icon: 'bookings' },
  { slug: 'photographer', label: 'ফটোগ্রাফার',    sub: 'অনুমোদন, ভেরিফিকেশন ও সম্পূর্ণ এডিট',   icon: 'camera', badgeKey: 'pendingPhotographers' },
  { slug: 'kyc',          label: 'KYC',          sub: 'পরিচয় যাচাই — অনুমোদন ও বাতিল',        icon: 'shield', badgeKey: 'pendingKyc' },
  { slug: 'post',         label: 'পোস্ট মডারেশন', sub: 'ফটোগ্রাফার পোস্ট অনুমোদন ও মুছে ফেলা',   icon: 'posts', badgeKey: 'pendingPosts' },
  { slug: 'requests',     label: 'রোল রিকোয়েস্ট', sub: 'ফটোগ্রাফার হওয়ার আবেদন অনুমোদন',      icon: 'requests', badgeKey: 'pendingRoleReq' },
  { slug: 'chat',         label: 'চ্যাট',         sub: 'সব কথোপকথন মনিটরিং',                  icon: 'chats' },
  { slug: 'user',         label: 'ইউজার',        sub: 'সব ইউজার এডিট, রোল ও ডিলিট',           icon: 'users' },
  { slug: 'review',       label: 'রিভিউ',        sub: 'রিভিউ মডারেশন ও ডিলিট',                icon: 'star' },
  { slug: 'category',     label: 'ক্যাটাগরি',     sub: 'সার্চ ক্যাটাগরি যোগ, নাম বদল ও ডিলিট',   icon: 'category' },
  { slug: 'blog',         label: 'ব্লগ',         sub: 'নতুন ব্লগ লেখা, এডিট ও প্রকাশ',         icon: 'blog' },
  { slug: 'audit',        label: 'অডিট রিপোর্ট',  sub: 'সব অ্যাডমিন অ্যাকশনের রেকর্ড ও রিপোর্ট', icon: 'audit' },
  { slug: 'settings',     label: 'সাইট সেটিংস',   sub: 'সাইট-লেভেল ফিচার চালু/বন্ধ',            icon: 'tune' },
];

export const ADMIN_NAV_BY_SLUG: Record<AdminSlug, AdminNavItem> = ADMIN_NAV.reduce(
  (acc, n) => ({ ...acc, [n.slug]: n }),
  {} as Record<AdminSlug, AdminNavItem>,
);

/* Desktop rail — Argon group order */
export const NAV_GROUPS: { title: string; slugs: AdminSlug[] }[] = [
  { title: 'কোর',                    slugs: ['dashboard', 'notification', 'booking'] },
  { title: 'ভেরিফিকেশন ও মডারেশন',   slugs: ['kyc', 'requests', 'post', 'review', 'chat'] },
  { title: 'ডিরেক্টরি ও কনটেন্ট',    slugs: ['photographer', 'user', 'category', 'blog'] },
  { title: 'সিস্টেম',                slugs: ['audit', 'settings'] },
];

/* Mobile bottom nav (4 + আরও) — Argon priority: Monitor → Revenue → Supply → Trust */
export const BOTTOM_SLUGS: AdminSlug[] = ['dashboard', 'booking', 'photographer', 'kyc'];
export const MORE_SHEET_SLUGS: AdminSlug[] = [
  'post', 'requests', 'chat',
  'user', 'review', 'category',
  'blog', 'audit', 'settings',
];

export const adminPath = (slug: AdminSlug) => `/admin/${slug}`;

export const ALL_SLUGS = ADMIN_NAV.map((n) => n.slug);

export function isAdminSlug(x: string): x is AdminSlug {
  return ALL_SLUGS.includes(x as AdminSlug);
}
