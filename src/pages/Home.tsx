import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Photographer } from '../lib/types';
import { COX_SPOTS, SPOT_BY_KEY, SPOT_KIND_BN } from '../lib/constants';
import { SPOT_PHOTOS } from '../lib/spotPhotos';
import { SPOT_GUIDES, spotCostSummary } from '../lib/spotGuides';
import { cldUrl } from '../lib/cloudinary';
import { HERO_SCENIC, GALLERY_SCENIC, scenicUrl } from '../lib/scenicPhotos';
import { toBn } from '../lib/utils';
import Reveal from '../components/Reveal';
import PhotographerCard from '../components/PhotographerCard';

const SPOT_KIND_EMOJI: Record<string, string> = {
  beach: '🏖️',
  point: '📍',
  island: '🏝️',
  landmark: '🏛️',
  park: '🌲',
  drive: '🛣️',
};

/* হোমের গাইড সেকশনে দেখানো হাইলাইট স্পট (প্রথম ভিউতে) */
const HOME_GUIDE_KEYS = ['inani', 'saintmartin', 'himchari', 'marine', 'laboni', 'maheshkhali'];

const SLIDE_MS = 6000;

const CATEGORY_CHIPS = [
  { slug: 'wedding', icon: '💍', label: 'বিয়ে' },
  { slug: 'pre-wedding', icon: '💕', label: 'প্রি-ওয়েডিং' },
  { slug: 'portrait', icon: '🧑', label: 'পোর্ট্রেট' },
  { slug: 'travel', icon: '✈️', label: 'ট্রাভেল' },
  { slug: 'birthday', icon: '🎂', label: 'বার্থডে' },
  { slug: 'event', icon: '🎉', label: 'ইভেন্ট' },
  { slug: 'videography', icon: '🎥', label: 'ভিডিওগ্রাফি' },
  { slug: 'fashion', icon: '👗', label: 'ফ্যাশন' },
  { slug: 'product', icon: '📦', label: 'প্রোডাক্ট' },
  { slug: 'corporate', icon: '💼', label: 'কর্পোরেট' },
];

interface ReviewItem {
  rating: number;
  comment: string | null;
  created_at: string;
  customer: { full_name: string | null } | null;
  photographer: { display_name: string | null } | null;
}

interface BlogPostItem {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
}

/* ═══ SECTION EYEBROW ═══ */
function SectionEyebrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-3">
      <span className="h-px w-8 bg-gradient-to-r from-transparent to-sunset-gold/60" />
      <span className="text-[11.5px] font-bold tracking-[0.22em] text-sunset-gold uppercase">{label}</span>
      <span className="h-px w-8 bg-gradient-to-l from-transparent to-sunset-gold/60" />
    </div>
  );
}

/* ═══ HERO AUTO-SLIDER ═══ */
function HeroSlider() {
  const slides = HERO_SCENIC;
  const [idx, setIdx] = useState(0);
  const [layerA, setLayerA] = useState(0); // কোন লেয়ার সামনে
  const [reduced, setReduced] = useState(false);
  const preloaded = useRef<Set<string>>(new Set());

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
  }, []);

  // পরের স্লাইডের ছবি আগে থেকে লোড (একবারই)
  useEffect(() => {
    const next = slides[(idx + 1) % slides.length];
    if (next && !preloaded.current.has(next)) {
      const im = new Image();
      im.src = scenicUrl(next, 1600);
      preloaded.current.add(next);
    }
  }, [idx, slides]);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      if (document.hidden) return; // ট্যাব লুকালে পাওয়ার বাঁচাও
      setIdx((i) => (i + 1) % slides.length);
      setLayerA((l) => (l === 0 ? 1 : 0));
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [reduced, slides.length]);

  const cur = slides[idx];
  const nxt = slides[(idx + 1) % slides.length];
  const srcFor = (s: string) => scenicUrl(s, 1600);

  return (
    <>
      {/* Layer A */}
      <img
        src={srcFor(layerA === 0 ? cur : nxt)}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1400ms] ease-in-out"
        style={{ opacity: layerA === 0 ? 0.72 : 0 }}
      />
      {/* Layer B */}
      <img
        src={srcFor(layerA === 1 ? cur : nxt)}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1400ms] ease-in-out"
        style={{ opacity: layerA === 1 ? 0.72 : 0 }}
      />
    </>
  );
}

