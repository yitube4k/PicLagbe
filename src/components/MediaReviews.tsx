import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PortfolioImage, Review } from '../lib/types';
import { toBn, bnDate } from '../lib/utils';
import { cldUrl, cldSrcSet } from '../lib/cloudinary';

interface MediaReviewsProps {
  photographerId: string;
  /**
   * true হলে শুধু রিভিউ দেখানো হয় — ছবি/ভিডিও/ডেমো ট্যাব ও portfolio কোয়েরি বাদ যায়
   * (বুকিং পেজ হালকা ও দ্রুত রাখতে)
   */
  reviewsOnly?: boolean;
}

type TabType = 'photo' | 'video' | 'demo' | 'review';

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  {
    id: 'photo',
    label: 'ছবি',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    id: 'video',
    label: 'ভিডিও',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    id: 'demo',
    label: 'ডেমো শুট',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    id: 'review',
    label: 'রিভিউ',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

/**
 * Portfolio gallery (photo / video / demo) + reviews — ivory editorial theme.
 * Cloudinary URLs are delivered as auto-WebP with responsive srcSet;
 * non-Cloudinary (legacy) URLs pass through unchanged.
 */
export default function MediaReviews({ photographerId, reviewsOnly = false }: MediaReviewsProps) {
  const [tab, setTab] = useState<TabType>(reviewsOnly ? 'review' : 'photo');
  const [items, setItems] = useState<PortfolioImage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [brokenImgs, setBrokenImgs] = useState<Set<string>>(new Set());

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      try {
        const reviewsPromise = supabase
          .from('reviews')
          .select('*, profiles(full_name, avatar_url)')
          .eq('photographer_id', photographerId)
          .order('created_at', { ascending: false });

        // reviewsOnly মোডে portfolio কোয়েরি চালাই না (১টি কোয়েরি কম, পেজ দ্রুত)
        const portfolioPromise = reviewsOnly
          ? Promise.resolve({ data: null, error: null } as { data: PortfolioImage[] | null; error: unknown })
          : supabase
              .from('portfolio_images')
              .select('*')
              .eq('photographer_id', photographerId)
              .order('sort_order', { ascending: true });

        const [portfolioRes, reviewsRes] = await Promise.all([portfolioPromise, reviewsPromise]);

        if (!active) return;

        if (portfolioRes.error) {
          console.error('Portfolio fetch error:', portfolioRes.error);
          setItems([]);
        } else {
          setItems((portfolioRes.data as PortfolioImage[]) || []);
        }

        if (reviewsRes.error) {
          console.error('Reviews fetch error:', reviewsRes.error);
          setReviews([]);
        } else {
          setReviews((reviewsRes.data as Review[]) || []);
        }
      } catch (err) {
        if (active) {
          console.error('MediaReviews data load error:', err);
          setItems([]);
          setReviews([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (photographerId) {
      loadData();
    }

    return () => {
      active = false;
    };
  }, [photographerId]);

  // Split items by caption prefix (before effects that reference photoItems)
  const photoItems: PortfolioImage[] = [];
  const videoItems: { id: string; url: string; caption: string }[] = [];
  const demoItems: PortfolioImage[] = [];

  items.forEach((item) => {
    const cap = item.caption || '';
    if (cap.toLowerCase().startsWith('video:')) {
      videoItems.push({
        id: item.id,
        url: item.url,
        caption: cap.replace(/^video:\s*/i, ''),
      });
    } else if (cap.toLowerCase().startsWith('demo:')) {
      demoItems.push({
        ...item,
        caption: cap.replace(/^demo:\s*/i, ''),
      });
    } else {
      photoItems.push(item);
    }
  });

  // Lightbox keyboard & overflow listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null && prev < photoItems.length - 1 ? prev + 1 : 0));
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photoItems.length - 1));
      }
    };

    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex, photoItems.length]);

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      const vidId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${vidId}`;
    }
    if (url.includes('youtu.be/')) {
      const vidId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${vidId}`;
    }
    return url;
  };

  const isDirectVideo = (url: string) => {
    return (
      /\.(mp4|webm)(\?|$)/.test(url) && !url.includes('youtube')
    );
  };

  const markBroken = (imgId: string) => {
    setBrokenImgs((prev) => {
      const next = new Set(prev);
      next.add(imgId);
      return next;
    });
  };

  // Review analytics
  const reviewCount = reviews.length;
  const avgRating =
    reviewCount > 0
      ? reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / reviewCount
      : 0;

  const ratingDist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const star = Math.max(1, Math.min(5, Math.round(Number(r.rating || 5))));
    ratingDist[star] = (ratingDist[star] || 0) + 1;
  });

  const getInitials = (name?: string | null) => {
    if (!name || !name.trim()) return 'ফ';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="w-full space-y-6">
      {/* ── Tab bar (reviewsOnly হলে ট্যাব বাদ) ── */}
      <div className={reviewsOnly ? 'hidden' : 'flex justify-center'}>
        <div
          role="tablist"
          aria-label="পোর্টফোলিও ট্যাব"
          className="inline-flex flex-wrap justify-center gap-1 p-1.5 rounded-2xl border border-[#e6ddcc] bg-white/70"
        >
          {TABS.map((t) => {
            const count = t.id === 'review' ? reviewCount : undefined;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`${t.label}${count !== undefined ? ` (${count})` : ''}`}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  active
                    ? 'bg-[#1d4d3b] text-[#f7f3ec] shadow-sm'
                    : 'text-[#6b6357] hover:text-[#26231e] hover:bg-[#f1e8d8]/60'
                }`}
              >
                {t.icon}
                {t.label}
                {count !== undefined && <span className="text-[11px] opacity-75">({toBn(count)})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Loading ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`pf-skeleton ${i === 0 ? 'col-span-2 aspect-[8/5]' : 'aspect-[4/5]'}`} />
          ))}
        </div>
      ) : (
        <>
          {/* ── PHOTO TAB (asymmetric editorial grid) ── */}
          {tab === 'photo' && !reviewsOnly && (
            <div>
              {photoItems.length === 0 ? (
                <div className="pf-card p-10 text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#f1e8d8] flex items-center justify-center mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b08d57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <p className="font-bold text-[#26231e]">কোনো ছবি আপলোড করা হয়নি</p>
                  <p className="text-sm text-[#6b6357] mt-1">ফটোগ্রাফার শীঘ্রই তার সেরা কাজগুলো যোগ করবে ইনশাআল্লাহ।</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  {photoItems.map((img, idx) => {
                    const isHero = idx === 0;
                    const broken = brokenImgs.has(img.id);
                    return (
                      <figure
                        key={img.id}
                        onClick={() => !broken && setLightboxIndex(idx)}
                        role={broken ? undefined : 'button'}
                        tabIndex={broken ? undefined : 0}
                        onKeyDown={(e) => {
                          if (!broken && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            setLightboxIndex(idx);
                          }
                        }}
                        className={`relative overflow-hidden rounded-[14px] bg-[#ece5d8] border border-[#e6ddcc] ${
                          broken ? '' : 'cursor-pointer'
                        } ${isHero ? 'col-span-2 aspect-[8/5]' : 'aspect-[4/5]'}`}
                      >
                        {broken ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#8a8172]">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                            <span className="text-[11px] font-semibold">ছবি লোড হয়নি</span>
                          </div>
                        ) : (
                          <>
                            <img
                              src={cldUrl(img.url, { w: isHero ? 900 : 500, c: 'limit' })}
                              srcSet={cldSrcSet(img.url, [400, 800, 1200])}
                              sizes={isHero ? '(min-width: 768px) 66vw, 100vw' : '(min-width: 768px) 33vw, 50vw'}
                              alt={img.caption || 'পোর্টফোলিও ছবি'}
                              className="w-full h-full object-cover"
                              loading={isHero ? 'eager' : 'lazy'}
                              onError={() => markBroken(img.id)}
                            />
                            {img.caption && (
                              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#26231e]/75 to-transparent px-3 pt-6 pb-2.5 text-[11px] font-semibold text-white/95 truncate opacity-0 focus-within:opacity-100 md:hover:opacity-100 transition-opacity">
                                {img.caption}
                              </figcaption>
                            )}
                            <span className="absolute top-2.5 right-2.5 rounded-full bg-[#26231e]/55 text-white p-1.5 pointer-events-none" aria-hidden="true">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                <line x1="11" y1="8" x2="11" y2="14" />
                                <line x1="8" y1="11" x2="14" y2="11" />
                              </svg>
                            </span>
                          </>
                        )}
                      </figure>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── VIDEO TAB ── */}
          {tab === 'video' && !reviewsOnly && (
            <div>
              {videoItems.length === 0 ? (
                <div className="pf-card p-10 text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#f1e8d8] flex items-center justify-center mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b08d57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  </div>
                  <p className="font-bold text-[#26231e]">ভিডিও শীঘ্রই আসছে</p>
                  <p className="text-sm text-[#6b6357] mt-1">এই ফটোগ্রাফারের কোনো ভিডিও ফুটেজ এখনো যুক্ত হয়নি।</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-5">
                  {videoItems.map((v) => {
                    const direct = isDirectVideo(v.url);
                    return (
                      <div key={v.id} className="pf-card overflow-hidden">
                        <div className="w-full aspect-video bg-[#26231e] relative">
                          {direct ? (
                            <video
                              controls
                              preload="metadata"
                              src={v.url}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <iframe
                              src={getEmbedUrl(v.url)}
                              title={v.caption || 'ভিডিও শুট'}
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          )}
                        </div>
                        <div className="p-4 flex items-center justify-between gap-3">
                          <span className="font-bold text-[#26231e] text-sm truncate">{v.caption || 'রিয়েল শুট ফুটেজ'}</span>
                          <span className="shrink-0 rounded-full border border-[#e3d5b8] bg-[#f1e8d8] px-2.5 py-0.5 text-[10px] font-bold text-[#8a6d3b]">
                            রিয়েল শুট ফুটেজ
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── DEMO TAB ── */}
          {tab === 'demo' && !reviewsOnly && (
            <div className="space-y-5">
              <div className="rounded-[14px] border border-[#d9e6de] bg-[#eef5f1] p-4 flex gap-3 items-start">
                <div className="w-10 h-10 rounded-xl bg-[#1d4d3b] text-white flex items-center justify-center shrink-0" aria-hidden="true">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="pf-serif font-bold text-[#143528] text-sm">ডেমো শুট — কী পাবেন</h3>
                  <p className="text-[13px] text-[#3f5c50] mt-0.5 leading-relaxed">
                    প্রথমবারের কাস্টমারদের জন্য ছোট ট্রায়াল সেশন — ফুল বুকিংয়ের আগে ফটোগ্রাফারের স্টাইল ও দক্ষতা দেখে নিন।
                  </p>
                </div>
              </div>

              {demoItems.length === 0 ? (
                <div className="pf-card p-10 text-center">
                  <p className="font-bold text-[#26231e]">কোনো ডেমো শুট নেই</p>
                  <p className="text-sm text-[#6b6357] mt-1">ফটোগ্রাফার এখনো কোনো ডেমো সেশন যোগ করেননি।</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-5">
                  {demoItems.map((demo) => (
                    <div key={demo.id} className="pf-card overflow-hidden">
                      <div className="relative aspect-[4/3] bg-[#ece5d8]">
                        {brokenImgs.has(demo.id) ? (
                          <div className="w-full h-full flex items-center justify-center text-[#8a8172] text-xs font-semibold">
                            ছবি লোড হয়নি
                          </div>
                        ) : (
                          <img
                            src={cldUrl(demo.url, { w: 700, c: 'limit' })}
                            srcSet={cldSrcSet(demo.url, [400, 800])}
                            sizes="(min-width: 640px) 50vw, 100vw"
                            alt={demo.caption || 'ডেমো শুট'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={() => markBroken(demo.id)}
                          />
                        )}
                      </div>
                      <div className="p-4 flex items-center justify-between gap-3">
                        <span className="font-bold text-[#26231e] text-sm truncate">{demo.caption || 'ডেমো শুট'}</span>
                        <span className="shrink-0 rounded-full border border-[#e3d5b8] bg-[#f1e8d8] px-2.5 py-0.5 text-[10px] font-bold text-[#8a6d3b]">
                          ডেমো
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── REVIEW TAB ── */}
          {tab === 'review' && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="pf-card p-6 flex flex-wrap gap-8 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="pf-serif text-4xl font-bold text-[#1d4d3b] leading-none">
                    {toBn(avgRating.toFixed(1))}
                  </div>
                  <div>
                    <div className="flex items-center gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill={star <= Math.round(avgRating) ? '#b08d57' : 'none'}
                          stroke="#b08d57"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-[13px] text-[#6b6357] font-semibold">
                      {toBn(reviewCount)}টি রিভিউ প্রাপ্ত
                    </p>
                  </div>
                </div>

                {/* Distribution */}
                <div className="flex-1 min-w-[220px] max-w-xs space-y-1.5">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = ratingDist[stars] || 0;
                    const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-3 text-[11px] font-semibold">
                        <span className="text-[#6b6357] w-7">{toBn(stars)}★</span>
                        <div className="flex-1 h-2 rounded-full bg-[#ece5d8] overflow-hidden">
                          <div className="h-full rounded-full bg-[#b08d57]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[#8a8172] w-5 text-right">{toBn(count)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviews list */}
              {reviews.length === 0 ? (
                <div className="pf-card p-10 text-center">
                  <p className="font-bold text-[#26231e]">এখনো রিভিউ নেই</p>
                  <p className="text-sm text-[#6b6357] mt-1">সম্পন্ন বুকিংয়ের পর প্রথম রিভিউটি আপনিই দিতে পারেন!</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {reviews.map((r) => {
                    const reviewerName = r.profiles?.full_name || 'সম্মানিত গ্রাহক';
                    const reviewerAvatar = r.profiles?.avatar_url;
                    const stars = Math.max(1, Math.min(5, Number(r.rating || 5)));

                    return (
                      <article key={r.id} className="pf-card p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {reviewerAvatar ? (
                              <img
                                src={reviewerAvatar}
                                alt={reviewerName}
                                className="w-10 h-10 rounded-full object-cover border border-[#e6ddcc] shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#f1e8d8] flex items-center justify-center text-xs font-bold text-[#b08d57] shrink-0">
                                {getInitials(reviewerName)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-bold text-[#26231e] text-sm truncate">{reviewerName}</h4>
                              <p className="text-[11px] text-[#8a8172]">{bnDate(r.created_at)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0" aria-label={`${toBn(stars)} স্টার রেটিং`}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <svg
                                key={s}
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill={s <= stars ? '#b08d57' : 'none'}
                                stroke="#b08d57"
                                strokeWidth="1.8"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            ))}
                          </div>
                        </div>

                        <p className="text-[#4d463c] text-sm mt-3 leading-[1.8]">{r.comment || 'অসাধারণ অভিজ্ঞতা!'}</p>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Lightbox (fullscreen, keyboard nav) ── */}
      {lightboxIndex !== null && photoItems[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[95] bg-[#141210]/95 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ছবি ভিউয়ার"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
            aria-label="বন্ধ করুন"
            className="absolute top-5 right-5 rounded-full bg-white/10 border border-white/20 p-3 text-white/90 hover:text-white z-10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {lightboxIndex > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev !== null ? prev - 1 : 0)); }}
              aria-label="পূর্ববর্তী ছবি"
              className="absolute left-4 md:left-8 rounded-full bg-white/10 border border-white/20 w-12 h-12 flex items-center justify-center text-white/90 hover:text-white z-10 text-xl font-bold"
            >
              ‹
            </button>
          )}

          {lightboxIndex < photoItems.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev !== null ? prev + 1 : 0)); }}
              aria-label="পরবর্তী ছবি"
              className="absolute right-4 md:right-8 rounded-full bg-white/10 border border-white/20 w-12 h-12 flex items-center justify-center text-white/90 hover:text-white z-10 text-xl font-bold"
            >
              ›
            </button>
          )}

          <figure
            className="relative max-w-[92vw] max-h-[86vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={cldUrl(photoItems[lightboxIndex].url, { w: 1600, c: 'limit' })}
              alt={photoItems[lightboxIndex].caption || 'পোর্টফোলিও ছবি'}
              className="max-h-[78vh] max-w-full object-contain rounded-[14px]"
            />
            {photoItems[lightboxIndex].caption && (
              <figcaption className="mt-3 rounded-full bg-white/10 border border-white/15 px-5 py-2 text-sm font-semibold text-white/95">
                {photoItems[lightboxIndex].caption}
              </figcaption>
            )}
            <span className="mt-2 text-[11px] text-white/45 font-semibold">
              {toBn(lightboxIndex + 1)} / {toBn(photoItems.length)}
            </span>
          </figure>
        </div>
      )}
    </div>
  );
}
