/**
 * Cloudinary hosting helpers
 * ────────────────────────────
 * সব ফটো/ভিডিও Cloudinary-তে হোস্ট হবে — Supabase-এ শুধু URL (text) থাকে।
 * Delivery: f_auto (ব্রাউজার অনুযায়ী WebP/AVIF auto-convert) + q_auto (auto quality)
 *
 * Setup (.env):
 *   VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
 *   VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
 *
 * Cloudinary dashboard → Settings → Upload → Add upload preset →
 *   Signing mode: Unsigned  |  Enable "Auto-create folders" (optional)
 */

const CLOUD = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) || '';
const PRESET = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined) || '';

export function cldConfigured(): boolean {
  return Boolean(CLOUD && PRESET);
}

export interface CldTransform {
  w?: number;
  h?: number;
  c?: 'fill' | 'limit' | 'crop' | 'fit';
  q?: 'auto' | number;
  dpr?: 'auto' | number;
}

/**
 * Any Cloudinary URL → inject f_auto,q_auto (+ size) transforms.
 * Non-Cloudinary URLs (legacy Supabase/external) returned unchanged — safe.
 */
export function cldUrl(rawUrl: string | null | undefined, t: CldTransform = {}): string {
  if (!rawUrl) return '';
  if (!rawUrl.includes('res.cloudinary.com') && !rawUrl.includes('/image/upload/') && !rawUrl.includes('/video/upload/')) {
    return rawUrl;
  }
  // Already has /upload/…? split at the marker
  const marker = rawUrl.includes('/video/upload/') ? '/video/upload/' : '/image/upload/';
  const [base, rest] = rawUrl.split(marker);
  if (rest === undefined) return rawUrl;

  const parts: string[] = ['f_auto', `q_${t.q ?? 'auto'}`];
  if (t.dpr) parts.push(`dpr_${t.dpr}`);
  if (t.w) parts.push(`w_${t.w}`);
  if (t.h) parts.push(`h_${t.h}`);
  if (t.c) parts.push(`c_${t.c}`);

  // If rest starts with an existing transform chain (no slash), keep it after ours
  const chain = rest.startsWith('http') ? rest : rest;
  const sep = chain.startsWith('/') ? '' : '/';
  return `${base}${marker}${parts.join(',')}${sep}${chain}`;
}

/** Responsive srcSet for <img> (mobile bandwidth friendly) */
export function cldSrcSet(rawUrl: string | null | undefined, widths: number[] = [400, 800, 1200], t: CldTransform = {}): string {
  if (!rawUrl) return '';
  return widths
    .map((w) => `${cldUrl(rawUrl, { ...t, w, c: t.c || 'limit' })} ${w}w`)
    .join(', ');
}

export interface CldUploadResult {
  url: string;
  publicId: string;
  bytes: number;
  resourceType: 'image' | 'video';
}

const MAX_IMAGE_MB = 12;
const MAX_VIDEO_MB = 80;

/**
 * Unsigned direct upload to Cloudinary.
 * Returns secure_url which we store in Supabase text columns.
 */
export async function uploadToCloudinary(
  file: File,
  folder = 'piclagbe',
  onProgress?: (pct: number) => void
): Promise<CldUploadResult> {
  if (!cldConfigured()) {
    throw new Error(
      'Cloudinary কনফিগার করা হয়নি — .env ফাইলে VITE_CLOUDINARY_CLOUD_NAME ও VITE_CLOUDINARY_UPLOAD_PRESET সেট করুন।'
    );
  }

  const isVideo = file.type.startsWith('video/');
  const limitMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
  if (file.size > limitMb * 1024 * 1024) {
    throw new Error(`ফাইল খুব বড় — সর্বোচ্চ ${limitMb}MB আপলোড করা যায়।`);
  }
  if (!isVideo && !file.type.startsWith('image/')) {
    throw new Error('শুধু ছবি বা ভিডিও ফাইল আপলোড করা যাবে।');
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD}/${isVideo ? 'video' : 'image'}/upload`;

  const doFetch = async (withFolder: boolean) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', PRESET);
    if (withFolder) fd.append('folder', folder);

    // XHR (not fetch) so we can report upload progress to the UI
    if (onProgress) {
      return new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', endpoint);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          let json: any = {};
          try { json = JSON.parse(xhr.responseText); } catch { /* empty */ }
          if (xhr.status >= 400 || json.error) {
            reject(new Error(json?.error?.message || `আপলোড ব্যর্থ (${xhr.status})`));
          } else resolve(json);
        };
        xhr.onerror = () => reject(new Error('নেটওয়ার্ক সমস্যা — আপলোড ব্যর্থ'));
        xhr.send(fd);
      });
    }

    const res = await fetch(endpoint, { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok || json.error) {
      const msg: string = json?.error?.message || `আপলোড ব্যর্থ (${res.status})`;
      const err = new Error(msg) as Error & { json?: unknown; status?: number };
      err.json = json;
      err.status = res.status;
      throw err;
    }
    return json;
  };

  // Some presets disallow folder param — retry without it on that error
  let json: Awaited<ReturnType<typeof doFetch>>;
  try {
    json = await doFetch(true);
  } catch (e) {
    const msg = (e as Error).message || '';
    if (/folder/i.test(msg)) {
      json = await doFetch(false);
    } else {
      throw e;
    }
  }

  return {
    url: json.secure_url as string,
    publicId: json.public_id as string,
    bytes: Number(json.bytes || 0),
    resourceType: isVideo ? 'video' : 'image',
  };
}

/** WhatsApp deep-link helper: 01712… / 8801712… / +8801712… → wa.me/8801712… */
export function waLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = '880' + digits.slice(1);
  if (!digits.startsWith('880') && digits.length === 10) digits = '880' + digits;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
