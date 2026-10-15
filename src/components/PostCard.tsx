import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Post } from '../lib/types';
import { toBn, bnDate } from '../lib/utils';
import { cldUrl } from '../lib/cloudinary';
import { useAuth } from '../lib/auth';

/* ── status badge (owner/admin view) ── */
export function PostStatusBadge({ status }: { status: Post['status'] }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
        ✓ অনুমোদিত
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
        ⏳ রিভিউতে আছে
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">
      ✕ বাতিল
    </span>
  );
}

/* light-tone status badge (ivory profile page) */
export function PostStatusBadgeLight({ status }: { status: Post['status'] }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#bfd8cb] bg-[#e6efe9] px-2.5 py-0.5 text-[11px] font-bold text-[#1d4d3b]">
        ✓ অনুমোদিত
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#e8d9b5] bg-[#f7efdc] px-2.5 py-0.5 text-[11px] font-bold text-[#8a6d1f]">
        ⏳ রিভিউতে আছে
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#eecdc9] bg-[#f9e8e6] px-2.5 py-0.5 text-[11px] font-bold text-[#a13c34]">
      ✕ বাতিল
    </span>
  );
}

/* ── media grid: 1 = full, 2 = two cols, 3+ = grid + more overlay ── */
function MediaBlock({ media }: { media: Post['media'] }) {
  const [open, setOpen] = useState<string | null>(null); // lightbox url

  if (!media || media.length === 0) return null;

  const items = media.slice(0, 4);
  const extra = media.length - items.length;

  const cell = (m: { url: string; type: string }, i: number, overlay?: number) => {
    const isVideo = m.type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(m.url);
    return (
      <button
        type="button"
        key={i}
        onClick={() => setOpen(m.url)}
        className="relative overflow-hidden bg-black/40 group/media cursor-zoom-in"
      >
        {isVideo ? (
          <video
            src={m.url}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={cldUrl(m.url, { w: 720, c: 'fill' })}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        )}
        {isVideo && (
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white text-sm">▶</span>
          </span>
        )}
        {overlay ? (
          <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-2xl font-extrabold text-white pointer-events-none">
            +{toBn(overlay)}
          </span>
        ) : null}
      </button>
    );
  };

  const gridCls =
    items.length === 1
      ? 'grid-cols-1 max-h-[420px]'
      : items.length === 2
      ? 'grid-cols-2 max-h-[360px]'
      : 'grid-cols-2 max-h-[420px]';

  return (
    <>
      <div className={`grid ${gridCls} gap-0.5 rounded-xl overflow-hidden border border-white/[0.06]`}>
        {items.map((m, i) =>
          i === 3 && extra > 0 ? cell(m, i, extra) : cell(m, i)
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="বন্ধ করুন"
            className="absolute top-4 right-4 w-10 h-10 rounded-full glass text-white text-lg"
          >
            ✕
          </button>
          {open.match(/\.(mp4|webm|mov)(\?|$)/i) || media.find((m) => m.url === open)?.type === 'video' ? (
            <video src={open} controls autoPlay className="max-w-full max-h-full rounded-xl" />
          ) : (
            <img src={cldUrl(open, { w: 1400, c: 'limit' })} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          )}
        </div>
      )}
    </>
  );
}

interface PostCardProps {
  post: Post;
  /** owner/admin controls */
  onEdit?: (p: Post) => void;
  onDelete?: (p: Post) => void;
  showStatus?: boolean;
  /** dark = default glass (studio/admin) · light = ivory (public profile) */
  tone?: 'dark' | 'light';
}

