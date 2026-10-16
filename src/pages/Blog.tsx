import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BlogPost } from '../lib/types';
import { toBn, bnDate } from '../lib/utils';
import { COX_SPOTS, SPOT_BY_KEY, SPOT_KIND_BN } from '../lib/constants';
import { SPOT_PHOTOS } from '../lib/spotPhotos';
import { SPOT_GUIDES, spotCostSummary } from '../lib/spotGuides';
import { cldUrl } from '../lib/cloudinary';
import Reveal from '../components/Reveal';

const SPOT_KIND_EMOJI: Record<string, string> = {
  beach: '🏖️',
  point: '📍',
  island: '🏝️',
  landmark: '🏛️',
  park: '🌲',
  drive: '🛣️',
};

/**
 * ব্লগ — ট্রাভেল ও ফটোগ্রাফি গাইড হাব:
 *  ১) ১৯টি ট্যুর পয়েন্টের প্রিমিয়াম গাইড কার্ড (আসল ছবি + ভাড়া + টিকিট)
 *  ২) DB থেকে পাবলিশড আর্টিকেল
 */
export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [kindFilter, setKindFilter] = useState<string>('all');

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('published', true)
          .order('created_at', { ascending: false });

        if (!active) return;
        if (error) console.error('Blog posts fetch error:', error);
        else setPosts((data as BlogPost[]) || []);
      } catch (err) {
        if (active) console.error('Blog posts load error:', err);
      } finally {
        if (active) setLoadingPosts(false);
      }
    }

    loadPosts();
    return () => {
      active = false;
    };
  }, []);

  const getReadTime = (content?: string | null) => {
    if (!content) return 1;
    return Math.ceil(content.length / 800);
  };

  const kinds = ['all', 'beach', 'point', 'island', 'landmark', 'park', 'drive'];
  const kindLabels: Record<string, string> = {
    all: 'সব স্পট',
    beach: 'সৈকত',
    point: 'পয়েন্ট',
    island: 'দ্বীপ',
    landmark: 'ল্যান্ডমার্ক',
    park: 'পার্ক',
    drive: 'স্কেনিক রোড',
  };

  const filteredSpots = kindFilter === 'all' ? COX_SPOTS : COX_SPOTS.filter((s) => s.kind === kindFilter);
  const featuredPost = posts[0];
  const gridPosts = posts.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 pb-20">
      {/* Header */}
      <div className="mb-8">
        <h2 className="section-head">🧭 ট্রাভেল ও ফটোগ্রাফি গাইড</h2>
        <p className="section-sub mt-1">
          কক্সবাজারের ১৯টি ট্যুর পয়েন্টের সম্পূর্ণ গাইড — ছবি, ভাড়া, টিকিট, খাওয়া আর ঢাকা থেকে রুট
        </p>
      </div>

      {/* Kind filter chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKindFilter(k)}
            className={
              kindFilter === k
                ? 'chip-active rounded-full px-4 py-1.5 text-xs'
                : 'chip !py-1.5 !text-xs text-white/70 hover:text-white'
            }
          >
            {kindLabels[k]}
          </button>
        ))}
      </div>

      {/* ═══ স্পট গাইড কার্ড ═══ */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSpots.map((spot, i) => {
          const photo = SPOT_PHOTOS[spot.key];
          const guide = SPOT_GUIDES[spot.key];
          const cost = spotCostSummary(spot.key);

          return (
            <Reveal key={spot.key} delay={(i % 6) * 50}>
              <Link
                to={`/spot/${spot.key}`}
                className="glass-card overflow-hidden flex flex-col rounded-xl3 group h-full"
              >
                <div className="relative h-48 w-full bg-twilight-800 overflow-hidden">
                  {photo ? (
                    <img
                      src={cldUrl(photo, { w: 640, c: 'fill' })}
                      srcSet={[480, 640].map((w) => `${cldUrl(photo, { w, c: 'fill' })} ${w}w`).join(', ')}
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      alt={`${spot.nameBn} — ${spot.nameEn}`}
                      loading={i < 3 ? 'eager' : 'lazy'}
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
                  {guide && (
                    <span className="absolute bottom-3 right-3 text-[11.5px] font-bold text-white bg-black/45 rounded-full px-2.5 py-1">
                      ⏱ {toBn(Math.ceil(guide.intro.length / 120))} মিনিটে পড়ুন
                    </span>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white text-base group-hover:text-sunset-gold transition leading-snug">
                      {spot.nameBn}
                    </h4>
                    <p className="text-[12.5px] text-white/45 mt-0.5">{spot.nameEn}</p>
                    <p className="text-sm text-white/60 line-clamp-2 mt-2 leading-relaxed">
                      {guide ? guide.intro : spot.descBn}
                    </p>
                  </div>

                  {/* ভাড়া + টিকিট summary */}
                  <div className="pt-4 mt-4 border-t border-white/[0.08] flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="text-white/55 truncate">🛺 {cost.vara}</span>
                    <span className="text-white/55 truncate">🎟️ {cost.ticket}</span>
                    <span className="text-sunset-gold font-bold whitespace-nowrap">গাইড →</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>

      {/* ═══ DB আর্টিকেল ═══ */}
      <div className="mt-20">
        <h2 className="section-head !text-2xl">📚 আরও আর্টিকেল</h2>
        <p className="section-sub mt-1">শুট টিপস, লোকেশন সিক্রেট আর ফটোগ্রাফার স্টোরি</p>

        {loadingPosts ? (
          <div className="space-y-6 mt-8">
            <div className="skeleton h-80 rounded-xl3 w-full" />
            <div className="grid md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-72 rounded-xl3" />
              ))}
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-xl3 max-w-lg mx-auto mt-8">
            <h3 className="text-xl font-bold text-white mb-2">শীঘ্রই নতুন আর্টিকেল আসছে</h3>
            <p className="text-sm text-white/60">
              আমাদের টিম কক্সবাজারের সেরা ফটোগ্রাফি টিপস ও গাইড তৈরি করছে।
            </p>
          </div>
        ) : (
          <div className="space-y-10 mt-8">
            {/* Featured Post */}
            {featuredPost && (
              <Reveal>
                <Link
                  to={`/blog/${featuredPost.slug}`}
                  className="glass-card overflow-hidden grid md:grid-cols-2 rounded-xl3 group block"
                >
                  <div className="relative h-full min-h-[280px] bg-twilight-800 overflow-hidden">
                    {featuredPost.cover_url ? (
                      <img
                        src={cldUrl(featuredPost.cover_url, { w: 960, c: 'fill' })}
                        alt={featuredPost.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-sunset-soft" />
                    )}
                  </div>

                  <div className="p-8 flex flex-col justify-between">
                    <div>
                      <span className="badge bg-sunset-gradient text-[#1A0E06] font-bold">
                        🌟 ফিচার্ড
                      </span>
                      <h3 className="text-2xl font-extrabold text-white group-hover:text-sunset-gold transition mt-3 leading-tight">
                        {featuredPost.title}
                      </h3>
                      <p className="text-white/65 mt-3 line-clamp-3 text-sm sm:text-base leading-relaxed">
                        {featuredPost.excerpt}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-white/50 pt-6 mt-6 border-t border-white/[0.08]">
                      <span>{bnDate(featuredPost.created_at)}</span>
                      <span>⏱ {toBn(getReadTime(featuredPost.content))} মিনিট পড়া</span>
                      <span>{featuredPost.author || 'ফটোলাগবে টিম'}</span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            )}

            {/* Grid Posts */}
            {gridPosts.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gridPosts.map((post, i) => {
                  const readMin = getReadTime(post.content);
                  const tags = post.tags || [];

                  return (
                    <Reveal key={post.id} delay={i * 60}>
                      <Link
                        to={`/blog/${post.slug}`}
                        className="glass-card overflow-hidden flex flex-col rounded-xl3 group h-full"
                      >
                        <div className="relative h-44 w-full bg-twilight-800 overflow-hidden">
                          {post.cover_url ? (
                            <img
                              src={cldUrl(post.cover_url, { w: 640, c: 'fill' })}
                              alt={post.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-sunset-soft" />
                          )}
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {tags.slice(0, 2).map((t, tIdx) => (
                                  <span key={tIdx} className="chip !text-[11.5px] !py-0.5 !px-2">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                            <h4 className="font-bold text-white text-base group-hover:text-sunset-gold transition line-clamp-2 leading-snug">
                              {post.title}
                            </h4>
                            <p className="text-sm text-white/55 line-clamp-2 mt-1.5 leading-relaxed">
                              {post.excerpt}
                            </p>
                          </div>

                          <div className="pt-4 mt-4 border-t border-white/[0.08] flex items-center justify-between text-[12.5px] text-white/45">
                            <span>{bnDate(post.created_at)}</span>
                            <span>{toBn(readMin)} মিনিট</span>
                          </div>
                        </div>
                      </Link>
                    </Reveal>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