/* ═══ ফটো গ্যালারি ═══ */
function PhotoGallery() {
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

  return (
    <section aria-label="ফটো গ্যালারি" className="py-16 sm:py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 flex items-end justify-between gap-4 mb-8">
        <Reveal>
          <h2 className="section-head !mb-1">ফটো গ্যালারি</h2>
          <p className="section-sub">কক্সবাজারের সমুদ্র, পাহাড় আর নৌকা — ভ্রমণের মুহূর্ত</p>
        </Reveal>
        <div className="hidden sm:flex items-center gap-2.5 shrink-0">
          <GalleryBtn dir="L" enabled={canL} onClick={go} />
          <GalleryBtn dir="R" enabled={canR} onClick={go} />
        </div>
      </div>

      <div className="relative">
        {/* মোবাইলে পুরো জুড়ে — বাম-ডান এজ পর্যন্ত ব্লিড */}
        <div
          ref={trackRef}
          className="no-scrollbar flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 sm:px-6 lg:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] pb-2"
        >
          {GALLERY_SCENIC.map((g, i) => (
            <figure
              key={g.key}
              className={`relative shrink-0 snap-center overflow-hidden rounded-xl3 bg-twilight-800 ring-1 ring-white/10 group ${
                g.portrait
                  ? 'w-[62vw] max-w-[300px] h-[240px] sm:h-[300px]'
                  : 'w-[82vw] max-w-[460px] h-[240px] sm:h-[300px]'
              }`}
            >
              <img
                src={scenicUrl(g.url, g.portrait ? 700 : 900)}
                alt={g.cap}
                loading={i < 2 ? 'eager' : 'lazy'}
                decoding="async"
                onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none" />
              <figcaption className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                <span className="chip !py-1 !text-[12px] bg-black/45 backdrop-blur-sm">{g.cap}</span>
                {g.portrait && <span className="text-[11px] text-white/60">লম্বা</span>}
              </figcaption>
            </figure>
          ))}
        </div>

        {/* মোবাইলে বাটন ফ্লোট করে — দৃশ্যমান prev/next */}
        <div className="sm:hidden flex justify-center gap-3 mt-5">
          <GalleryBtn dir="L" enabled={canL} onClick={go} />
          <GalleryBtn dir="R" enabled={canR} onClick={go} />
        </div>
      </div>
    </section>
  );
}

