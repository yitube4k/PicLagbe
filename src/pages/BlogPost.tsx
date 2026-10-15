import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BlogPost } from '../lib/types';
import { toBn, bnDate } from '../lib/utils';
import { SPOT_BY_KEY, SPOT_KIND_BN } from '../lib/constants';
import { matchSpotKey, SPOT_PHOTOS } from '../lib/spotPhotos';
import { openDirections } from './Finder';
import { cldUrl } from '../lib/cloudinary';

/** স্পটে available ফটোগ্রাফার সংখ্যা (parent থেকে আসে) */
interface SpotStat {
  count: number;
  minPrice: number | null;
}

/* ═══ LOCATION CARD — লোকেশনের আসল ছবি + নিচে ফটোগ্রাফার+গাইড+ডিরেকশন এক রো-তে ═══ */
function LocationCard({ spotKey, stat }: { spotKey: string; stat?: SpotStat }) {
  const spot = SPOT_BY_KEY(spotKey);
  if (!spot) return null;

  const photo = SPOT_PHOTOS[spotKey];
  const hasPgs = (stat?.count || 0) > 0;

  return (
    <figure id={`loc-spot-${spotKey}`} className="my-7 scroll-mt-28">
      {/* আসল লোকেশন ছবি */}
      <div className="relative rounded-[16px] overflow-hidden border border-white/10 bg-twilight-800">
        {photo ? (
          <img
            src={cldUrl(photo, { w: 960, c: 'fill' })}
            srcSet={[480, 960, 1400]
              .map((w) => `${cldUrl(photo, { w, c: 'fill' })} ${w}w`)
              .join(', ')}
            sizes="(min-width: 768px) 768px, 100vw"
            alt={`${spot.nameBn} — কক্সবাজারের আসল ছবি`}
            className="w-full aspect-[16/9] object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-[16/9] bg-sunset-soft" />
        )}
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-10 pb-3">
          <span className="text-sm font-bold text-white">
            📍 {spot.nameBn}
          </span>
          <span className="text-[11px] text-white/70 ml-2">{spot.nameEn} · {SPOT_KIND_BN[spot.kind] || spot.kind}</span>
        </figcaption>
      </div>

      {/* ছবির ঠিক নিচে — ফটোগ্রাফার + গাইডলাইন + ডিরেকশন এক রো-তে */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* ১) ফটোগ্রাফার */}
        <Link
          to={`/spot/${spotKey}`}
          className={`glass rounded-xl2 p-3 flex items-center gap-2.5 hover:border-sunset-gold/50 transition-colors ${
            hasPgs ? '' : 'opacity-80'
          }`}
        >
          <span aria-hidden="true" className="text-lg shrink-0">📷</span>
          <span className="min-w-0">
            <b className="block text-[12.5px] text-white leading-tight">
              {hasPgs ? `${toBn(stat!.count)} জন ফটোগ্রাফার` : 'ফটোগ্রাফার খুঁজুন'}
            </b>
            <span className="block text-[10.5px] text-white/55 leading-tight mt-0.5">
              {hasPgs && stat!.minPrice ? `শুরু ৳${toBn(Number(stat!.minPrice).toLocaleString('en-IN'))}` : 'কাছের স্পট দেখুন'}
            </span>
          </span>
          <span aria-hidden="true" className="ml-auto text-white/40 text-sm shrink-0">→</span>
        </Link>

        {/* ২) গাইডলাইন */}
        <div className="glass rounded-xl2 p-3 flex items-center gap-2.5">
          <span aria-hidden="true" className="text-lg shrink-0">💡</span>
          <span className="min-w-0">
            <b className="block text-[12.5px] text-white leading-tight">গাইডলাইন</b>
            <span className="block text-[10.5px] text-white/55 leading-snug mt-0.5 line-clamp-2">
              {spot.descBn}
            </span>
          </span>
        </div>

        {/* ৩) ডিরেকশন — ক্লিকে গুগল ম্যাপ (নতুন ট্যাব) */}
        <button
          type="button"
          onClick={() => openDirections(spot.lat, spot.lng, null)}
          className="glass rounded-xl2 p-3 flex items-center gap-2.5 hover:border-sunset-gold/50 transition-colors text-left"
        >
          <span aria-hidden="true" className="text-lg shrink-0">🧭</span>
          <span className="min-w-0">
            <b className="block text-[12.5px] text-white leading-tight">গুগল ম্যাপ ডিরেকশন</b>
            <span className="block text-[10.5px] text-white/55 leading-tight mt-0.5">
              ক্লিকে নতুন ট্যাবে রাস্তা দেখুন
            </span>
          </span>
          <span aria-hidden="true" className="ml-auto text-white/40 text-sm shrink-0">↗</span>
        </button>
      </div>
    </figure>
  );
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [spotStats, setSpotStats] = useState<Record<string, SpotStat>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    let active = true;

    async function loadPostData() {
      if (!slug) return;
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .eq('published', true)
          .maybeSingle();

        if (!active) return;

        if (error || !data) {
          console.error('Blog post fetch error:', error);
          setPost(null);
        } else {
          const fetchedPost = data as BlogPost;
          setPost(fetchedPost);

          // Fetch related posts
          const relRes = await supabase
            .from('blog_posts')
            .select('*')
            .eq('published', true)
            .neq('slug', slug)
            .limit(3);

          if (active && !relRes.error && relRes.data) {
            setRelatedPosts(relRes.data as BlogPost[]);
          }

          // স্পট ফটোগ্রাফার স্ট্যাট (LocationCard-এর জন্য — ১টি কোয়েরি)
          const phRes = await supabase
            .from('photographers')
            .select('id, home_spot, starting_price')
            .eq('profile_status', 'approved');

          if (active && !phRes.error && phRes.data) {
            const stats: Record<string, SpotStat> = {};
            (phRes.data as { home_spot: string | null; starting_price: number | null }[]).forEach((p) => {
              if (!p.home_spot) return;
              const cur = stats[p.home_spot] || { count: 0, minPrice: null };
              cur.count += 1;
              const pr = Number(p.starting_price || 0);
              if (pr > 0 && (cur.minPrice === null || pr < cur.minPrice)) cur.minPrice = pr;
              stats[p.home_spot] = cur;
            });
            setSpotStats(stats);
          }
        }
      } catch (err) {
        if (active) {
          console.error('Blog post load error:', err);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPostData();

    return () => {
      active = false;
    };
  }, [slug]);

  // আর্টিকেলে উল্লেখিত স্পটগুলো (select ড্রপডাউনের জন্য)
  const mentionedSpots = useMemo(() => {
    const keys: string[] = [];
    (post?.content || '').split('\n').forEach((line) => {
      const t = line.trim();
      if (t.startsWith('## ')) {
        const k = matchSpotKey(t.replace(/^##\s*/, ''));
        if (k && !keys.includes(k)) keys.push(k);
      }
    });
    return keys;
  }, [post?.content]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        <div className="skeleton h-96 rounded-xl3 w-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-6 pt-36 pb-20 text-center">
        <div className="glass-card p-12 rounded-xl3 max-w-md mx-auto">
          <h2 className="text-xl font-bold text-white mb-2">আর্টিকেল পাওয়া যায়নি</h2>
          <p className="text-sm text-white/60 mb-6">
            আপনি যে আর্টিকেলটি খুঁজছেন তা মুছে ফেলা হয়েছে অথবা ভুল লিঙ্ক।
          </p>
          <Link to="/blog" className="btn-primary">
            সব ব্লগ দেখুন
          </Link>
        </div>
      </div>
    );
  }

  const getReadTime = (content?: string | null) => {
    if (!content) return 1;
    return Math.ceil(content.length / 800);
  };

  const parseFormattedText = (text: string) => {
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <strong key={i} className="text-sunset-gold font-semibold">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  const renderContentLines = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('## ')) {
        const headingText = trimmed.replace(/^##\s*/, '');
        const spotKey = matchSpotKey(headingText);
        elements.push(
          <h2
            key={index}
            id={spotKey ? `h-spot-${spotKey}` : undefined}
            className="text-xl sm:text-2xl font-bold text-white mt-10 mb-4 pl-4 border-l-2 border-sunset-gold scroll-mt-28"
          >
            {parseFormattedText(headingText)}
          </h2>
        );
        // স্পট হেডিংয়ের ঠিক নিচে — আসল ছবি + ফটোগ্রাফার/গাইড/ডিরেকশন রো
        if (spotKey) {
          elements.push(
            <LocationCard key={`loc-${index}`} spotKey={spotKey} stat={spotStats[spotKey]} />
          );
        }
      } else if (trimmed.startsWith('- ')) {
        elements.push(
          <li key={index} className="text-white/75 text-base my-2 pl-2 list-disc ml-5">
            {parseFormattedText(trimmed.replace(/^-\s*/, ''))}
          </li>
        );
      } else if (/^\d+\.\s/.test(trimmed)) {
        elements.push(
          <li key={index} className="text-white/75 text-base my-2 pl-2 list-decimal ml-5">
            {parseFormattedText(trimmed.replace(/^\d+\.\s*/, ''))}
          </li>
        );
      } else {
        elements.push(
          <p key={index} className="text-white/80 text-base sm:text-lg leading-[1.9] my-4">
            {parseFormattedText(trimmed)}
          </p>
        );
      }
    });

    return elements;
  };

  const authorName = post.author || 'ফটোলাগবে টিম';
  const tags = post.tags || [];

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Cover */}
      <div className="relative h-[42vh] min-h-[300px] overflow-hidden bg-twilight-900">
        {post.cover_url ? (
          <img src={cldUrl(post.cover_url, { w: 1600, c: 'fill' })} alt={post.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-sunset-soft" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-twilight-950 via-twilight-950/50 to-transparent pointer-events-none" />

        {/* Back Button */}
        <Link
          to="/blog"
          className="absolute top-24 left-6 glass-strong rounded-full px-4 py-2 flex items-center gap-2 text-white text-sm hover:border-sunset-gold/50 transition z-20"
        >
          <span>←</span>
          <span>সব আর্টিকেল</span>
        </Link>
      </div>

      {/* Title Bar Card */}
      <div className="max-w-3xl mx-auto px-6 -mt-20 relative z-20">
        <div className="glass-strong rounded-xl3 p-6 sm:p-8 shadow-glass-lg border border-white/[0.15] space-y-4">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((t, i) => (
                <span key={i} className="chip !text-xs">
                  {t}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
            {post.title}
          </h1>

          <div className="flex items-center gap-3 pt-2 text-xs sm:text-sm text-white/60">
            <div className="w-9 h-9 rounded-full bg-sunset-gradient flex items-center justify-center font-bold text-[#1A0E06]">
              {authorName.slice(0, 1)}
            </div>
            <div>
              <span className="font-semibold text-white">{authorName}</span>
              <div className="flex items-center gap-2 text-white/50 text-xs">
                <span>{bnDate(post.created_at)}</span>
                <span>·</span>
                <span>⏱ {toBn(getReadTime(post.content))} মিনিট পড়া</span>
              </div>
            </div>
          </div>
        </div>

        {/* স্পট সিলেক্টর — নির্বাচন করলে সেই স্পটের ছবি+কার্ডে স্ক্রল করবে */}
        {mentionedSpots.length >= 2 && (
          <div className="glass-strong rounded-xl3 p-4 mt-4 border border-white/[0.15] flex items-center gap-3 flex-wrap">
            <label htmlFor="spot-jump" className="text-sm font-bold text-white whitespace-nowrap">
              🗺️ স্পট বাছাই করুন:
            </label>
            <select
              id="spot-jump"
              value=""
              onChange={(e) => {
                const k = e.target.value;
                if (!k) return;
                document.getElementById(`loc-spot-${k}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="glass-select flex-1 min-w-[200px] !py-2.5"
            >
              <option value="">— স্পট নির্বাচন করুন —</option>
              {mentionedSpots.map((k) => {
                const s = SPOT_BY_KEY(k);
                return s ? <option key={k} value={k}>{s.nameBn}</option> : null;
              })}
            </select>
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <article className="prose-lite">{renderContentLines(post.content || '')}</article>

        {/* Author Card */}
        <div className="glass-card p-6 rounded-xl3 flex items-center gap-4 mt-12">
          <div className="w-14 h-14 rounded-full bg-sunset-gradient flex items-center justify-center text-xl font-bold text-[#1A0E06] shrink-0">
            {authorName.slice(0, 1)}
          </div>
          <div>
            <h4 className="font-bold text-white text-base">লিখেছেন {authorName}</h4>
            <p className="text-sm text-white/55 mt-0.5">
              ফটোলাগবে কমিউনিটির পক্ষ থেকে কক্সবাজার ফটোগ্রাফি গাইড ও টিপস।
            </p>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-16">
            <h3 className="font-bold text-xl text-white mb-6">আরও পড়ুন</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {relatedPosts.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/blog/${rel.slug}`}
                  className="glass-card overflow-hidden rounded-xl2 group flex flex-col"
                >
                  <div className="h-28 w-full bg-twilight-800 overflow-hidden">
                    {rel.cover_url ? (
                      <img
                        src={cldUrl(rel.cover_url, { w: 480, c: 'fill' })}
                        alt={rel.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-sunset-soft" />
                    )}
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <h4 className="font-semibold text-sm text-white group-hover:text-sunset-gold transition line-clamp-2">
                      {rel.title}
                    </h4>
                    <span className="text-[11px] text-white/45 mt-2 block">
                      {bnDate(rel.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
