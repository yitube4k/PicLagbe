import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Photographer } from '../lib/types';
import { COX_SPOTS, SPOT_BY_KEY, SPOT_KIND_BN } from '../lib/constants';
import { SPOT_PHOTOS } from '../lib/spotPhotos';
import { SPOT_GUIDES, spotCostSummary } from '../lib/spotGuides';
import { cldUrl } from '../lib/cloudinary';
import { HERO_SCENIC, GALLERY_SCENIC, scenicUrl } from '../lib/scenicPhotos';
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

/* ═══ HERO AUTO-SLIDER — সিনিক ছবি (সমুদ্র/পাহাড়/নৌকা/ঢেউ/আকাশ) — ২-লেয়ার ক্রসফেড,
       প্রতিবারে সর্বোচ্চ ২টা <img>; শুধু পরের স্লাইড প্রিলোড হয়; স্পট-ক্যাপশন নেই ═══ */
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

/* ═══ ফটো গ্যালারি — অনুভূমিক স্ক্রল-স্ন্যাপ + দৃশ্যমান prev/next বৃত্তাকার বাটন ═══ */
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
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadFeatured() {
      try {
        const res = await supabase
          .from('photographers')
          .select('*, photographer_categories(category_id, categories(name, slug, icon))')
          .eq('profile_status', 'approved')
          .order('rating_avg', { ascending: false })
          .limit(10);

        if (!active) return;

        if (res.error) {
          console.error('Featured photographers fetch error:', res.error);
        } else {
          setFeatured((res.data as Photographer[]) || []);
        }
      } catch (err) {
        if (active) console.error('Home data load error:', err);
      } finally {
        if (active) setLoadingFeatured(false);
      }
    }

    loadFeatured();
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
      {/* ═══ HERO — ১০০% ফুল-স্ক্রিন (সব ডিভাইসে), ফিক্সড নেভবারের নিচে এজ-টু-এজ ═══ */}
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

      {/* ═══ সব ট্যুর পয়েন্ট — গোল আইকন + নিচে নাম (হিরোর ঠিক পরেই) ═══ */}
      <section className="py-12 sm:py-16 border-y border-white/[0.08] bg-white/[0.02]">
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

      {/* ═══ ট্যুর পয়েন্ট গাইড — ব্লগ-স্টাইল প্রিমিয়াম কার্ড (পয়েন্টের নিচে) ═══ */}
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

      {/* ═══ FEATURED PHOTOGRAPHERS — ১০ জন + সব ফটোগ্রাফার ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-white/[0.08]">
        <Reveal className="text-center mb-12">
          <h2 className="section-head">ফিচার্ড ফটোগ্রাফার</h2>
          <p className="section-sub mt-2">
            কক্সবাজারের সেরা রেটেড, ভেরিফায়েড প্রফেশনালরা
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

      {/* ═══ ফটো গ্যালারি — সাইড-স্ক্রল + দৃশ্যমান prev/next (পেজের শেষ সেকশন) ═══ */}
      <PhotoGallery />
    </div>
  );
}
