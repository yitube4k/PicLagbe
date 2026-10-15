import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Photographer, Review } from '../lib/types';
import { toBn } from '../lib/utils';
import { COX_SPOTS } from '../lib/constants';
import Reveal from '../components/Reveal';
import SearchPanel from '../components/SearchPanel';
import PhotographerCard from '../components/PhotographerCard';

const SPOT_KIND_EMOJI: Record<string, string> = {
  beach: '🏖️',
  point: '📍',
  island: '🏝️',
  landmark: '🏛️',
  park: '🌲',
  drive: '🛣️',
};

const HOW_IT_WORKS_STEPS = [
  {
    num: 1,
    title: 'খুঁজুন',
    desc: 'স্পট-ভিত্তিক সার্চ করুন ও কক্সবাজারের ভেরিফায়েড প্রোফাইল দেখুন।',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    num: 2,
    title: 'ম্যাপে দেখুন',
    desc: 'ইনানী-হিমছড়ি-সেন্ট মার্টিনসহ ১৯টি স্পটে তাৎক্ষণিক লোকেশন দেখুন।',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
  },
  {
    num: 3,
    title: 'বুক করুন',
    desc: 'প্যাকেজ বেছে তারিখ দিন এবং স্বচ্ছ বাজেটে সরাসরি বুকিং নিশ্চিত করুন।',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M9 16l2 2 4-4" />
      </svg>
    ),
  },
  {
    num: 4,
    title: 'স্মৃতি ধরুন',
    desc: 'শুট শেষে রিভিউ দিন এবং প্রিমিয়াম এডিটেড ছবি ঘরে বসেই বুঝে নিন।',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
];

type EnrichedReview = Review & {
  profiles?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  photographers?: {
    display_name?: string | null;
    slug?: string | null;
  } | null;
};

