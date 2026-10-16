import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Post } from '../../lib/types';
import { toBn, bnDate } from '../../lib/utils';
import { cldUrl } from '../../lib/cloudinary';
import { AdminModal, Field, StatusPill, EmptyState, SectionHead, DangerConfirm } from './kit';
import { logAction } from '../../lib/audit';

type AdminPost = Post & {
  photographers?: { id?: string; display_name?: string | null; profile_photo_url?: string | null } | null;
};

/**
 * POSTS — ফটোগ্রাফারদের কাজের পোস্ট মডারেশন:
 * মিডিয়া প্রিভিউ + অ্যাপ্রুভ / বাতিল (নোট সহ) / ডিলিট।
 */
export default function AdminPosts({ onChanged }: { onChanged?: () => void }) {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejecting, setRejecting] = useState<AdminPost | null>(null);
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<AdminPost | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('posts')
      .select('*, photographers(id, display_name, profile_photo_url)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    setPosts((data as AdminPost[]) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (p: AdminPost) => {
    setBusy(true);
    const { error } = await supabase
      .from('posts')
      .update({ status: 'approved', review_note: null })
      .eq('id', p.id);
    setBusy(false);
    if (error) { window.alert('ব্যর্থ: ' + error.message); return; }
    logAction('approve', 'post', p.id, p.photographers?.display_name || 'পোস্ট', {
      note: `পোস্ট অনুমোদন (${p.photographers?.display_name || 'ফটোগ্রাফার'})`,
    });
    load();
    onChanged?.();
  };

  const openReject = (p: AdminPost) => {
    setRejecting(p);
    setNote('');
  };

  const confirmReject = async () => {
    if (!rejecting) return;
    setBusy(true);
    const { error } = await supabase
      .from('posts')
      .update({ status: 'rejected', review_note: note.trim() || null })
      .eq('id', rejecting.id);
    setBusy(false);
    if (error) { window.alert('ব্যর্থ: ' + error.message); return; }
    logAction('reject', 'post', rejecting.id, rejecting.photographers?.display_name || 'পোস্ট', {
      note: `পোস্ট বাতিল${note.trim() ? ` — কারণ: ${note.trim()}` : ''}`,
    });
    setRejecting(null);
    load();
    onChanged?.();
  };

  const delPost = async (p: AdminPost) => {
    const { error } = await supabase.from('posts').delete().eq('id', p.id);
    if (error) { window.alert('ডিলিট ব্যর্থ: ' + error.message); return; }
    logAction('delete', 'post', p.id, p.photographers?.display_name || 'পোস্ট', {
      note: `পোস্ট ডিলিট (${p.photographers?.display_name || 'ফটোগ্রাফার'})`,
    });
    load();
    onChanged?.();
  };

  const firstImage = (p: AdminPost) => {
    const img = (p.media || []).find((m) => m.type === 'image');
    return img?.url || (p.media || [])[0]?.url || '';
  };

  return (
    <div>
      <SectionHead
        title="পোস্ট মডারেশন"
        sub="ফটোগ্রাফারদের কাজের পোস্ট — অনুমোদন দিলে প্রোফাইলে প্রকাশ হবে"
      />

      <div className="flex flex-wrap gap-2 mb-5">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((st) => (
          <button key={st} type="button" onClick={() => setFilter(st)} className={filter === st ? 'chip-active' : 'chip'}>
            {st === 'pending' ? '⏳ রিভিউতে' : st === 'approved' ? '✓ অনুমোদিত' : st === 'rejected' ? '✕ বাতিল' : 'সব'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-64 rounded-xl3" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState icon="🖼" title="কোনো পোস্ট নেই" sub="এই ফিল্টারে কোনো পোস্ট পাওয়া যায়নি।" />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {posts.map((p) => (
            <article key={p.id} className="glass-card rounded-xl3 overflow-hidden flex flex-col">
              {/* media thumb */}
              <button
                type="button"
                onClick={() => setPreview(p)}
                className="relative h-40 bg-twilight-800 block w-full"
              >
                {firstImage(p) ? (
                  <img
                    src={cldUrl(firstImage(p), { w: 480, h: 320, c: 'fill' })}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-3xl">🖼</span>
                )}
                {(p.media || []).length > 1 && (
                  <span className="absolute top-2 right-2 rounded-full bg-black/60 text-white text-[10px] font-bold px-2 py-0.5">
                    {toBn((p.media || []).length)} মিডিয়া
                  </span>
                )}
              </button>

              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <StatusPill status={p.status} />
                  <span className="text-[11px] text-white/45">{bnDate(p.created_at)}</span>
                </div>

                <h3 className="font-bold text-white text-sm leading-snug line-clamp-2">{p.title}</h3>

                <div className="flex items-center gap-2 text-xs text-white/60">
                  {p.photographers?.profile_photo_url && (
                    <img src={p.photographers.profile_photo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                  )}
                  {p.photographers?.id ? (
                    <Link to={`/photographer/${p.photographers.id}`} className="hover:text-sunset-gold truncate">
                      {p.photographers?.display_name || 'ফটোগ্রাফার'}
                    </Link>
                  ) : (
                    <span className="truncate">{p.photographers?.display_name || 'ফটোগ্রাফার'}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-white/50">
                  {p.price != null && p.price > 0 && <span>🏷️ {toBn(p.price)} ৳</span>}
                  <span>❤️ {toBn(p.like_count || 0)}</span>
                </div>

                {p.status === 'rejected' && p.review_note && (
                  <p className="text-[11px] text-rose-300/90 line-clamp-2">নোট: {p.review_note}</p>
                )}

                <div className="flex items-center gap-2 pt-2 mt-auto flex-wrap">
                  {p.status !== 'approved' && (
                    <button type="button" onClick={() => approve(p)} disabled={busy} className="btn-primary !py-1.5 !px-3 !text-xs">
                      ✓ অ্যাপ্রুভ
                    </button>
                  )}
                  {p.status !== 'rejected' && (
                    <button type="button" onClick={() => openReject(p)} className="btn-ghost !py-1.5 !px-3 !text-xs">
                      ✕ বাতিল
                    </button>
                  )}
                  <DangerConfirm onConfirm={() => delPost(p)} message={`"${p.title}" পোস্ট ডিলিট করবেন?`} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Reject with note modal */}
      <AdminModal open={!!rejecting} onClose={() => setRejecting(null)} title="পোস্ট বাতিল করুন">
        <div className="space-y-4">
          <p className="text-sm text-white/70">
            <strong className="text-white">{rejecting?.title}</strong> — বাতিল করার কারণ ফটোগ্রাফার দেখতে পাবেন:
          </p>
          <Field label="নোট (কারণ)">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="যেমন: ছবির মান কম, অসম্পূর্ণ বিবরণ…"
              className="glass-input resize-y"
            />
          </Field>
          <div className="flex gap-3">
            <button type="button" onClick={confirmReject} disabled={busy} className="btn-danger flex-1">
              {busy ? 'হচ্ছে…' : 'বাতিল করুন'}
            </button>
            <button type="button" onClick={() => setRejecting(null)} className="btn-ghost">
              ফিরে যান
            </button>
          </div>
        </div>
      </AdminModal>

      {/* Media preview modal */}
      <AdminModal open={!!preview} onClose={() => setPreview(null)} title={preview?.title || 'প্রিভিউ'} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(preview?.media || []).map((m, i) =>
              m.type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(m.url) ? (
                <video key={i} src={m.url} controls className="w-full rounded-xl bg-black/40" />
              ) : (
                <img key={i} src={cldUrl(m.url, { w: 640, c: 'limit' })} alt="" className="w-full rounded-xl" />
              )
            )}
          </div>
          {preview?.body && <p className="text-sm text-white/70 whitespace-pre-line">{preview.body}</p>}
          {preview?.price != null && preview.price > 0 && (
            <p className="text-sm font-bold text-sunset-gold">🏷️ শুরু {toBn(preview.price)} ৳</p>
          )}
        </div>
      </AdminModal>
    </div>
  );
}
