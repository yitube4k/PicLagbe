import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Photographer, Package, Post, PortfolioImage } from '../lib/types';
import { GalleryMedia, galleryCaption, withVideoFlag } from '../lib/gallery';
import { toBn, taka } from '../lib/utils';
import { unitSuffix, priceLine, photoCountLine, photographerFromPrice } from '../lib/pricing';
import { SPOT_BY_KEY } from '../lib/constants';
import { waLink, cldUrl } from '../lib/cloudinary';
import BookingForm from '../components/BookingForm';
import MediaReviews from '../components/MediaReviews';
import PostCard from '../components/PostCard';
import { videoThumb } from '../components/PackageEditDialog';
import { GalleryViewer, ViewerItem } from '../components/GalleryViewer';
import { usePageMeta, useJsonLd } from '../lib/seo';
import { effectiveFromPrice } from '../lib/pricing';

/* ── Small presentational helpers ─────────────────────────────── */

function VerifiedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-[#fbbf24]/35 bg-[#fbbf24]/12 px-2.5 py-0.5 text-[12.5px] font-bold text-[#fbbf24]"
      title="KYC-ভেরিফায়েড ফটোগ্রাফার"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
      ভেরিফায়েড
    </span>
  );
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={s <= Math.round(value) ? '#fbbf24' : 'none'}
          stroke="#fbbf24"
          strokeWidth="1.8"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

function StatBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-white/[0.045] px-3 py-3 text-center">
      <div className="pf-serif text-lg font-bold text-[#f3ede0] leading-tight">{value}</div>
      <div className="text-[12.5px] font-semibold text-[#a89d88] mt-0.5">{label}</div>
      {sub && <div className="text-[11.5px] text-[#8d8471]">{sub}</div>}
    </div>
  );
}

