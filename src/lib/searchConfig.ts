/**
 * Shared search config — Home hero form, Navbar search panel ও Search page
 * সব জায়গায় একই slug ব্যবহার করে (Search.tsx ফিল্টার `categories.slug`-এর সাথে মেলে)।
 */
export const SEARCH_CATEGORIES: { slug: string; label: string }[] = [
  { slug: 'wedding', label: 'বিয়ের ফটোগ্রাফি' },
  { slug: 'pre-wedding', label: 'প্রি-ওয়েডিং' },
  { slug: 'birthday', label: 'জন্মদিন' },
  { slug: 'event', label: 'ইভেন্ট' },
  { slug: 'portrait', label: 'পোর্ট্রেট' },
  { slug: 'fashion', label: 'ফ্যাশন' },
  { slug: 'product', label: 'প্রোডাক্ট' },
  { slug: 'travel', label: 'ট্রাভেল' },
  { slug: 'corporate', label: 'কর্পোরেট' },
  { slug: 'videography', label: 'ভিডিওগ্রাফি' },
];

export interface SearchFilters {
  q: string;
  spot: string;
  cat: string;
}

export function buildSearchPath(f: SearchFilters): string {
  const params = new URLSearchParams();
  if (f.q.trim()) params.set('q', f.q.trim());
  if (f.spot) params.set('spot', f.spot);
  if (f.cat) params.set('cat', f.cat);
  const qs = params.toString();
  return '/photographers' + (qs ? `?${qs}` : '');
}
