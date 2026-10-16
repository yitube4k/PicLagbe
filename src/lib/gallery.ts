import { PortfolioImage } from './types';

/* ═══ V24 — ফটোগ্রাফার গ্যালারি (ছবি + ভিডিও) শেয়ার্ড হেল্পার ═══
   portfolio_images টেবিলই গ্যালারির ডেটা সোর্স — মিডিয়ার ধরন (ছবি/ভিডিও)
   Cloudinary URL থেকে ডিটেক্ট হয় (/video/upload/), তাই নতুন কোনো
   ডেটাবেস কলাম বা মাইগ্রেশন লাগে না। */

export type GalleryMedia = PortfolioImage & { isVideo: boolean };

/** ভিডিও সর্বোচ্চ সাইজ (MB) — ইউজারের রুল: max 50MB */
export const GALLERY_VIDEO_MAX_MB = 50;
/** ছবি সর্বোচ্চ সাইজ (MB) */
export const GALLERY_IMAGE_MAX_MB = 12;
/** ছবি সফট-লিমিট (কমপক্ষে ৬টি উৎসাহিত, সর্বোচ্চ ১২) */
export const GALLERY_MAX_PHOTOS = 12;
/** ভিডিও সর্বোচ্চ সংখ্যা */
export const GALLERY_MAX_VIDEOS = 2;

/** Cloudinary ভিডিও URL ডিটেক্ট (/video/upload/ বা ভিডিও এক্সটেনশন) */
export function isVideoUrl(url: string): boolean {
  return /\/video\/upload\//.test(url) || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

/** লিগ্যাসি "video: " / "demo: " প্রিফিক্স ক্যাপশন থেকে সরাও */
export function galleryCaption(caption?: string | null): string {
  return (caption || '').replace(/^(video|demo):\s*/i, '').trim();
}

/** গ্যালারি আইটেমগুলোতে isVideo ফ্ল্যাগ যোগ করে দেয় */
export function withVideoFlag(items: (PortfolioImage | null | undefined)[] | null): GalleryMedia[] {
  return (items || []).filter(Boolean).map((it) => {
    const img = it as PortfolioImage;
    return { ...img, isVideo: isVideoUrl(img.url || '') };
  });
}

/** ছবি ও ভিডিও আলাদা গোনা */
export function galleryCounts(items: GalleryMedia[]): { photos: number; videos: number } {
  const videos = items.filter((i) => i.isVideo).length;
  return { photos: items.length - videos, videos };
}