export default function PostCard({ post, onEdit, onDelete, showStatus, tone = 'dark' }: PostCardProps) {
  const { session } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [likeBusy, setLikeBusy] = useState(false);

  const light = tone === 'light';
  const ph = post.photographers;

  // এই user লাইক দিয়েছে কি না
  useEffect(() => {
    let active = true;
    if (!session) return;
    (async () => {
      const { data } = await supabase
        .from('post_likes')
        .select('user_id')
        .eq('post_id', post.id)
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (active && data) setLiked(true);
    })();
    return () => { active = false; };
  }, [session, post.id]);

  const toggleLike = useCallback(async () => {
    if (!session || likeBusy) return;
    setLikeBusy(true);
    try {
      if (liked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', session.user.id);
        if (!error) { setLiked(false); setLikeCount((c) => Math.max(0, c - 1)); }
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: post.id, user_id: session.user.id });
        if (!error) { setLiked(true); setLikeCount((c) => c + 1); }
      }
    } finally {
      setLikeBusy(false);
    }
  }, [session, liked, likeBusy, post.id]);

  const avatar = ph?.profile_photo_url;

  return (
    <article className={light ? 'pf-card overflow-hidden flex flex-col' : 'glass-card rounded-xl3 overflow-hidden flex flex-col'}>
      {/* header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        {avatar ? (
          <img src={avatar} alt={ph?.display_name || ''} className="w-10 h-10 rounded-full object-cover ring-2 ring-[#b08d57]/50 shrink-0" />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 ${light ? 'bg-[#b08d57] text-white' : 'bg-sunset-gradient text-[#1A0E06]'}`}>
            {(ph?.display_name || 'ফ').slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {ph?.id ? (
            <Link to={`/photographer/${ph.id}`} className={`text-sm font-bold hover:underline truncate block ${light ? 'text-[#26231e]' : 'text-white hover:text-sunset-gold'}`}>
              {ph?.display_name || 'ফটোগ্রাফার'}
            </Link>
          ) : (
            <span className={`text-sm font-bold truncate block ${light ? 'text-[#26231e]' : 'text-white'}`}>{ph?.display_name || 'ফটোগ্রাফার'}</span>
          )}
          <span className={`text-[11px] ${light ? 'text-[#8a8172]' : 'text-white/45'}`}>{bnDate(post.created_at)}</span>
        </div>
        {showStatus && (light ? <PostStatusBadgeLight status={post.status} /> : <PostStatusBadge status={post.status} />)}
      </div>

      {/* title + body + price */}
      <div className="px-4 pb-3">
        <h3 className={`font-bold text-[15px] leading-snug ${light ? 'text-[#26231e]' : 'text-white'}`}>{post.title}</h3>
        {post.body && (
          <p className={`text-sm mt-1.5 whitespace-pre-line leading-relaxed ${light ? 'text-[#4d463c]' : 'text-white/65'}`}>{post.body}</p>
        )}
        {post.price != null && post.price > 0 && (
          <span className={`inline-flex items-center gap-1.5 mt-2.5 rounded-full px-3 py-1 text-xs font-bold ${light ? 'border border-[#e0cf9f] bg-[#f7efdc] text-[#8a6d1f]' : 'border border-sunset-gold/35 bg-sunset-soft text-sunset-gold'}`}>
            🏷️ শুরু {toBn(post.price)} ৳
          </span>
        )}
      </div>

      {/* media */}
      <MediaBlock media={post.media || []} />

      {/* footer: like + owner actions */}
      <div className="flex items-center justify-between gap-2 p-3 mt-auto">
        <button
          type="button"
          onClick={toggleLike}
          disabled={!session || likeBusy}
          title={session ? 'লাইক' : 'লাইক দিতে লগইন করুন'}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
            liked
              ? 'bg-rose-500/15 text-rose-400 border border-rose-400/30'
              : light
              ? 'text-[#6b6357] hover:text-[#26231e] hover:bg-black/[0.04] border border-transparent'
              : 'text-white/60 hover:text-white hover:bg-white/[0.06] border border-transparent'
          } ${!session ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {liked ? '❤️' : light ? '🤍' : '🤍'} {toBn(likeCount)}
        </button>

        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button type="button" onClick={() => onEdit(post)} className={`text-xs font-semibold px-2 py-1 ${light ? 'text-[#6b6357] hover:text-[#b08d57]' : 'text-white/70 hover:text-sunset-gold'}`}>
                ✏️ এডিট
              </button>
            )}
            {onDelete && (
              <button type="button" onClick={() => onDelete(post)} className={`text-xs font-semibold px-2 py-1 ${light ? 'text-[#6b6357] hover:text-[#a13c34]' : 'text-white/70 hover:text-rose-400'}`}>
                🗑 ডিলিট
              </button>
            )}
          </div>
        )}
      </div>

      {/* admin rejection note (owner view) */}
      {post.status === 'rejected' && post.review_note && (
        <p className={`mx-3 mb-3 rounded-lg px-3 py-2 text-[12px] ${light ? 'bg-[#f9e8e6] border border-[#eecdc9] text-[#a13c34]' : 'bg-rose-500/10 border border-rose-400/20 text-rose-300'}`}>
          অ্যাডমিন নোট: {post.review_note}
        </p>
      )}
    </article>
  );
}
