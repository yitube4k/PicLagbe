import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PortfolioImage, Review } from '../lib/types';
import { toBn, bnDate } from '../lib/utils';
import { SITE } from '../lib/constants';

interface MediaReviewsProps {
  photographerId: string;
}

type TabType = 'photo' | 'video' | 'demo' | 'review';

export default function MediaReviews({ photographerId }: MediaReviewsProps) {
  const [tab, setTab] = useState<TabType>('photo');
  const [items, setItems] = useState<PortfolioImage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      try {
        const [portfolioRes, reviewsRes] = await Promise.all([
          supabase
            .from('portfolio_images')
            .select('*')
            .eq('photographer_id', photographerId)
            .order('sort_order', { ascending: true }),
          supabase
            .from('reviews')
            .select('*, profiles(full_name, avatar_url)')
            .eq('photographer_id', photographerId)
            .order('created_at', { ascending: false }),
        ]);

        if (!active) return;

        if (portfolioRes.error) {
          console.error('Portfolio fetch error:', portfolioRes.error);
        } else {
          setItems((portfolioRes.data as PortfolioImage[]) || []);
        }

        if (reviewsRes.error) {
          console.error('Reviews fetch error:', reviewsRes.error);
        } else {
          setReviews((reviewsRes.data as Review[]) || []);
        }
      } catch (err) {
        if (active) {
          console.error('MediaReviews data load error:', err);
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
  }, [lightboxIndex]);

  // Split items by prefix
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
      (url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('.mp4?')) &&
      !url.includes('youtube')
    );
  };

  // Review analytics
  const reviewCount = reviews.length;
  const avgRating =
    reviewCount > 0
      ? reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / reviewCount
      : 0;

  const ratingDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const star = Math.max(1, Math.min(5, Math.round(Number(r.rating || 5))));
    ratingDist[star as keyof typeof ratingDist] = (ratingDist[star as keyof typeof ratingDist] || 0) + 1;
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
    <div className="w-full space-y-8">
      {/* Tab Bar */}
      <div className="flex justify-center">
        <div className="glass rounded-full inline-flex p-1.5 gap-1 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => setTab('photo')}
            className={tab === 'photo' ? 'chip-active rounded-full px-5 py-2 text-sm' : 'chip !border-transparent text-white/75 hover:text-white'}
          >
            📷 ছবি
          </button>
          <button
            type="button"
            onClick={() => setTab('video')}
            className={tab === 'video' ? 'chip-active rounded-full px-5 py-2 text-sm' : 'chip !border-transparent text-white/75 hover:text-white'}
          >
            🎬 ভিডিও
          </button>
          <button
            type="button"
            onClick={() => setTab('demo')}
            className={tab === 'demo' ? 'chip-active rounded-full px-5 py-2 text-sm' : 'chip !border-transparent text-white/75 hover:text-white'}
          >
            ✨ ডেমো শুট
          </button>
          <button
            type="button"
            onClick={() => setTab('review')}
            className={tab === 'review' ? 'chip-active rounded-full px-5 py-2 text-sm' : 'chip !border-transparent text-white/75 hover:text-white'}
          >
            ⭐ রিভিউ ({toBn(reviewCount)})
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-64 rounded-xl2" />
          ))}
        </div>
      ) : (
        <>
          {/* PHOTO TAB */}
          {tab === 'photo' && (
            <div>
              {photoItems.length === 0 ? (
                <div className="glass rounded-xl3 p-12 text-center text-white/60">
                  কোনো ছবি আপলোড করা হয়নি।
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photoItems.map((img, idx) => {
                    const isHero = idx === 0;
                    return (
                      <figure
                        key={img.id}
                        onClick={() => setLightboxIndex(idx)}
                        className={`relative overflow-hidden rounded-xl2 cursor-pointer group bg-twilight-800 ${
                          isHero ? 'col-span-2 aspect-[8/5]' : 'aspect-[4/5]'
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.caption || 'পোর্টফোলিও ছবি'}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                          <span className="text-sm font-medium text-white truncate">
                            {img.caption || 'কক্সবাজার শ্যুট'}
                          </span>
                        </div>
                      </figure>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIDEO TAB */}
          {tab === 'video' && (
            <div>
              {videoItems.length === 0 ? (
                <div className="glass-card p-10 text-center rounded-xl3">
                  <p className="text-lg font-semibold text-white/80">🎬 ভিডিও শীঘ্রই আসছে</p>
                  <p className="text-sm text-white/50 mt-1">
                    এই ফটোগ্রাফারের কোনো ভিডিও ফুটেজ এখনো যুক্ত হয়নি।
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-5">
                  {videoItems.map((v) => {
                    const direct = isDirectVideo(v.url);
                    return (
                      <div key={v.id} className="glass-card overflow-hidden rounded-xl3">
                        <div className="w-full aspect-video bg-black relative">
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
                          <span className="font-semibold text-white text-sm truncate">
                            {v.caption || 'রিয়েল শুট ফুটেজ'}
                          </span>
                          <span className="badge shrink-0 bg-sunset-soft text-sunset-gold border-sunset-gold/30">
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

          {/* DEMO TAB */}
          {tab === 'demo' && (
            <div className="space-y-6">
              <div className="glass rounded-xl2 p-5 flex gap-4 items-center">
                <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center shrink-0 text-sunset-gold">
                  ✨
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">ডেমো শুট — কী পাবেন</h4>
                  <p className="text-sm text-white/65 mt-0.5 leading-relaxed">
                    প্রথমবারের কাস্টমারদের জন্য ছোট ট্রায়াল সেশন — ফুল বুকিংয়ের আগে ফটোগ্রাফারের স্টাইল ও দক্ষতা দেখে নিন।
                  </p>
                </div>
              </div>

              {demoItems.length === 0 ? (
                <div className="glass-card p-10 text-center rounded-xl3">
                  <p className="text-lg font-semibold text-white/80">কোনো ডেমো শুট নেই</p>
                  <p className="text-sm text-white/50 mt-1">
                    ফটোগ্রাফার এখনো কোনো ডেমো সেশন যোগ করেননি।
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-5">
                  {demoItems.map((demo) => (
                    <div key={demo.id} className="glass-card overflow-hidden rounded-xl3">
                      <div className="relative aspect-[4/3] bg-twilight-800 overflow-hidden">
                        <img
                          src={demo.url}
                          alt={demo.caption || 'ডেমো শুট'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-4 flex items-center justify-between gap-3">
                        <span className="font-semibold text-white text-sm truncate">
                          {demo.caption || 'ডেমো শুট'}
                        </span>
                        <span className="badge bg-sunset-soft text-sunset-gold border-sunset-gold/30 shrink-0">
                          ডেমো
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REVIEW TAB */}
          {tab === 'review' && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="glass rounded-xl3 p-6 flex flex-wrap gap-8 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="stat-num">{toBn(avgRating.toFixed(1))}</div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill={star <= Math.round(avgRating) ? '#fbbf24' : 'none'}
                          stroke="#fbbf24"
                          strokeWidth="2"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-sm text-white/60 font-medium">
                      {toBn(reviewCount)} রিভিউ প্রাপ্ত
                    </p>
                  </div>
                </div>

                {/* Rating Distribution Bars */}
                <div className="flex-1 max-w-xs space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = ratingDist[stars as keyof typeof ratingDist];
                    const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs">
                        <span className="text-white/60 w-8">{toBn(stars)}★</span>
                        <div className="flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                          <div
                            className="h-full bg-sunset-gradient rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-white/50 w-6 text-right">{toBn(count)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviews List */}
              {reviews.length === 0 ? (
                <div className="glass-card p-10 text-center rounded-xl3">
                  <p className="text-white/80 font-medium">
                    এখনো রিভিউ নেই — প্রথম রিভিউটি আপনিই দিতে পারেন!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => {
                    const reviewerName = r.profiles?.full_name || 'সম্মানিত গ্রাহক';
                    const reviewerAvatar = r.profiles?.avatar_url;
                    const stars = Math.max(1, Math.min(5, Number(r.rating || 5)));

                    return (
                      <div key={r.id} className="glass-card p-5 rounded-xl3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {reviewerAvatar ? (
                              <img
                                src={reviewerAvatar}
                                alt={reviewerName}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-sunset-gold/30 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-sunset-gradient flex items-center justify-center text-xs font-bold text-[#1A0E06] shrink-0">
                                {getInitials(reviewerName)}
                              </div>
                            )}
                            <div>
                              <h4 className="font-semibold text-white text-sm">
                                {reviewerName}
                              </h4>
                              <p className="text-xs text-white/45">
                                {bnDate(r.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <svg
                                key={s}
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill={s <= stars ? '#fbbf24' : 'none'}
                                stroke="#fbbf24"
                                strokeWidth="2"
                              >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            ))}
                          </div>
                        </div>

                        <p className="text-white/80 text-sm mt-3 leading-relaxed">
                          {r.comment || 'অসাধারণ অভিজ্ঞতা!'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Lightbox Modal */}
      {lightboxIndex !== null && photoItems[lightboxIndex] && (
        <div className="lb-backdrop flex items-center justify-center z-[95] p-4">
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="বন্ধ করুন"
            className="absolute top-6 right-6 glass rounded-full p-3 text-white/90 hover:text-white z-10"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {lightboxIndex > 0 && (
            <button
              type="button"
              onClick={() => setLightboxIndex((prev) => (prev !== null ? prev - 1 : 0))}
              aria-label="পূর্ববর্তী ছবি"
              className="absolute left-6 glass rounded-full w-12 h-12 flex items-center justify-center text-white/90 hover:text-white z-10 text-xl font-bold"
            >
              ‹
            </button>
          )}

          {lightboxIndex < photoItems.length - 1 && (
            <button
              type="button"
              onClick={() => setLightboxIndex((prev) => (prev !== null ? prev + 1 : 0))}
              aria-label="পরবর্তী ছবি"
              className="absolute right-6 glass rounded-full w-12 h-12 flex items-center justify-center text-white/90 hover:text-white z-10 text-xl font-bold"
            >
              ›
            </button>
          )}

          <div className="relative max-w-[92vw] max-h-[85vh] flex flex-col items-center">
            <img
              src={photoItems[lightboxIndex].url}
              alt={photoItems[lightboxIndex].caption || 'ভিউ'}
              className="max-h-[80vh] max-w-full object-contain rounded-xl2 shadow-glass-lg"
            />
            {photoItems[lightboxIndex].caption && (
              <div className="glass-strong px-5 py-2.5 rounded-full absolute -bottom-14 text-sm font-medium text-white shadow-glass-sm">
                {photoItems[lightboxIndex].caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
