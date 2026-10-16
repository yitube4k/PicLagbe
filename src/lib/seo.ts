import { useEffect } from 'react';

/**
 * V27 — per-page SEO meta (title/description/OG/Twitter/canonical).
 * SPA-র প্রতিটি রুট ও ফটোগ্রাফার প্রোফাইল Google-এ নিজস্ব title/description নিয়ে ইনডেক্স হয়।
 */

export const SITE_URL = 'https://photolagbe.pages.dev';
export const SITE_NAME_BN = 'ফটোলাগবে';
export const SITE_NAME_EN = 'PicLagbe';

/** og/twitter-এর ডিফল্ট শেয়ার ইমেজ — কক্সবাজারের সোনালি সূর্যাস্ত (Cloudinary) */
export const DEFAULT_OG_IMAGE =
  'https://res.cloudinary.com/yrxtdqyo/image/upload/v1792151872/scenic/golden-sunset.jpg';

export function absoluteUrl(path: string): string {
  // পূর্ণ URL (Cloudinary ইত্যাদি) হলে যেমন আছে তেমনই
  if (/^https?:\/\//i.test(path)) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`.replace(/([^:]\/)\/+/g, '$1');
}

interface PageMetaOpts {
  title: string;
  description?: string;
  image?: string;
  path?: string;
  type?: 'website' | 'profile';
}

export function usePageMeta(opts: PageMetaOpts): void {
  const { title, description, image, path, type } = opts;

  useEffect(() => {
    document.title = title;

    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    if (description) setMeta('name', 'description', description);

    const metaType = type || 'website';
    const url = absoluteUrl(path ?? window.location.pathname);
    const img = image ? absoluteUrl(image) : DEFAULT_OG_IMAGE;

    setMeta('property', 'og:title', title);
    if (description) setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', metaType);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', img);

    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', title);
    if (description) setMeta('name', 'twitter:description', description);
    if (image) setMeta('name', 'twitter:image', img);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [title, description, image, path, type]);
}