/* গ্যালারির গোল prev/next বাটন — গ্লাস + রিং, disabled এ ডিম */
function GalleryBtn({ dir, enabled, onClick }: { dir: 'L' | 'R'; enabled: boolean; onClick: (d: 'L' | 'R') => void }) {
  return (
    <button
      type="button"
      onClick={() => enabled && onClick(dir)}
      aria-label={dir === 'L' ? 'আগের ছবি' : 'পরের ছবি'}
      disabled={!enabled}
      className={`grid size-11 place-items-center rounded-full bg-black/45 backdrop-blur-md ring-1 ring-white/25 text-white shadow-glass-sm transition-all duration-200 ${
        enabled ? 'hover:bg-black/60 hover:ring-sunset-gold/60 active:scale-90' : 'opacity-35 cursor-default'
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dir === 'L' ? (
          <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>
        ) : (
          <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>
        )}
      </svg>
    </button>
  );
}

export default function Home() {
  const [featured, setFeatured] = useState<Photographer[]>([]);
  const [photographerCount, setPhotographerCount] = useState<number | null>(null);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [posts, setPosts] = useState<BlogPostItem[]>([]);

  // Featured photographers + approved count
  useEffect(() => {
    let active = true;

    async function loadFeaturedAndCount() {
      try {
        const [featuredRes, countRes] = await Promise.all([
          supabase
            .from('photographers')
            .select('*, photographer_categories(category_id, categories(name, slug, icon))')
            .eq('profile_status', 'approved')
            .order('rating_avg', { ascending: false })
            .limit(10),
          supabase
            .from('photographers')
            .select('id', { count: 'exact', head: true })
            .eq('profile_status', 'approved'),
        ]);

        if (!active) return;

        if (featuredRes.error) {
          console.error('Featured photographers fetch error:', featuredRes.error);
        } else {
          setFeatured((featuredRes.data as Photographer[]) || []);
        }

        if (countRes.error) {
          console.error('Photographers count fetch error:', countRes.error);
        } else {
          setPhotographerCount(countRes.count ?? null);
        }
      } catch (err) {
        if (active) console.error('Home photographers load error:', err);
      } finally {
        if (active) setLoadingFeatured(false);
      }
    }

    loadFeaturedAndCount();
    return () => {
      active = false;
    };
  }, []);

  // Reviews fetch
  useEffect(() => {
    let active = true;

    async function loadReviews() {
      try {
        const res = await supabase
          .from('reviews')
          .select('rating, comment, created_at, customer:profiles(full_name), photographer:photographers(display_name)')
          .order('created_at', { ascending: false })
          .limit(3);

        if (!active) return;

        if (res.error) {
          console.error('Reviews load error:', res.error);
        } else if (res.data) {
          setReviews(res.data as unknown as ReviewItem[]);
        }
      } catch (err) {
        if (active) console.error('Reviews fetch error:', err);
      }
    }

    loadReviews();
    return () => {
      active = false;
    };
  }, []);

  // Blog posts fetch
  useEffect(() => {
    let active = true;

    async function loadBlogPosts() {
      try {
        const res = await supabase
          .from('blog_posts')
          .select('slug, title, excerpt, cover_url')
          .eq('published', true)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!active) return;

        if (res.error) {
          console.error('Blog posts load error:', res.error);
        } else if (res.data) {
          setPosts(res.data as BlogPostItem[]);
        }
      } catch (err) {
        if (active) console.error('Blog fetch error:', err);
      }
    }

    loadBlogPosts();
    return () => {
      active = false;
    };
  }, []);

  /* গাইড কার্ডের ডেটা — একবারই মেমোইজ */
  const guideCards = useMemo(
    () =>
      HOME_GUIDE_KEYS.map((key) => {
        const spot = SPOT_BY_KEY(key);
        if (!spot) return null;
        return { spot, photo: SPOT_PHOTOS[key], guide: SPOT_GUIDES[key], cost: spotCostSummary(key) };
      }).filter(Boolean) as { spot: (typeof COX_SPOTS)[number]; photo?: string; guide?: (typeof SPOT_GUIDES)[string]; cost: { vara: string; ticket: string } }[],
    []
  );

  return (
    <div className="min-h-screen">
      {/* ═══ (1) HERO — ১০০% ফুল-স্ক্রিন, ফিক্সড নেভবারের নিচে এজ-টু-এজ ═══ */}
      <section className="relative h-[100svh] min-h-[560px] flex items-center overflow-hidden">
        {/* Background — scenic auto-slider (সমুদ্র/পাহাড়/নৌকা/ঢেউ/আকাশ) */}
        <div className="absolute inset-0 bg-sunset-soft">
          <HeroSlider />
        </div>

        {/* Gradient & Radial Glow Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-twilight-950/75 via-twilight-950/45 to-twilight-950 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(251,191,36,0.20),transparent_50%)] pointer-events-none" />

        {/* Hero Content */}
        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full text-center">
          <Reveal>
            {/* Trust chip row ABOVE h1 */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md ring-1 ring-white/15 text-white/80 text-[12.5px] font-medium shadow-glass-sm">
                <span className="text-emerald-300 font-bold mr-1">✓</span> ভেরিফায়েড প্রোফাইল
              </span>
              <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md ring-1 ring-white/15 text-white/80 text-[12.5px] font-medium shadow-glass-sm">
                <span className="text-sunset-gold font-bold mr-1">★</span> রিয়েল রিভিউ
              </span>
              <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md ring-1 ring-white/15 text-white/80 text-[12.5px] font-medium shadow-glass-sm">
                <span className="text-sunset-gold font-bold mr-1">৳</span> স্বচ্ছ বাজেট
              </span>
            </div>

            <h1 className="text-[clamp(2.6rem,6vw,4.6rem)] font-extrabold leading-[1.1] text-white tracking-tight">
              <span className="block">কক্সবাজারের প্রিমিয়াম</span>
              <span className="block grad-text py-1">ফটোগ্রাফার খুঁজুন</span>
              <span className="block text-[0.72em] text-white/85 mt-1">এক ক্লিকে</span>
            </h1>

            <p className="text-white/70 max-w-2xl mx-auto mt-5 text-lg leading-relaxed">
              লাবণী থেকে সেন্ট মার্টিন — ভেরিফায়েড ফটোগ্রাফার, স্বচ্ছ বাজেট, রিয়েল রিভিউ। প্রি-ওয়েডিং, বিয়ে, ফ্যামিলি বা ট্রাভেল শুট — ফটোলাগবে-ই যথেষ্ট।
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
              <Link to="/photographers" className="btn-primary px-8">
                ফটোগ্রাফার খুঁজুন
              </Link>
              <Link to="/finder" className="btn-ghost px-8">
                ম্যাপে দেখুন
              </Link>
            </div>

            {/* Quick-find row under CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              <span className="text-[13px] text-white/60 font-medium mr-1">জনপ্রিয়:</span>
              {CATEGORY_CHIPS.slice(0, 5).map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/photographers?cat=${cat.slug}`}
                  className="px-3.5 py-1.5 rounded-full bg-black/35 backdrop-blur-md ring-1 ring-white/15 text-[13px] text-white/85 hover:ring-sunset-gold/60 hover:text-sunset-gold transition"
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.label}
                </Link>
              ))}
            </div>
          </Reveal>
        </div>

        {/* স্ক্রল-ডাউন নির্দেশক */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-white/60" aria-hidden="true">
          <span className="text-[11.5px] font-semibold tracking-wide">নিচে দেখুন</span>
          <svg className="hero-bounce" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </section>

      {/* ═══ (2) STATS STRIP & সব ট্যুর পয়েন্ট ═══ */}
      <section className="py-12 sm:py-16 border-y border-white/[0.08] bg-white/[0.02]">
        {/* 4-Stat Row */}
        <div className="max-w-5xl mx-auto px-4 mb-12">
          <Reveal>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-2 text-center">
              <div className="flex flex-col items-center">
                <span className="text-[clamp(1.7rem,4vw,2.5rem)] font-extrabold grad-text leading-tight">
                  {photographerCount !== null ? toBn(photographerCount) : '৯'}+
                </span>
                <span className="text-[12.5px] text-white/55 mt-1 font-medium">জন ভেরিফায়েড ফটোগ্রাফার</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[clamp(1.7rem,4vw,2.5rem)] font-extrabold grad-text leading-tight">
                  {toBn(COX_SPOTS.length)}টি
                </span>
                <span className="text-[12.5px] text-white/55 mt-1 font-medium">ট্যুর পয়েন্ট গাইড</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[clamp(1.7rem,4vw,2.5rem)] font-extrabold grad-text leading-tight">
                  {toBn(10)}টি
                </span>
                <span className="text-[12.5px] text-white/55 mt-1 font-medium">ফটোগ্রাফি ক্যাটাগরি</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[clamp(1.7rem,4vw,2.5rem)] font-extrabold grad-text leading-tight">
                  ২৪/৭
                </span>
                <span className="text-[12.5px] text-white/55 mt-1 font-medium">ফ্রি বুকিং রিকোয়েস্ট</span>
              </div>
            </div>
          </Reveal>
        </div>

        <p className="text-base sm:text-lg text-center text-white font-bold mb-1 tracking-tight">
          কক্সবাজারের সব ট্যুর পয়েন্ট
        </p>
        <p className="text-xs sm:text-sm text-center text-white/50 mb-7 font-medium">
          যেকোনো পয়েন্টে ক্লিক করুন — গাইড, ফটোগ্রাফার ও দিক-নির্দেশনা
        </p>

        {/* Perf: ছোট ক্রপ করা থাম্বনেইল + lazy — স্ট্যাটিক গ্রিড, কোনো অ্যানিমেশন নেই */}
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-10 gap-x-2 gap-y-6">
          {COX_SPOTS.map((s) => {
            const photo = SPOT_PHOTOS[s.key];
            return (
              <Link
                key={s.key}
                to={`/spot/${s.key}`}
                className="group flex flex-col items-center gap-2 focus:outline-none"
              >
                <span className="relative block w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-sunset-gold/60 transition-colors bg-twilight-800">
                  {photo ? (
                    <img
                      src={cldUrl(photo, { w: 160, h: 160, c: 'fill' })}
                      alt={s.nameBn}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="w-full h-full bg-sunset-soft flex items-center justify-center text-2xl">
                      {SPOT_KIND_EMOJI[s.kind] || '📍'}
                    </span>
                  )}
                </span>
                <span className="text-[12.5px] sm:text-xs font-semibold text-white/75 group-hover:text-sunset-gold transition-colors text-center leading-tight">
                  {s.nameBn}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ═══ (3) CATEGORY QUICK-FIND ═══ */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <Reveal className="text-center mb-10">
          <SectionEyebrow label="QUICK FIND" />
          <h2 className="section-head">কী ধরনের শুট দরকার?</h2>
          <p className="section-sub mt-2">ক্যাটাগরি বেছে নিয়ে সরাসরি ফটোগ্রাফার দেখুন</p>
        </Reveal>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {CATEGORY_CHIPS.map((cat, i) => (
            <Reveal key={cat.slug} delay={i * 40}>
              <Link
                to={`/photographers?cat=${cat.slug}`}
                className="glass-card rounded-xl3 p-4 flex flex-col items-center gap-2 hover:-translate-y-0.5 transition group"
              >
                <span className="size-[46px] rounded-full bg-sunset-gold/10 ring-1 ring-sunset-gold/25 text-xl flex items-center justify-center group-hover:bg-sunset-gold/20 transition">
                  {cat.icon}
                </span>
                <span className="text-[13px] font-semibold text-white/80 group-hover:text-sunset-gold transition text-center">
                  {cat.label}
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ (4) FEATURED PHOTOGRAPHERS ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-white/[0.08]">
        <Reveal className="text-center mb-12">
          <SectionEyebrow label="TOP RATED" />
          <h2 className="section-head">কক্সবাজারের সেরা ফটোগ্রাফাররা</h2>
          <p className="section-sub mt-2">
            রেটিং, রিভিউ আর পোর্টফোলিও দেখে বেছে নিন — যোগাযোগ ও বুকিং একদম ফ্রি
          </p>
        </Reveal>

        {loadingFeatured ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-80 rounded-xl3" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="glass rounded-xl3 p-12 text-center">
            <p className="text-lg font-semibold text-white/80">শীঘ্রই আসছে</p>
            <p className="text-sm text-white/50 mt-1">
              ভেরিফায়েড ফটোগ্রাফারদের প্রোফাইল যুক্ত হচ্ছে।
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featured.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 60}>
                <PhotographerCard p={p} />
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link to="/photographers" className="btn-primary">
            সব ফটোগ্রাফার দেখুন →
          </Link>
        </div>
      </section>

      {/* ═══ (5) HOW IT WORKS ═══ */}
      <section className="py-20 border-t border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <SectionEyebrow label="HOW IT WORKS" />
            <h2 className="section-head">মাত্র ৩ ধাপে বুকিং</h2>
            <p className="section-sub mt-2">ঝামেলাহীন প্রক্রিয়া — মিডলম্যান নেই, অতিরিক্ত খরচ নেই</p>
          </Reveal>

          <div className="relative">
            {/* Desktop connector line behind circles */}
            <div
              className="hidden sm:block absolute top-7 left-[16%] right-[16%] border-t-2 border-dashed border-sunset-gold/25 pointer-events-none"
              aria-hidden="true"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 relative z-10">
              <Reveal delay={0}>
                <div className="flex flex-col items-center text-center gap-3">
                  <span className="size-14 rounded-full bg-sunset-gradient text-[#2a1508] font-extrabold text-xl grid place-items-center shadow-[0_0_24px_rgba(251,191,36,0.25)]">
                    ১
                  </span>
                  <h3 className="font-bold text-white text-lg">খুঁজুন</h3>
                  <p className="text-sm text-white/60 leading-relaxed max-w-xs">
                    ক্যাটাগরি আর বাজেট ফিল্টারে পছন্দের ফটোগ্রাফার বাছুন
                  </p>
                </div>
              </Reveal>

              <Reveal delay={60}>
                <div className="flex flex-col items-center text-center gap-3">
                  <span className="size-14 rounded-full bg-sunset-gradient text-[#2a1508] font-extrabold text-xl grid place-items-center shadow-[0_0_24px_rgba(251,191,36,0.25)]">
                    ২
                  </span>
                  <h3 className="font-bold text-white text-lg">কাজ দেখুন</h3>
                  <p className="text-sm text-white/60 leading-relaxed max-w-xs">
                    পোর্টফোলিও, প্যাকেজ আর রিভিউ মিলিয়ে সিদ্ধান্ত নিন
                  </p>
                </div>
              </Reveal>

              <Reveal delay={120}>
                <div className="flex flex-col items-center text-center gap-3">
                  <span className="size-14 rounded-full bg-sunset-gradient text-[#2a1508] font-extrabold text-xl grid place-items-center shadow-[0_0_24px_rgba(251,191,36,0.25)]">
                    ৩
                  </span>
                  <h3 className="font-bold text-white text-lg">বুক করুন</h3>
                  <p className="text-sm text-white/60 leading-relaxed max-w-xs">
                    তারিখ ঠিক করে বুকিং পাঠান, ফটোগ্রাফার সাথে সাথে রেসপন্স করবে
                  </p>
                </div>
              </Reveal>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link to="/how-it-works" className="btn-ghost">
              কীভাবে কাজ করে বিস্তারিত দেখুন →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ (6) BUDGET SECTION ═══ */}
      <section className="py-20 bg-white/[0.02] border-y border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal className="text-center mb-14">
            <SectionEyebrow label="TRANSPARENT BUDGET" />
            <h2 className="section-head">বাজেট আগে ঠিক, তারপর বুকিং</h2>
            <p className="section-sub mt-2">প্রতিটি ফটোগ্রাফারের প্যাকেজে দাম স্পষ্ট — লুকানো খরচ নেই</p>
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-5">
            {/* Tier A */}
            <Reveal delay={0}>
              <div className="rounded-xl3 glass-card p-6 flex flex-col justify-between h-full relative">
                <div>
                  <span className="chip !text-[11.5px] !py-0.5 !px-2.5 bg-white/5 border border-white/10 text-white/80">
                    ছবি ভিত্তিক
                  </span>
                  <div className="mt-4 mb-2">
                    <span className="font-extrabold text-2xl grad-text">৳১০০</span>
                    <span className="text-base text-white/70">/ছবি</span>
                    <span className="text-sm text-white/50 ml-1">থেকে</span>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed mt-2">
                    শুধু দরকারি শট — একক ছবি বা ছোট বান্ডেল
                  </p>
                </div>
                <div className="pt-4 mt-6 border-t border-white/[0.08] text-[12.5px] text-white/50 font-medium">
                  যেমন: ১০ ছবি = ৳১,০০০
                </div>
              </div>
            </Reveal>

            {/* Tier B - Highlighted */}
            <Reveal delay={60}>
              <div className="rounded-xl3 glass-card p-6 flex flex-col justify-between h-full relative ring-2 ring-sunset-gold/50 shadow-[0_0_30px_rgba(251,191,36,0.12)]">
                <span className="badge absolute -top-3 left-6 bg-sunset-gradient text-[#2a1508] text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                  জনপ্রিয়
                </span>
                <div>
                  <span className="chip !text-[11.5px] !py-0.5 !px-2.5 bg-sunset-gold/15 text-sunset-gold border border-sunset-gold/30">
                    ঘণ্টা ভিত্তিক
                  </span>
                  <div className="mt-4 mb-2">
                    <span className="font-extrabold text-2xl grad-text">৳১,৫০০</span>
                    <span className="text-base text-white/70">/ঘণ্টা</span>
                    <span className="text-sm text-white/50 ml-1">থেকে</span>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed mt-2">
                    ছোট সেশন, ইভেন্ট বা ট্রাভেল শুট
                  </p>
                </div>
                <div className="pt-4 mt-6 border-t border-white/[0.08] text-[12.5px] text-white/50 font-medium">
                  যেমন: ৩ ঘণ্টা = ৳৪,৫০০
                </div>
              </div>
            </Reveal>

            {/* Tier C */}
            <Reveal delay={120}>
              <div className="rounded-xl3 glass-card p-6 flex flex-col justify-between h-full relative">
                <div>
                  <span className="chip !text-[11.5px] !py-0.5 !px-2.5 bg-white/5 border border-white/10 text-white/80">
                    ফুল প্যাকেজ
                  </span>
                  <div className="mt-4 mb-2">
                    <span className="font-extrabold text-2xl grad-text">৳২,৫০০+</span>
                    <span className="text-sm text-white/50 ml-1">থেকে</span>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed mt-2">
                    প্রি-ওয়েডিং, বিয়ে বা পুরো ট্যুর কভারেজ
                  </p>
                </div>
                <div className="pt-4 mt-6 border-t border-white/[0.08] text-[12.5px] text-white/50 font-medium">
                  প্যাকেজে সাধারণত এডিট করা ছবি অন্তর্ভুক্ত
                </div>
              </div>
            </Reveal>
          </div>

          <div className="mt-10 text-center flex flex-col items-center gap-4">
            <p className="text-sm text-white/60">
              সার্চ পেজে বাজেট স্লাইডার দিয়ে নিজের সীমা সেট করুন
            </p>
            <Link to="/photographers?maxP=2500" className="btn-primary px-7">
              আপনার বাজেটে খুঁজুন →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ (8) ট্যুর পয়েন্ট গাইড — ব্লগ-স্টাইল প্রিমিয়াম কার্ড ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <Reveal className="text-center mb-12">
          <h2 className="section-head">🧭 ট্যুর পয়েন্ট গাইড</h2>
          <p className="section-sub mt-2">
            প্রতিটি স্পটের আসল ছবি, ভাড়া, টিকিট, খাওয়া আর ঢাকা থেকে যাওয়ার পুরো রুট
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {guideCards.map(({ spot, photo, guide, cost }, i) => (
            <Reveal key={spot.key} delay={i * 60}>
              <Link
                to={`/spot/${spot.key}`}
                className="glass-card overflow-hidden flex flex-col rounded-xl3 group h-full"
              >
                <div className="relative h-48 w-full bg-twilight-800 overflow-hidden">
                  {photo ? (
                    <img
                      src={cldUrl(photo, { w: 640, c: 'fill' })}
                      srcSet={[480, 640].map((w) => `${cldUrl(photo, { w, c: 'fill' })} ${w}w`).join(', ')}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      alt={`${spot.nameBn} — ${spot.nameEn}`}
                      loading={i < 2 ? 'eager' : 'lazy'}
                      onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-sunset-soft flex items-center justify-center text-4xl">
                      {SPOT_KIND_EMOJI[spot.kind] || '📍'}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute top-3 left-3 chip !text-[11.5px] !py-0.5 !px-2 bg-black/40">
                    {SPOT_KIND_EMOJI[spot.kind]} {SPOT_KIND_BN[spot.kind] || spot.kind}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-lg group-hover:text-sunset-gold transition leading-snug">
                      {spot.nameBn}
                    </h3>
                    <p className="text-[12.5px] text-white/45 mt-0.5">{spot.nameEn}</p>
                    <p className="text-sm text-white/60 line-clamp-2 mt-2 leading-relaxed">
                      {guide ? guide.intro : spot.descBn}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/[0.08] flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="text-white/55 truncate">🛺 {cost.vara}</span>
                    <span className="text-white/55 truncate">🎟️ {cost.ticket}</span>
                    <span className="text-sunset-gold font-bold whitespace-nowrap">গাইড →</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link to="/blog" className="btn-ghost">
            সব ১৯টি স্পটের গাইড দেখুন →
          </Link>
        </div>
      </section>

      {/* ═══ (9) ফটো গ্যালারি — সাইড-স্ক্রল + দৃশ্যমান prev/next ═══ */}
      <PhotoGallery />

      {/* ═══ (10) REVIEWS ═══ */}
      {reviews.length > 0 && (
        <section className="py-20 border-t border-white/[0.08]">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal className="text-center mb-12">
              <SectionEyebrow label="REAL REVIEWS" />
              <h2 className="section-head">ক্লায়েন্টরা যা বলেন</h2>
              <p className="section-sub mt-2">ভেরিফায়েড বুকিং শেষে দেওয়া সত্যিকারের রিভিউ</p>
            </Reveal>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {reviews.map((rev, i) => {
                const dateStr = rev.created_at
                  ? new Intl.DateTimeFormat('bn-BD', { year: 'numeric', month: 'long', calendar: 'gregory' }).format(new Date(rev.created_at))
                  : '';
                const rating = Math.min(5, Math.max(1, Math.round(rev.rating || 5)));
                const customerName = rev.customer?.full_name || 'ক্লায়েন্ট';
                const photogName = rev.photographer?.display_name || 'ফটোগ্রাফার';

                return (
                  <Reveal key={i} delay={i * 60}>
                    <div className="glass-card rounded-xl3 p-6 flex flex-col gap-4 h-full justify-between">
                      <div>
                        {/* Rating stars + Date */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1 text-sunset-gold text-sm" aria-label={`রেটিং: ${rating} স্টার`}>
                            {Array.from({ length: 5 }).map((_, sIdx) => (
                              <span key={sIdx} className={sIdx < rating ? 'text-sunset-gold' : 'text-white/15'}>
                                ★
                              </span>
                            ))}
                          </div>
                          {dateStr && <span className="text-[12px] text-white/40">{dateStr}</span>}
                        </div>

                        {/* Comment — না থাকলে বানানো লেখা নয়, শুধু স্টার আর নাম দেখাও */}
                        {rev.comment && (
                          <p className="text-[15px] text-white/75 leading-relaxed">
                            {rev.comment}
                          </p>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-end justify-between pt-4 border-t border-white/[0.08] mt-2">
                        <div>
                          <div className="font-semibold text-white/85 text-sm">{customerName}</div>
                          <div className="text-white/45 text-[13px]">— {photogName} এর সেশন</div>
                        </div>
                        <span className="text-sunset-gold/40 text-3xl leading-none select-none font-serif">
                          ❝
                        </span>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ (11) BLOG TEASERS ═══ */}
      {posts.length > 0 && (
        <section className="py-20 border-t border-white/[0.08] bg-white/[0.02]">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal className="text-center mb-12">
              <SectionEyebrow label="TRAVEL GUIDES" />
              <h2 className="section-head">ট্রাভেল গাইড ও টিপস</h2>
              <p className="section-sub mt-2">
                কক্সবাজার ঘুরতে যারা — খরচ, রুট, হোটেল আর বেস্ট টাইম নিয়ে পুরো গাইড
              </p>
            </Reveal>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, i) => (
                <Reveal key={post.slug} delay={i * 60}>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="glass-card overflow-hidden rounded-xl3 group h-full flex flex-col"
                  >
                    <div className="relative h-44 w-full bg-twilight-800 overflow-hidden">
                      {post.cover_url ? (
                        <img
                          src={post.cover_url}
                          alt={post.title}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-sunset-soft flex items-center justify-center text-3xl text-sunset-gold/50">
                          📷
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-white text-base line-clamp-2 group-hover:text-sunset-gold transition leading-snug">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-sm text-white/60 line-clamp-2 mt-2 leading-relaxed">
                            {post.excerpt}
                          </p>
                        )}
                      </div>

                      <div className="mt-auto pt-4 border-t border-white/[0.08] flex items-center justify-end">
                        <span className="text-[12.5px] text-sunset-gold font-bold group-hover:translate-x-0.5 transition-transform">
                          পুরো গাইড পড়ুন →
                        </span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link to="/blog" className="btn-ghost">
                সব গাইড দেখুন →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ (12) JOIN CTA BANNER ═══ */}
      <section className="py-16 max-w-5xl mx-auto px-6">
        <Reveal>
          <div className="relative rounded-[26px] p-[1.5px] bg-gradient-to-br from-sunset-gold/70 via-sunset-coral/40 to-transparent">
            <div className="rounded-[24px] bg-[#0b0d15] px-6 py-12 sm:px-12 text-center relative overflow-hidden">
              {/* Decorative radial glow */}
              <div
                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.16),transparent_60%)] pointer-events-none"
                aria-hidden="true"
              />

              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="section-head">আপনি কি কক্সবাজারের ফটোগ্রাফার?</h2>
                <p className="section-sub mt-2">
                  ফটোলাগবে-তে প্রোফাইল খুলুন — ক্লায়েন্ট নিজেই খুঁজে এসে বুক করবে। প্রোফাইল, পোর্টফোলিও আর প্যাকেজ সেটআপ একদম ফ্রি।
                </p>

                <div className="mt-7">
                  <Link to="/auth" className="btn-primary px-8">
                    ফটোগ্রাফার হিসেবে যুক্ত হোন
                  </Link>
                </div>

                <p className="text-[12.5px] text-white/40 mt-4">
                  KYC ভেরিফিকেশন সম্পন্ন করলে ✓ ভেরিফায়েড ব্যাজ পাবেন
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