/* ── WhatsApp নম্বর কার্ড — বুকিংয়ের আগেই সরাসরি নম্বর দেখা যায়, ক্লিকে WhatsApp অ্যাপ ── */
function WhatsAppContactCard({ number, waHref }: { number: string; waHref: string }) {
  const telHref = `tel:${number.replace(/[^\d+]/g, '')}`;
  return (
    <section
      className="rounded-[18px] border-2 border-[#25d366]/30 bg-gradient-to-br from-[rgba(37,211,102,0.12)] via-[rgba(37,211,102,0.06)] to-transparent p-5"
      aria-label="সরাসরি WhatsApp যোগাযোগ"
    >
      <div className="flex items-start gap-3.5">
        <div
          className="w-12 h-12 rounded-[14px] bg-[#25d366] grid place-items-center shrink-0 text-white"
          style={{ boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)' }}
          aria-hidden="true"
        >
          <WhatsAppIcon size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="pf-serif font-bold text-[#f3ede0] text-[16.5px] leading-tight">WhatsApp-এ সরাসরি কথা বলুন</h2>
          <p className="text-[13.5px] text-[#a89d88] mt-1 leading-relaxed">বুকিংয়ের আগেই দাম ও সময় জেনে নিন — ক্লিক করলেই WhatsApp অ্যাপ খুলবে</p>
          <p
            dir="ltr"
            className="pf-serif text-[22px] font-bold text-[#4ade80] mt-2 tracking-wide select-all leading-none"
          >
            {number}
          </p>
          <div className="flex flex-wrap gap-2 mt-3.5">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[12px] bg-[#25d366] hover:bg-[#1fb857] text-[#06240f] px-4 py-2.5 text-sm font-bold transition-colors"
            >
              <WhatsAppIcon /> মেসেজ করুন
            </a>
            <a
              href={telHref}
              className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#25d366]/40 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-[#4ade80] hover:bg-[rgba(37,211,102,0.14)] transition-colors"
            >
              📞 কল করুন
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

/* ── V24 — পাবলিক ফটো গ্যালারি (হোম-স্টাইল: হরাইজন্টাল স্ন্যাপ-স্ট্রিপ + দৃশ্যমান prev/next, লাইট থিম) ── */
function GalleryNavBtn({ dir, enabled, onClick }: { dir: 'L' | 'R'; enabled: boolean; onClick: (d: 'L' | 'R') => void }) {
  return (
    <button
      type="button"
      onClick={() => enabled && onClick(dir)}
      aria-label={dir === 'L' ? 'আগের ছবি' : 'পরের ছবি'}
      disabled={!enabled}
      className={`grid size-11 place-items-center rounded-full bg-[#12141d] border border-white/12 text-[#f3ede0] shadow-sm transition-all duration-200 ${
        enabled ? 'hover:bg-[rgba(251,191,36,0.14)] hover:border-[rgba(251,191,36,0.4)] active:scale-90' : 'opacity-40 cursor-default'
      }`}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dir === 'L' ? (
          <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>
        ) : (
          <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>
        )}
      </svg>
    </button>
  );
}

function ProfileGallery({ items, onOpen }: { items: GalleryMedia[]; onOpen: (m: GalleryMedia, i: number) => void }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(true);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanL(el.scrollLeft > 4);
    setCanR(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update]);

  const go = (dir: 'L' | 'R') => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'L' ? -el.clientWidth * 0.8 : el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const photos = items.filter((i) => !i.isVideo).length;
  const videos = items.length - photos;

  return (
    <section className="pf-card p-5 md:p-6" aria-labelledby="pf-gallery-h">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h2 id="pf-gallery-h" className="pf-serif text-lg font-bold text-[#f3ede0]">ফটো গ্যালারি</h2>
          <p className="text-sm text-[#a89d88] mt-0.5">
            আমার ক্যামেরায় কক্সবাজার — ছবি {toBn(photos)}{videos > 0 ? ` · ভিডিও ${toBn(videos)}` : ''}
          </p>
        </div>
        {/* ডেস্কটপ: শিরোনামের পাশেই দৃশ্যমান prev/next */}
        <div className="hidden sm:flex items-center gap-2.5 shrink-0">
          <GalleryNavBtn dir="L" enabled={canL} onClick={go} />
          <GalleryNavBtn dir="R" enabled={canR} onClick={go} />
        </div>
      </div>

      <div
        ref={trackRef}
        className="no-scrollbar flex gap-3.5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1"
      >
        {items.map((m, i) => {
          const cap = galleryCaption(m.caption);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onOpen(m, i)}
              className="relative shrink-0 snap-start w-[240px] h-[180px] sm:w-[300px] sm:h-[212px] rounded-2xl overflow-hidden border border-white/[0.12] bg-white/[0.05] group/tile text-left"
              aria-label={`${cap || 'গ্যালারি'} ${toBn(i + 1)} — বড় করে দেখুন`}
            >
              <img
                src={m.isVideo ? videoThumb(m.url) : cldUrl(m.url, { w: 640, c: 'fill' })}
                alt={cap || `গ্যালারি ${toBn(i + 1)}`}
                loading={i < 3 ? 'eager' : 'lazy'}
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover/tile:scale-[1.05]"
              />
              {m.isVideo && (
                <span className="absolute inset-0 grid place-items-center pointer-events-none">
                  <span className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm grid place-items-center text-white ring-2 ring-white/40">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                </span>
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />
              {m.isVideo && (
                <span className="absolute top-2.5 left-2.5 rounded-full bg-[#fbbf24]/90 text-[#2a1508] text-[10.5px] font-extrabold px-2 py-0.5">▶ ভিডিও</span>
              )}
              {cap && (
                <span className="absolute bottom-2.5 left-2.5 right-2.5">
                  <span className="inline-block max-w-full truncate rounded-full bg-black/45 backdrop-blur-sm text-white text-[11.5px] font-semibold px-2.5 py-1">
                    {cap}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* মোবাইল: স্ট্রিপের নিচে দৃশ্যমান prev/next */}
      <div className="sm:hidden flex justify-center gap-3 mt-4">
        <GalleryNavBtn dir="L" enabled={canL} onClick={go} />
        <GalleryNavBtn dir="R" enabled={canR} onClick={go} />
      </div>
    </section>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

// ── V27 region start — slug/UUID দুই মোডেই প্রোফাইল (SEO: /photographer/<slug> Google-ইনডেক্সেবল)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PhotographerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, profile } = useAuth();

  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [completedCount, setCompletedCount] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bookPkgId, setBookPkgId] = useState<string>('');
  const [chatStarting, setChatStarting] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [coverBroken, setCoverBroken] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [gallery, setGallery] = useState<GalleryMedia[]>([]); // V24 portfolio_images (ছবি+ভিডিও)
  // V25 — ডেডিকেটেড ফুল-স্ক্রিন গ্যালারি ভিউয়ার (গ্যালারি + প্যাকেজ নমুনা — পোর্টাল, হেডারের উপরে)
  const [viewer, setViewer] = useState<{ items: ViewerItem[]; index: number } | null>(null);

  const viewCountedRef = useRef(false);

  // V27 — প্রতি-পেজ SEO মেটা (টাইটেল/ডেসক্রিপশন/OG — Google ও AI-সার্চে প্রোফাইল আসার জন্য)
  usePageMeta({
    title: photographer
      ? `${photographer.display_name} — কক্সবাজার ফটোগ্রাফার | ফটোলাগবে PicLagbe`
      : 'ফটোগ্রাফার প্রোফাইল | ফটোলাগবে PicLagbe',
    description: photographer
      ? `${photographer.display_name} — কক্সবাজারের ভেরিফায়েড ফটোগ্রাফার। ${photographer.full_location || 'কক্সবাজার'}। প্যাকেজ দেখুন, পোর্টফোলিও দেখুন, অগ্রিম ছাড়াই বুকিং দিন — ফটোলাগবে।`
      : undefined,
    image: photographer?.cover_photo_url || photographer?.profile_photo_url || undefined,
    path: `/photographer/${photographer?.slug || photographer?.id || id || ''}`,
    type: 'profile',
  });

  /* V30 — প্রতি-ফটোগ্রাফার স্ট্রাকচার্ড ডেটা: Google rich results (দাম, রেটিং, ঠিকানা) */
  useJsonLd('photographer-profile', (() => {
    if (!photographer) return null;
    const eff = packages.map(effectiveFromPrice).filter((n) => n > 0);
    const priceMin = eff.length ? Math.min(...eff) : Number(photographer.starting_price || 0);
    const priceMax = eff.length ? Math.max(...eff) : priceMin;
    const profileUrl = `https://photolagbe.pages.dev/photographer/${photographer.slug || photographer.id}`;
    const img = photographer.cover_photo_url || photographer.profile_photo_url;
    const rating = Number(photographer.rating_count || 0) > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: Number(photographer.rating_avg || 0).toFixed(1),
          reviewCount: Number(photographer.rating_count),
        }
      : undefined;
    return {
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      '@id': `${profileUrl}#photographer`,
      name: photographer.display_name,
      description: photographer.bio?.slice(0, 300) || `${photographer.display_name} — কক্সবাজারের ভেরিফায়েড প্রফেশনাল ফটোগ্রাফার, ফটোলাগবে-তে বুক করুন।`,
      url: profileUrl,
      image: img || undefined,
      telephone: photographer.phone || undefined,
      priceRange: `৳${priceMin.toLocaleString('en-IN')} - ৳${priceMax.toLocaleString('en-IN')}`,
      currenciesAccepted: 'BDT',
      address: {
        '@type': 'PostalAddress',
        addressLocality: photographer.full_location || 'Cox\'s Bazar',
        addressRegion: 'Chattogram Division',
        addressCountry: 'BD',
      },
      areaServed: 'Cox\'s Bazar, Bangladesh',
      aggregateRating: rating,
      hasOfferCatalog: packages.length
        ? {
            '@type': 'OfferCatalog',
            name: `${photographer.display_name} প্যাকেজসমূহ`,
            itemListElement: packages.slice(0, 6).map((pkg) => ({
              '@type': 'Offer',
              name: pkg.name,
              price: Number(pkg.price),
              priceCurrency: 'BDT',
              description: [priceLine(pkg), pkg.description].filter(Boolean).join(' — '),
              url: profileUrl,
            })),
          }
        : undefined,
    };
  })());

  const loadProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadFailed(false);

    try {
      // V27 — UUID হলে id কলামে, নাহলে slug কলামে (স্যানিটাইজড) লুকআপ
      let queryCol: 'id' | 'slug' = 'id';
      let queryVal = id;
      if (!UUID_RE.test(id)) {
        const trimmed = id.trim();
        if (!/^[a-z0-9_-]{1,80}$/i.test(trimmed)) {
          setPhotographer(null);
          setLoadFailed(true);
          setPackages([]);
          setGallery([]);
          setLoading(false);
          return;
        }
        queryCol = 'slug';
        queryVal = trimmed;
      }

      const photoRes = await supabase
        .from('photographers')
        .select('*, photographer_categories(category_id, categories(name, slug, icon))')
        .eq(queryCol, queryVal)
        .maybeSingle();

      if (photoRes.error || !photoRes.data) {
        console.error('Photographer profile fetch error:', photoRes.error);
        setPhotographer(null);
        setLoadFailed(true);
        setPackages([]);
        setGallery([]);
      } else {
        const pData = photoRes.data as Photographer;
        setPhotographer(pData);
        setLoadFailed(false);

        // V27 — বাকি কোয়েরিগুলো রেজলভড UUID দিয়ে (slug প্যারামে চলবে না)
        const [pkgRes, galRes] = await Promise.all([
          supabase
            .from('packages')
            .select('*')
            .eq('photographer_id', pData.id)
            .order('price', { ascending: true }),
          supabase
            .from('portfolio_images')
            .select('*')
            .eq('photographer_id', pData.id)
            .order('sort_order'),
        ]);

        if (pkgRes.error) {
          console.error('Packages fetch error:', pkgRes.error);
          setPackages([]);
        } else {
          setPackages((pkgRes.data as Package[]) || []);
        }

        if (galRes.error) {
          console.error('Gallery fetch error:', galRes.error);
          setGallery([]);
        } else {
          setGallery(withVideoFlag((galRes.data as PortfolioImage[]) || []));
        }

        // Increment view count once per mount (existing behaviour preserved)
        if (!viewCountedRef.current) {
          viewCountedRef.current = true;
          supabase
            .from('photographers')
            .update({ profile_views: (pData.profile_views || 0) + 1 })
            .eq('id', pData.id)
            .then(({ error }) => {
              if (error) console.error('View increment error:', error);
            });
        }
      }
    } catch (err) {
      console.error('Profile load error:', err);
      setPhotographer(null);
      setLoadFailed(true);
      setPackages([]);
      setGallery([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
    setAvatarBroken(false);
    setCoverBroken(false);
  }, [loadProfile]);

  // Completed-shoot counter — shown only when RLS permits and count > 0 (V27: resolved UUID)
  useEffect(() => {
    const pId = photographer?.id;
    if (!pId) return;
    let active = true;
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('photographer_id', pId)
      .eq('status', 'completed')
      .then(({ count, error }) => {
        if (active && !error && typeof count === 'number') setCompletedCount(count);
      });
    return () => {
      active = false;
    };
  }, [photographer?.id]);

  // অ্যাপ্রুভড কাজের পোস্ট (অ্যাডমিন-অনুমোদিত ফিড)
  useEffect(() => {
    const pId = photographer?.id;
    if (!pId) return;
    let active = true;
    supabase
      .from('posts')
      .select('*, photographers(id, display_name, profile_photo_url)')
      .eq('photographer_id', pId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (active && data) setPosts(data as Post[]);
      });
    return () => {
      active = false;
    };
  }, [photographer?.id]);

  // Body scroll lock for mobile booking sheet
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sheetOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const bookNow = (pkgId?: string) => {
    if (pkgId) setBookPkgId(pkgId);
    if (window.innerWidth < 1024) {
      setSheetOpen(true);
    } else {
      document.getElementById('pf-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleStartChat = async () => {
    if (!session) {
      navigate('/auth?mode=login');
      return;
    }
    if (!photographer || chatStarting) return;
    setChatStarting(true);
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', session.user.id)
        .eq('photographer_id', photographer.id)
        .maybeSingle();
      if (existing) {
        navigate(`/chat?c=${existing.id}`);
        return;
      }
      const { data: created, error } = await supabase
        .from('conversations')
        .insert({ customer_id: session.user.id, photographer_id: photographer.id })
        .select('id')
        .single();
      if (error || !created) {
        alert('চ্যাট শুরু করতে সমস্যা হয়েছে।');
        return;
      }
      navigate(`/chat?c=${created.id}`);
    } finally {
      setChatStarting(false);
    }
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="pf-page">
        <div className="pf-skeleton h-44 md:h-60 !rounded-none" />
        <div className="max-w-6xl mx-auto px-4 -mt-14 relative">
          <div className="pf-card p-6">
            <div className="flex items-center gap-5">
              <div className="pf-skeleton w-24 h-24 !rounded-2xl shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="pf-skeleton h-6 w-1/3" />
                <div className="pf-skeleton h-4 w-1/2" />
                <div className="pf-skeleton h-4 w-1/4" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="pf-skeleton h-16" />
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            <div className="pf-skeleton h-40" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="pf-skeleton aspect-[4/5]" />
              ))}
            </div>
          </div>
          <div className="pf-skeleton h-96 hidden lg:block" />
        </div>
      </div>
    );
  }

  /* ── Error / not found ── */
  if (!photographer) {
    return (
      <div className="pf-page flex items-center justify-center min-h-screen px-4">
        <div className="pf-card p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#fbbf24]/12 flex items-center justify-center mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h2 className="pf-serif text-xl font-bold text-[#f3ede0] mb-2">
            {loadFailed ? 'প্রোফাইল লোড করা যায়নি' : 'ফটোগ্রাফার পাওয়া যায়নি'}
          </h2>
          <p className="text-sm text-[#a89d88] mb-6 leading-relaxed">
            {loadFailed
              ? 'নেটওয়ার্ক সমস্যা হতে পারে — আবার চেষ্টা করুন অথবা পরে ফিরে আসুন।'
              : 'এই প্রোফাইলটি মুছে ফেলা হয়েছে অথবা ভুল লিঙ্কে প্রবেশ করেছেন।'}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            {loadFailed && (
              <button type="button" onClick={loadProfile} className="pf-btn-primary">
                আবার চেষ্টা করুন
              </button>
            )}
            <Link to="/photographers" className="pf-btn-outline">
              সব ফটোগ্রাফার দেখুন
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Ready ── */
  const avgRating = Number(photographer.rating_avg || 0);
  const ratingCount = Number(photographer.rating_count || 0);
  const spotObj = SPOT_BY_KEY(photographer.home_spot || '');
  const spotNameBn = spotObj?.nameBn || photographer.full_location || 'কক্সবাজার';
  const isOwnProfile = profile?.role === 'photographer' && photographer.user_id === profile?.id;

  /* V30 — বাস্তব শুরু-দাম: একক ভেদে নরমালাইজ (hour×২, photo×১০), প্যাকেজ না থাকলে starting_price */
  const minPrice = photographerFromPrice(packages) ?? Number(photographer.starting_price || 0);

  const serviceAreas: string[] = (photographer.service_areas || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const languages: string[] = (photographer.languages || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const equipment: string[] = (photographer.equipment || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // V21 — detail density (photographers.details)
  const det = photographer.details || {};
  const specialties: string[] = det.specialties || [];
  const coveredSpots: string[] = det.covered_spots || [];
  const gearCamera = det.gear?.camera || '';
  const gearLenses = det.gear?.lenses || '';
  const gearExtras: string[] = det.gear?.extras || [];
  const deliveryLabel =
    det.delivery_days === 1 ? '২৪ ঘণ্টা' :
    det.delivery_days === 3 ? '২-৩ দিন' :
    det.delivery_days === 7 ? '৫-৭ দিন' : null;

  const categories = (photographer.photographer_categories || [])
    .map((c) => c?.categories?.name)
    .filter(Boolean) as string[];

  const waHref = waLink(
    photographer.phone,
    `আসসালামু আলাইকুম ${photographer.display_name} ভাই, ফটোলাগবে থেকে যোগাযোগ করছি। একটি ফটোশুট সম্পর্কে জানতে চাই।`
  );

  const avatarSrc = photographer.profile_photo_url && !avatarBroken
    ? cldUrl(photographer.profile_photo_url, { w: 240, h: 240, c: 'fill' })
    : '';

  const coverSrc = photographer.cover_photo_url && !coverBroken
    ? cldUrl(photographer.cover_photo_url, { w: 1600, c: 'fill' })
    : '';

  const getInitials = (name?: string | null) => {
    if (!name || !name.trim()) return 'ফ';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="pf-page pb-24 lg:pb-0">
      {/* ═══ COVER ═══ */}
      <div className="relative h-44 md:h-60 overflow-hidden bg-[#111116]">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={`${photographer.display_name} — কভার ছবি`}
            className="w-full h-full object-cover"
            onError={() => setCoverBroken(true)}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background:
                'linear-gradient(135deg, #241303 0%, #4a2c08 55%, #6b420d 100%)',
            }}
          />
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(6,7,13,0) 40%, #06070d 100%)' }}
        />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-[max(5.5rem,env(safe-area-inset-top)+4.5rem)] left-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#12141d]/80 backdrop-blur px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#12141d]"
        >
          <span aria-hidden="true">←</span> ফিরে যান
        </button>
      </div>

      {/* ═══ HEADER CARD ═══ */}
      <div className="max-w-6xl mx-auto px-4 relative z-10 -mt-12 md:-mt-14">
        <header className="pf-card p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-start gap-5">
            {/* Avatar */}
            <div className="shrink-0 relative">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={photographer.display_name}
                  className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover border-2 border-[#fbbf24]/30"
                  style={{ boxShadow: '0 0 0 4px rgba(251, 191, 36, 0.16)' }}
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <div
                  className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-[#fbbf24]/12 border-2 border-[#fbbf24]/30 flex items-center justify-center pf-serif text-2xl font-bold text-[#fbbf24]"
                >
                  {getInitials(photographer.display_name)}
                </div>
              )}
              {photographer.verified && (
                <span className="absolute -bottom-2 -right-2 rounded-full bg-[#fbbf24] text-[#2a1508] p-1.5 border-2 border-[#06070d]" title="ভেরিফায়েড">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl md:text-[1.7rem] font-bold text-[#f3ede0] leading-tight">
                  {photographer.display_name}
                </h1>
                {photographer.verified && <VerifiedBadge />}
              </div>

              <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-sm text-[#a89d88] mt-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <Stars value={avgRating} />
                  <b className="text-[#f3ede0]">{toBn(avgRating.toFixed(1))}</b>
                  <span className="text-[#8d8471]">({toBn(ratingCount)} রিভিউ)</span>
                </span>
                <span className="text-[#d8cfbd]" aria-hidden="true">|</span>
                <span className="inline-flex items-center gap-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {photographer.full_location || spotNameBn}
                </span>
                <span className="text-[#d8cfbd]" aria-hidden="true">|</span>
                <span>{toBn(photographer.experience_years || 1)}+ বছর অভিজ্ঞতা</span>
              </div>

              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {categories.map((c, i) => (
                    <span key={i} className="pf-chip !text-[12.5px] !py-1">{c}</span>
                  ))}
                </div>
              )}

              {/* Mobile quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 lg:hidden">
                <StatBlock label="রেটিং" value={`★ ${toBn(avgRating.toFixed(1))}`} sub={`${toBn(ratingCount)} রিভিউ`} />
                <StatBlock label="অভিজ্ঞতা" value={`${toBn(photographer.experience_years || 1)}+`} sub="বছর" />
                {completedCount !== null && completedCount > 0 && (
                  <StatBlock label="সম্পন্ন শুট" value={toBn(completedCount)} sub="কমপ্লিট" />
                )}
                <StatBlock label="প্রোফাইল ভিউ" value={toBn(photographer.profile_views || 0)} />
              </div>
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex flex-col items-end gap-2 shrink-0">
              <div className="text-right">
                <span className="text-[12.5px] font-semibold text-[#8d8471] block">শুরু প্যাকেজ</span>
                <span className="pf-serif text-2xl font-bold text-[#fbbf24]">{taka(minPrice)}</span>
              </div>
              <button type="button" onClick={() => bookNow()} className="pf-btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                বুক করুন
              </button>
              {waHref && (
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="pf-btn-outline !text-[#4ade80] !border-[#25d366]/40 hover:!bg-[rgba(37,211,102,0.12)]">
                  <WhatsAppIcon /> WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Desktop stats */}
          <div className="hidden lg:grid grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
            <StatBlock label="রেটিং" value={`★ ${toBn(avgRating.toFixed(1))}`} sub={`${toBn(ratingCount)} রিভিউ`} />
            <StatBlock label="অভিজ্ঞতা" value={`${toBn(photographer.experience_years || 1)}+ বছর`} />
            {completedCount !== null && completedCount > 0 ? (
              <StatBlock label="সম্পন্ন শুট" value={toBn(completedCount)} sub="কমপ্লিট বুকিং" />
            ) : (
              <StatBlock label="হোম স্পট" value={spotNameBn.length > 14 ? spotNameBn.slice(0, 14) + '…' : spotNameBn} />
            )}
            <StatBlock label="প্রোফাইল ভিউ" value={toBn(photographer.profile_views || 0)} />
          </div>
        </header>
      </div>

      {/* ═══ BODY ═══ */}
      <div className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* ── MAIN ── */}
        <main className="space-y-6 min-w-0">
          {/* মোবাইলে সবার আগে — WhatsApp নম্বর কার্ড (বুকিংয়ের আগে) */}
          {waHref && photographer.phone && (
            <div className="lg:hidden">
              <WhatsAppContactCard number={photographer.phone} waHref={waHref} />
            </div>
          )}

          {/* V24 — ফটো গ্যালারি (হোম-স্টাইল স্ক্রল-স্ট্রিপ + দৃশ্যমান prev/next + ভিডিও) */}
          {gallery.length > 0 ? (
            <ProfileGallery
              items={gallery}
              onOpen={(m, i) =>
                setViewer({
                  items: gallery.map((g) => ({
                    url: g.url,
                    type: g.isVideo ? ('video' as const) : ('image' as const),
                    caption: galleryCaption(g.caption),
                    title: photographer.display_name,
                  })),
                  index: i,
                })
              }
            />
          ) : isOwnProfile ? (
            <section className="pf-card p-6 text-center" aria-label="গ্যালারি খালি">
              <p className="text-2xl mb-1.5">📸</p>
              <p className="pf-serif font-bold text-[#f3ede0]">আপনার ফটো গ্যালারি এখনো খালি</p>
              <p className="text-sm text-[#a89d88] mt-1 leading-relaxed">
                স্টুডিও ড্যাশবোর্ড → ফটো গ্যালারি থেকে অন্তত ৬টি ছবি ও ১টি ভিডিও (সর্বোচ্চ ৫০MB) যোগ করুন — এখানে হোম পেজের মতো দেখাবে।
              </p>
            </section>
          ) : null}

          {/* About */}
          <section className="pf-card p-6" aria-labelledby="pf-about-h">
            <h2 id="pf-about-h" className="pf-serif text-lg font-bold text-[#f3ede0] mb-3">নিজের সম্পর্কে</h2>
            <p className="text-[16.5px] leading-[1.85] text-[#d6cdbb]">
              {photographer.bio?.trim() ||
                `${spotNameBn} এলাকার প্রফেশনাল ফটোগ্রাফার। প্রি-ওয়েডিং, বিয়ে, ট্রাভেল ও ফ্যামিলি শুটের জন্য আমার সাথে যোগাযোগ করতে পারেন — প্রাকৃতিক আলোয় জীবন্ত ও আবেগময় ফ্রেম আমার বিশেষত্ব।`}
            </p>

            {(languages.length > 0 || equipment.length > 0) && (
              <div className="grid sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-white/10">
                {languages.length > 0 && (
                  <div>
                    <span className="text-[12.5px] font-bold uppercase tracking-wide text-[#8d8471] block mb-2">ভাষাসমূহ</span>
                    <div className="flex flex-wrap gap-1.5">
                      {languages.map((lang, i) => (
                        <span key={i} className="pf-chip !text-[12.5px] !py-1">{lang}</span>
                      ))}
                    </div>
                  </div>
                )}
                {equipment.length > 0 && (
                  <div>
                    <span className="text-[12.5px] font-bold uppercase tracking-wide text-[#8d8471] block mb-2">যন্ত্রপাতি</span>
                    <div className="flex flex-wrap gap-1.5">
                      {equipment.map((eq, i) => (
                        <span key={i} className="pf-chip !text-[12.5px] !py-1">{eq}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Specialties & service areas — V21 detail density */}
          <section className="pf-card p-6" aria-labelledby="pf-areas-h">
            <h2 id="pf-areas-h" className="pf-serif text-lg font-bold text-[#f3ede0] mb-3">সার্ভিস এরিয়া ও বিশেষত্ব</h2>

            {specialties.length > 0 && (
              <div className="mb-4">
                <span className="text-[12.5px] font-bold uppercase tracking-wide text-[#8d8471] block mb-2">বিশেষত্ব</span>
                <div className="flex flex-wrap gap-2">
                  {specialties.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/25 px-3 py-1.5 text-[13px] font-bold text-[#fbbf24]">
                      ✦ {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {coveredSpots.length > 0 && (
              <div className="mb-4">
                <span className="text-[12.5px] font-bold uppercase tracking-wide text-[#8d8471] block mb-2">যেসব স্পটে কাজ করেন</span>
                <div className="flex flex-wrap gap-1.5">
                  {coveredSpots.map((k) => {
                    const s = SPOT_BY_KEY(k);
                    if (!s) return null;
                    return (
                      <span key={k} className="pf-chip !text-[12.5px] !py-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {s.nameBn}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <span className="pf-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                হোম স্পট: {spotNameBn}
              </span>
              {serviceAreas.map((a, i) => (
                <span key={i} className="pf-chip">{a}</span>
              ))}
              <span className="pf-chip">সমগ্র কক্সবাজার</span>
            </div>

            {(gearCamera || gearLenses || gearExtras.length > 0) && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <span className="text-[12.5px] font-bold uppercase tracking-wide text-[#8d8471] block mb-2">📷 ব্যবহৃত গিয়ার</span>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {gearCamera && <span className="rounded-lg bg-[#f3efe6] border border-white/[0.12] px-2.5 py-1.5 text-[13px] font-semibold text-[#f3ede0]">🎥 {gearCamera}</span>}
                  {gearLenses && <span className="rounded-lg bg-[#f3efe6] border border-white/[0.12] px-2.5 py-1.5 text-[13px] font-semibold text-[#f3ede0]">🔭 {gearLenses}</span>}
                  {gearExtras.map((g, i) => (
                    <span key={i} className="rounded-lg bg-[#fbbf24]/10 border border-[#fbbf24]/25 px-2.5 py-1.5 text-[13px] font-semibold text-[#fbbf24]">✓ {g}</span>
                  ))}
                </div>
              </div>
            )}

            {spotObj && (
              <Link
                to={`/finder?spot=${encodeURIComponent(spotObj.key)}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#fbbf24] hover:underline"
              >
                ম্যাপে এই স্পট দেখুন
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            )}
          </section>

          {/* কাজের পোস্ট — অ্যাডমিন-অনুমোদিত ফিড */}
          {posts.length > 0 && (
            <section aria-labelledby="pf-posts-h">
              <div className="mb-4">
                <h2 id="pf-posts-h" className="pf-serif text-xl font-bold text-[#f3ede0]">কাজের পোস্ট</h2>
                <p className="text-sm text-[#a89d88] mt-0.5">সাম্প্রতিক কাজ, অফার ও প্যাকেজ আপডেট</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} tone="light" />
                ))}
              </div>
            </section>
          )}

          {/* Reviews — ছবি/ভিডিও/ডেমো সেকশন বাদ (বুকিং পেজ হালকা ও দ্রুত) */}
          <section aria-labelledby="pf-review-h">
            <div className="mb-4">
              <h2 id="pf-review-h" className="pf-serif text-xl font-bold text-[#f3ede0]">কাস্টমার রিভিউ</h2>
              <p className="text-sm text-[#a89d88] mt-0.5">আসল গ্রাহকদের অভিজ্ঞতা — স্বচ্ছ রেটিং</p>
            </div>
            <MediaReviews photographerId={photographer.id} reviewsOnly />
          </section>

          {/* Packages */}
          <section aria-labelledby="pf-pkg-h">
            <div className="flex items-end justify-between mb-4 gap-3 flex-wrap">
              <div>
                <h2 id="pf-pkg-h" className="pf-serif text-xl font-bold text-[#f3ede0]">প্যাকেজ ও মূল্য</h2>
                <p className="text-sm text-[#a89d88] mt-0.5">স্বচ্ছ দাম — কোনো লুকানো চার্জ নেই</p>
              </div>
              {deliveryLabel && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/25 px-3 py-1.5 text-[12.5px] font-bold text-[#fbbf24] whitespace-nowrap">
                  ⚡ {deliveryLabel} ছবি ডেলিভারি
                </span>
              )}
            </div>

            {packages.length === 0 ? (
              <div className="pf-card p-8 text-center">
                <p className="text-[#d6cdbb] font-semibold">এখনো কোনো প্যাকেজ যোগ করা হয়নি</p>
                <p className="text-sm text-[#a89d88] mt-1">কাস্টম বুকিংয়ের জন্য সরাসরি রিকোয়েস্ট পাঠান অথবা WhatsApp-এ মেসেজ করুন।</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {packages.map((pkg, idx) => {
                  const isPopular = pkg.is_popular === true || (packages.every((p) => !p.is_popular) && idx === 0);
                  return (
                    <article
                      key={pkg.id}
                      className={`pf-card p-5 flex flex-col relative ${isPopular ? '!border-[#fbbf24]' : ''}`}
                    >
                      {isPopular && (
                        <span className="absolute -top-2.5 right-4 rounded-full bg-[#fbbf24] px-3 py-0.5 text-[11.5px] font-bold uppercase tracking-wide text-[#2a1508]">
                          জনপ্রিয়
                        </span>
                      )}
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="pf-serif font-bold text-[#f3ede0] text-base">{pkg.name}</h3>
                        <span className="pf-serif text-xl font-bold text-[#fbbf24] whitespace-nowrap">{priceLine(pkg)}</span>
                      </div>
                      <p className="text-xs text-[#a89d88] mt-0.5">
                        {pkg.pricing_unit === 'hour'
                          ? `প্রতি ঘণ্টা দাম — বুকিংয়ে ঘণ্টা বাছবেন${pkg.description ? ` · ${pkg.description}` : ''}`
                          : pkg.pricing_unit === 'photo'
                            ? `প্রতি ছবির দাম — যত ছবি চান তত${pkg.description ? ` · ${pkg.description}` : ''}`
                            : <>{toBn(pkg.duration_hours || 0)} ঘণ্টা{photoCountLine(pkg) ? ` · ${photoCountLine(pkg)}` : ''}{pkg.description ? ` · ${pkg.description}` : ''}</>
                        }
                      </p>

                      {/* V21 — রেফারেন্স মিডিয়া স্ট্রিপ (ট্যাপ করে বড় দেখুন) */}
                      {pkg.media && pkg.media.length > 0 && (
                        <div className="mt-3.5">
                          <p className="text-[11px] font-bold text-[#8d8471] uppercase tracking-wide mb-1.5">
                            এই প্যাকেজের নমুনা কাজ (ট্যাপ করে বড় দেখুন)
                          </p>
                          <div className="-mx-5 px-5 overflow-x-auto snap-x snap-mandatory flex gap-2.5 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            {pkg.media.map((m, mi) => (
                              <button
                                key={mi}
                                type="button"
                                onClick={() =>
                                  setViewer({
                                    items: (pkg.media || []).map((mm) => ({ url: mm.url, type: mm.type, title: pkg.name })),
                                    index: mi,
                                  })
                                }
                                className="relative w-[156px] aspect-[16/10] shrink-0 snap-start rounded-xl overflow-hidden border border-white/[0.12] bg-white/[0.05] group/tile"
                                aria-label={`${pkg.name} নমুনা ${mi + 1} বড় করে দেখুন`}
                              >
                                <img
                                  src={m.type === 'video' ? videoThumb(m.url) : cldUrl(m.url, { w: 480, c: 'fill' })}
                                  alt={`${pkg.name} — নমুনা ${toBn(mi + 1)}`}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover/tile:scale-[1.04]"
                                  loading="lazy"
                                />
                                {m.type === 'video' && (
                                  <span className="absolute inset-0 grid place-items-center">
                                    <span className="w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm grid place-items-center text-white">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                                    </span>
                                  </span>
                                )}
                                {mi === 0 && (
                                  <span className="absolute top-1.5 left-1.5 rounded-md bg-[#fbbf24]/90 text-[#2a1508] text-[10px] font-extrabold px-1.5 py-0.5">
                                    {mi === 0 ? 'নমুনা' : ''}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {pkg.features && pkg.features.length > 0 && (
                        <ul className="mt-3 space-y-1.5 flex-1">
                          {pkg.features.map((feat, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-2 text-[14.5px] text-[#d6cdbb]">
                              <svg className="shrink-0 mt-[3px]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              {feat}
                            </li>
                          ))}
                        </ul>
                      )}
                      <button
                        type="button"
                        onClick={() => bookNow(pkg.id)}
                        className={isPopular ? 'pf-btn-primary w-full mt-4' : 'pf-btn-outline w-full mt-4'}
                      >
                        এই প্যাকেজে বুক করুন
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Safety */}
          <section className="rounded-[18px] border border-[#fbbf24]/20 bg-[#fbbf24]/[0.05] p-5 flex gap-4 items-start">
            <div className="w-11 h-11 rounded-xl bg-[#fbbf24] text-[#2a1508] flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h3 className="pf-serif font-bold text-[#fde68a]">নিরাপদ বুকিং</h3>
              <p className="text-sm text-[#cfc0a0] mt-1 leading-relaxed">
                অগ্রিম পেমেন্ট ছাড়াই বুক করুন — ফটোগ্রাফার রিকোয়েস্ট গ্রহণ করলে তবেই কনফার্ম। কোনো সমস্যা হলে অ্যাডমিন সাপোর্ট সবসময় পাশে আছে।
              </p>
            </div>
          </section>
        </main>

        {/* ── DESKTOP BOOKING RAIL (WhatsApp কার্ড আগে, বুকিং কার্ড sticky) ── */}
        <aside
          id="pf-booking"
          className="hidden lg:block"
          aria-label="বুকিং কার্ড"
        >
          {waHref && photographer.phone && (
            <div className="mb-5">
              <WhatsAppContactCard number={photographer.phone} waHref={waHref} />
            </div>
          )}

          <div className="lg:sticky lg:top-24 scroll-mt-24">
          <div className="pf-card p-6 !border-white/20">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="pf-serif text-lg font-bold text-[#f3ede0]">বুকিং</h2>
              <span className="text-sm text-[#a89d88]">
                শুরু <span className="pf-serif font-bold text-[#fbbf24] text-lg">{taka(minPrice)}</span>
              </span>
            </div>
            <p className="text-xs text-[#8d8471] mb-5">তারিখ বাছাই করে রিকোয়েস্ট পাঠান — রিপ্লাই ২৪ ঘণ্টার মধ্যে</p>

            <BookingForm
              p={photographer}
              packages={packages}
              selectedPkgId={bookPkgId === '' ? undefined : bookPkgId}
              onPackageChange={setBookPkgId}
              compact
            />

            <div className="mt-5 pt-5 border-t border-white/10 space-y-2.5">
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#25d366]/40 bg-[rgba(37,211,102,0.1)] px-4 py-2.5 text-sm font-bold text-[#4ade80] hover:bg-[rgba(37,211,102,0.18)] transition-colors"
                >
                  <WhatsAppIcon /> WhatsApp-এ মেসেজ করুন
                </a>
              )}
              {!isOwnProfile && (
                <button
                  type="button"
                  onClick={handleStartChat}
                  disabled={chatStarting}
                  className="pf-btn-outline w-full"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  {chatStarting ? 'খোলা হচ্ছে…' : 'সাইট-চ্যাটে কথা বলুন'}
                </button>
              )}
            </div>
          </div>
          </div>
        </aside>
      </div>

      {/* ═══ MOBILE STICKY CTA ═══ */}
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-white/10 bg-white/95 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <div className="min-w-0">
          <span className="text-[11.5px] font-semibold text-[#8d8471] block leading-none">শুরু প্যাকেজ</span>
          <span className="pf-serif text-lg font-bold text-[#fbbf24] leading-tight">{taka(minPrice)}</span>
        </div>
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp-এ যোগাযোগ করুন"
            className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-[12px] border border-[#25d366]/40 bg-[rgba(37,211,102,0.12)] text-[#4ade80]"
          >
            <WhatsAppIcon size={20} />
          </a>
        )}
        {!isOwnProfile && (
          <button
            type="button"
            onClick={handleStartChat}
            disabled={chatStarting}
            aria-label="ফটোগ্রাফারের সাথে চ্যাট করুন"
            className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-[12px] border border-white/20 bg-white/[0.07] text-[#fbbf24]"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </button>
        )}
        <button type="button" onClick={() => bookNow()} className="pf-btn-primary flex-1 justify-center !py-3">
          বুক করুন
        </button>
      </div>

      {/* ═══ MOBILE BOOKING SHEET ═══ */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[85] lg:hidden" role="dialog" aria-modal="true" aria-label="বুকিং ফর্ম">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] rounded-t-[22px] bg-[#0b0d15] border-t border-[#fbbf24]/25 flex flex-col" style={{ maxHeight: "88dvh" }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#fbbf24]/12 flex items-center justify-center pf-serif font-bold text-[#fbbf24] text-sm">
                    {getInitials(photographer.display_name)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="pf-serif font-bold text-[#f3ede0] text-sm truncate">{photographer.display_name}</h3>
                  <p className="text-[12.5px] text-[#8d8471]">বুকিং রিকোয়েস্ট</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="বন্ধ করুন"
                className="w-9 h-9 rounded-full border border-white/10 bg-white flex items-center justify-center text-[#a89d88]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-5">
              <BookingForm
                p={photographer}
                packages={packages}
                selectedPkgId={bookPkgId === '' ? undefined : bookPkgId}
                onPackageChange={setBookPkgId}
              />
            </div>
          </div>
        </div>
      )}

      {/* V25 — ডেডিকেটেড ফুল-স্ক্রিন গ্যালারি (portal z-9999 — হেডার/নববার কখনো ওভারল্যাপ করে না) */}
      {viewer && (
        <GalleryViewer items={viewer.items} startIndex={viewer.index} onClose={() => setViewer(null)} />
      )}
    </div>
  );
}