export default function Home() {
  const [heroImgError, setHeroImgError] = useState(false);

  const [featured, setFeatured] = useState<Photographer[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  const [reviews, setReviews] = useState<EnrichedReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadHomeData() {
      try {
        const [photographersRes, reviewsRes] = await Promise.all([
          supabase
            .from('photographers')
            .select('*, photographer_categories(category_id, categories(name, slug, icon))')
            .eq('profile_status', 'approved')
            .order('rating_avg', { ascending: false })
            .limit(6),
          supabase
            .from('reviews')
            .select('*, profiles(full_name, avatar_url), photographers(display_name, slug)')
            .order('created_at', { ascending: false })
            .limit(3),
        ]);

        if (!active) return;

        if (photographersRes.error) {
          console.error('Featured photographers fetch error:', photographersRes.error);
        } else {
          setFeatured((photographersRes.data as Photographer[]) || []);
        }

        if (reviewsRes.error) {
          console.error('Reviews fetch error:', reviewsRes.error);
        } else {
          setReviews((reviewsRes.data as EnrichedReview[]) || []);
        }
      } catch (err) {
        if (active) {
          console.error('Home data load error:', err);
        }
      } finally {
        if (active) {
          setLoadingFeatured(false);
          setLoadingReviews(false);
        }
      }
    }

    loadHomeData();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      {/* ═══ HERO SECTION ═══ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden pt-24 pb-16">
        {/* Background Layer */}
        <div className="absolute inset-0 bg-sunset-soft">
          {!heroImgError && (
            <img
              src="/img/hero.jpg"
              alt="কক্সবাজার সূর্যাস্ত"
              onError={() => setHeroImgError(true)}
              className="w-full h-full object-cover opacity-60"
            />
          )}
        </div>

        {/* Gradient & Radial Glow Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-twilight-950/70 via-twilight-950/40 to-twilight-950 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(251,191,36,0.22),transparent_50%)] pointer-events-none" />

        {/* Hero Content */}
        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full text-center">
          <Reveal>
            <span className="chip mb-6 inline-flex">
              🌊 কক্সবাজার — বিশ্বের দীর্ঘতম প্রাকৃতিক সমুদ্র সৈকত
            </span>

            <h1 className="text-[clamp(2.6rem,6vw,4.6rem)] font-extrabold leading-[1.1] text-white tracking-tight">
              <span className="block">কক্সবাজারের প্রিমিয়াম</span>
              <span className="block grad-text py-1">ফটোগ্রাফার খুঁজুন</span>
              <span className="block text-[0.72em] text-white/85 mt-1">এক ক্লিকে</span>
            </h1>

            <p className="text-white/70 max-w-2xl mx-auto mt-5 text-lg leading-relaxed">
              লাবণী থেকে সেন্ট মার্টিন — ভেরিফায়েড ফটোগ্রাফার, স্বচ্ছ বাজেট, রিয়েল রিভিউ। প্রি-ওয়েডিং, বিয়ে, ফ্যামিলি বা ট্রাভেল শুট — ফটোলাগবে-ই যথেষ্ট।
            </p>
          </Reveal>

          {/* Search Bar — প্রিমিয়াম শেয়ার্ড সার্চ প্যানেল */}
          <Reveal delay={100}>
            <SearchPanel variant="hero" />
          </Reveal>

          {/* Stats Row */}
          <Reveal delay={200}>
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="stat-card">
                <div className="stat-num">{toBn('120')}+</div>
                <div className="stat-label">ভেরিফায়েড ফটোগ্রাফার</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{toBn('3,500')}+</div>
                <div className="stat-label">শুট সম্পন্ন</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{toBn('4.9')}</div>
                <div className="stat-label">গড় রেটিং</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{toBn('19')}</div>
                <div className="stat-label">কক্সবাজার স্পট</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ SPOT MARQUEE SECTION ═══ */}
      <section className="py-8 border-y border-white/[0.08] bg-white/[0.02]">
        <p className="text-xs sm:text-sm text-center text-white/50 mb-5 font-medium tracking-wide">
          কক্সবাজারের সব শুটিং পয়েন্ট — ম্যাপে খুঁজুন
        </p>

        {/* Perf: static wrap-grid — continuous marquee animation removed (device lag) */}
        <div className="flex flex-wrap justify-center gap-2.5">
          {COX_SPOTS.map((s) => (
            <Link
              key={s.key}
              to={`/finder?spot=${encodeURIComponent(s.key)}`}
              className="chip hover:border-sunset-gold/50"
            >
              <span>{SPOT_KIND_EMOJI[s.kind] || '📍'}</span>
              <span>{s.nameBn}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ FEATURED PHOTOGRAPHERS SECTION ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <Reveal className="text-center mb-12">
          <h2 className="section-head">ফিচার্ড ফটোগ্রাফার</h2>
          <p className="section-sub mt-2">
            কক্সবাজারের সেরা রেটেড, ভেরিফায়েড প্রফেশনালরা
          </p>
        </Reveal>

        {loadingFeatured ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((p, i) => (
              <Reveal key={p.id} delay={i * 60}>
                <PhotographerCard p={p} />
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link to="/photographers" className="btn-ghost">
            সব ফটোগ্রাফার দেখুন →
          </Link>
        </div>
      </section>

      {/* ═══ HOW IT WORKS SECTION ═══ */}
      <section className="bg-white/[0.02] border-y border-white/[0.08] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal className="text-center mb-12">
            <h2 className="section-head">কীভাবে কাজ করে</h2>
            <p className="section-sub mt-2">
              মাত্র ৪টি সহজ ধাপে আপনার পছন্দের ফটোগ্রাফার বুক করুন
            </p>
          </Reveal>

          <div className="grid md:grid-cols-4 gap-6">
            {HOW_IT_WORKS_STEPS.map((step, i) => (
              <Reveal key={step.num} delay={i * 75}>
                <div className="glass-card p-6 text-center h-full flex flex-col items-center">
                  <div className="grad-text text-3xl font-extrabold mb-3">
                    {toBn(step.num)}
                  </div>
                  <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mb-4">
                    {step.icon}
                  </div>
                  <h3 className="font-bold text-lg text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed line-clamp-2">
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CUSTOMER REVIEWS SECTION ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <Reveal className="text-center mb-12">
          <h2 className="section-head">কাস্টমারদের ভালোবাসা</h2>
          <p className="section-sub mt-2">
            যাঁরা ফটোলাগবে-এর মাধ্যমে তাঁদের বিশেষ মুহূর্তগুলো ফ্রেমবন্দি করেছেন
          </p>
        </Reveal>

        {loadingReviews ? (
          <div className="grid md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-56 rounded-xl3" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="glass rounded-xl3 p-10 text-center text-white/60">
            এখনও কোনো রিভিউ যুক্ত হয়নি।
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {reviews.map((r, i) => {
              const reviewerName = r.profiles?.full_name || 'সম্মানিত গ্রাহক';
              const reviewerAvatar = r.profiles?.avatar_url;
              const photographerName =
                r.photographers?.display_name || 'ফটোগ্রাফার';

              return (
                <Reveal key={r.id || i} delay={i * 70}>
                  <div className="glass-card p-6 h-full flex flex-col justify-between">
                    <div>
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="rgba(251, 191, 36, 0.25)"
                        stroke="#fbbf24"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mb-4"
                      >
                        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
                      </svg>

                      <p className="text-white/80 leading-relaxed line-clamp-4 text-sm sm:text-base">
                        “{r.comment || 'অসাধারণ ফটোগ্রাফি এবং সময়মতো ডেলিভারি পেয়েছি!'}”
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-5 mt-5 border-t border-white/[0.08]">
                      <div className="flex items-center gap-3 min-w-0">
                        {reviewerAvatar ? (
                          <img
                            src={reviewerAvatar}
                            alt={reviewerName}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-sunset-gold/35 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-sunset-gradient flex items-center justify-center text-sm font-extrabold text-[#1A0E06] shrink-0">
                            {reviewerName.slice(0, 1)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">
                            {reviewerName}
                          </div>
                          {r.photographer_id && (
                            <Link
                              to={`/photographer/${r.photographer_id}`}
                              className="text-xs text-sunset-gold hover:underline truncate block"
                            >
                              → {photographerName}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ CALL TO ACTION SECTION ═══ */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <Reveal>
          <div className="glass-card relative overflow-hidden p-10 sm:p-12 text-center rounded-xl3 bg-sunset-soft">
            {/* Decorative Blurred Blobs */}
            <div className="w-64 h-64 rounded-full bg-sunset-gold/25 blur-3xl absolute -top-20 -left-20 pointer-events-none" />
            <div className="w-64 h-64 rounded-full bg-sunset-coral/25 blur-3xl absolute -bottom-20 -right-20 pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                আপনার মুহূর্ত ফ্রেমে বাঁধুন
              </h3>
              <p className="text-white/70 mt-3 text-base sm:text-lg leading-relaxed">
                সমুদ্রের গর্জন আর সোনালী সূর্যাস্তের মাঝে আপনার প্রিয় মানুষদের সাথে কাটানো প্রতিটি মুহূর্ত চিরস্মরণীয় করে রাখুন।
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
                <Link to="/photographers" className="btn-primary">
                  ফটোগ্রাফার খুঁজুন
                </Link>
                <Link to="/finder" className="btn-ghost">
                  ম্যাপ দেখুন
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
