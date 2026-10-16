/**
 * কক্সবাজারের সিনিক (দৃশ্যমান) ছবি — সমুদ্র, পাহাড়, টেকনাফ, নৌকা, ঢেউ, আকাশ।
 * Cloudinary-তে হোস্টেড (piclagbe/scenic ফোল্ডার) — ডেলিভারিতে f_auto,q_auto (cldUrl)।
 * হোম হিরো স্লাইডার + ফটো গ্যালারি এখান থেকে আসে — স্পট-নির্দিষ্ট ছবি নয়।
 */
import { cldUrl } from './cloudinary';

const U = 'https://res.cloudinary.com/yrxtdqyo/image/upload';

/** হিরো স্লাইডার — ৮টি ল্যান্ডস্কেপ শট (অর্ডার = স্লাইড অর্ডার) */
export const HERO_SCENIC: string[] = [
  `${U}/v1792151860/scenic/sunset-silhouette.jpg`,   // সূর্যাস্ত সিলুয়েট (ছাতা মানুষ)
  `${U}/v1792151866/scenic/ocean-horizon.jpg`,      // সমুদ্র-আকাশ দিগন্ত
  `${U}/v1792151862/scenic/moon-boat.jpg`,          // চাঁদ-নৌকা (কক্সবাজার আইকন)
  `${U}/v1792151864/scenic/green-hills.jpg`,        // সবুজ পাহাড় (কুয়াশা)
  `${U}/v1792151858/scenic/sea-sunrise.jpg`,        // ভোরের সমুদ্র
  `${U}/v1792151868/scenic/cox-beach.jpg`,          // কক্সবাজার সৈকত (ঝাউবন)
  `${U}/v1792151871/scenic/fishing-boats.jpg`,      // মাছধরা নৌকা
  `${U}/v1792151872/scenic/golden-sunset.jpg`,      // সোনালি সূর্যাস্ত
];

/** ফটো গ্যালারি — হিরোতে নেই এমন ১০টি শট (portrait: লম্বাটাইল) */
export const GALLERY_SCENIC: { key: string; url: string; portrait: boolean; cap: string }[] = [
  { key: 'blue-water', url: `${U}/v1792151874/scenic/blue-water.jpg`, portrait: false, cap: 'নীল জল' },
  { key: 'longtail-boat', url: `${U}/v1792151878/scenic/longtail-boat.jpg`, portrait: true, cap: 'লংটেইল নৌকা' },
  { key: 'calm-horizon', url: `${U}/v1792151890/scenic/calm-horizon.jpg`, portrait: false, cap: 'শান্ত দিগন্ত' },
  { key: 'sunset-reflection', url: `${U}/v1792151880/scenic/sunset-reflection.jpg`, portrait: true, cap: 'সূর্যাস্তের প্রতিফলন' },
  { key: 'coast-aerial', url: `${U}/v1792151888/scenic/coast-aerial.jpg`, portrait: false, cap: 'উপকূল (এরিয়াল)' },
  { key: 'wave-sunset', url: `${U}/v1792151882/scenic/wave-sunset.jpg`, portrait: true, cap: 'ঢেউ ও সূর্যাস্ত' },
  { key: 'aerial-coast', url: `${U}/v1792151876/scenic/aerial-coast.jpg`, portrait: false, cap: 'নদীর মোহনা' },
  { key: 'wave-rocks', url: `${U}/v1792151884/scenic/wave-rocks.jpg`, portrait: true, cap: 'পাথরে ঢেউ' },
  { key: 'sky-clouds-sea', url: `${U}/v1792151886/scenic/sky-clouds-sea.jpg`, portrait: false, cap: 'আকাশ ও সমুদ্র' },
  { key: 'beach-people', url: `${U}/v1792151892/scenic/beach-people.jpg`, portrait: false, cap: 'সৈকতের সন্ধ্যা' },
];

/** সিনিক ছবির ট্রান্সফর্মড ডেলিভারি URL */
export function scenicUrl(rawUrl: string, w: number, h?: number): string {
  return cldUrl(rawUrl, { w, h, c: 'fill' });
}
