import React, { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Post } from '../../lib/types';
import { toBn, bnDate } from '../../lib/utils';
import { cldUrl } from '../../lib/cloudinary';
import { openApp } from '../../lib/base';
import {
  AdminSheet, ConfirmDialog, FilterBar, OverflowMenu, MediaViewer, FullDialog, Field,
  StatusPill, EmptyState, ListSkeleton, ProgressiveRows,
  useAdminList, useSnack, useOptimistic,
} from './kit';
import { logAction } from '../../lib/audit';
import { AIcon } from '../../admin/icons';

type AdminPost = Post & {
  photographers?: { id?: string; display_name?: string | null; profile_photo_url?: string | null } | null;
};

/**
 * POSTS — Android style moderation: card tap = preview sheet,
 * pending → inline অ্যাপ্রুভ; reject with note (full dialog); delete M3 confirm.
 */
export default function AdminPosts({ onChanged }: { onChanged?: () => void }) {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const fetcher = useCallback(async () => {
    let query = supabase
      .from('posts')
      .select('*, photographers(id, display_name, profile_photo_url)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    return (data as AdminPost[]) || [];
  }, [filter]);

  const list = useAdminList<AdminPost>(fetcher, [filter]);
  const { show } = useSnack();
  const opt = useOptimistic();

  const [preview, setPreview] = useState<AdminPost | null>(null);
  const [rejecting, setRejecting] = useState<AdminPost | null>(null);
  const [note, setNote] = useState('');
  const [deleting, setDeleting] = useState<AdminPost | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ src: string; title: string } | null>(null);

  const approve = async (p: AdminPost) => {
    setBusyId(p.id);
    const ok = await opt.run({
      patchFn: () => list.patch(p.id, { status: 'approved', review_note: null } as Partial<AdminPost>),
      mutate: () => supabase.from('posts').update({ status: 'approved', review_note: null }).eq('id', p.id),
      okMsg: `"${(p.title || 'পোস্ট').slice(0, 24)}" অনুমোদিত ✓`,
      reload: () => list.silentReload(),
    });
    setBusyId(null);
    if (ok) {
      logAction('approve', 'post', p.id, p.photographers?.display_name || 'পোস্ট', {
        note: `পোস্ট অনুমোদন (${p.photographers?.display_name || 'ফটোগ্রাফার'})`,
      });
      setPreview((v) => (v && v.id === p.id ? { ...v, status: 'approved' } : v));
      onChanged?.();
    }
  };

  const confirmReject = async () => {
    if (!rejecting) return;
    setBusy(true);
    const { error } = await supabase
      .from('posts')
      .update({ status: 'rejected', review_note: note.trim() || null })
      .eq('id', rejecting.id);
    setBusy(false);
    if (error) { show('বাতিল ব্যর্থ: ' + error.message, { tone: 'error' }); return; }
    logAction('reject', 'post', rejecting.id, rejecting.photographers?.display_name || 'পোস্ট', {
      note: `পোস্ট বাতিল${note.trim() ? ` — কারণ: ${note.trim()}` : ''}`,
    });
    list.patch(rejecting.id, { status: 'rejected', review_note: note.trim() || null } as Partial<AdminPost>);
    show('পোস্ট বাতিল করা হয়েছে');
    setRejecting(null);
    onChanged?.();
  };

  const delPost = async () => {
    if (!deleting) return;
    setBusy(true);
    const { error } = await supabase.from('posts').delete().eq('id', deleting.id);
    setBusy(false);
    if (error) { show('ডিলিট ব্যর্থ: ' + error.message, { tone: 'error' }); return; }
    logAction('delete', 'post', deleting.id, deleting.photographers?.display_name || 'পোস্ট', {
      note: `পোস্ট ডিলিট (${deleting.photographers?.display_name || 'ফটোগ্রাফার'})`,
    });
    list.remove(deleting.id);
    show('পোস্ট মুছে ফেলা হয়েছে');
    setDeleting(null);
    setPreview((v) => (v && deleting && v.id === deleting.id ? null : v));
    onChanged?.();
  };

  const firstImage = (p: AdminPost) => {
    const img = (p.media || []).find((m) => m.type === 'image');
    return img?.url || (p.media || [])[0]?.url || '';
  };

  return (
    <div>
      <FilterBar
        chips={[
          { key: 'pending', label: '⏳ রিভিউতে' },
          { key: 'approved', label: '✓ অনুমোদিত' },
          { key: 'rejected', label: '✕ বাতিল' },
          { key: 'all', label: 'সব' },
        ]}
        activeChip={filter}
        onChip={(k) => setFilter(k as typeof filter)}
      />

      {list.error && <p className="text-sm text-rose-300 mb-3">{list.error}</p>}

      {list.loading ? (
        <ListSkeleton rows={3} h="h-64" />
      ) : list.items.length === 0 ? (
        <EmptyState icon="🖼" title="কোনো পোস্ট নেই" sub="এই ফিল্টারে কোনো পোস্ট পাওয়া যায়নি।" />
      ) : (
        <ProgressiveRows
          items={list.items}
          resetKey={filter}
          className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4"
          renderRow={(p) => (
            <article key={p.id} className={`glass-card rounded-xl3 overflow-hidden flex flex-col ${list.shakeId === p.id ? 'admin-shake' : ''}`}>
              {/* media thumb — tap = preview */}
              <button type="button" onClick={() => setPreview(p)} className="relative h-40 bg-twilight-800 block w-full active:opacity-90">
                {firstImage(p) ? (
                  <img src={cldUrl(firstImage(p), { w: 480, h: 320, c: 'fill' })} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-3xl">🖼</span>
                )}
                {(p.media || []).length > 1 && (
                  <span className="absolute top-2 right-2 rounded-full bg-black/60 text-white text-[11.5px] font-bold px-2 py-0.5">
                    {toBn((p.media || []).length)} মিডিয়া
                  </span>
                )}
              </button>

              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <StatusPill status={p.status} busy={busyId === p.id} />
                  <span className="text-[12.5px] text-white/45">{bnDate(p.created_at)}</span>
                </div>

                <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 text-left">{p.title}</h3>

                <div className="flex items-center gap-2 text-xs text-white/60">
                  {p.photographers?.profile_photo_url && (
                    <img src={p.photographers.profile_photo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => p.photographers?.id && openApp(`/photographer/${p.photographers.id}`)}
                    className="hover:text-sunset-gold truncate"
                  >
                    {p.photographers?.display_name || 'ফটোগ্রাফার'}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[12.5px] text-white/50">
                  {p.price != null && p.price > 0 && <span>🏷️ {toBn(p.price)} ৳</span>}
                  <span>❤️ {toBn(p.like_count || 0)}</span>
                </div>

                {p.status === 'rejected' && p.review_note && (
                  <p className="text-[12.5px] text-rose-300/90 line-clamp-2">নোট: {p.review_note}</p>
                )}

                {/* actions: pending → অ্যাপ্রুভ inline; rest via 3-dot */}
                <div className="flex items-center justify-between pt-2 mt-auto">
                  {p.status === 'pending' ? (
                    <button type="button" onClick={() => approve(p)} disabled={busyId === p.id}
                      className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-50">
                      ✓ অ্যাপ্রুভ
                    </button>
                  ) : <span />}
                  <OverflowMenu
                    items={[
                      { icon: 'eye', label: 'প্রিভিউ দেখুন', onClick: () => setPreview(p) },
                      { icon: 'check', label: 'অ্যাপ্রুভ করুন', hide: p.status === 'approved', onClick: () => approve(p) },
                      { icon: 'xmark', label: 'বাতিল করুন (নোট সহ)', hide: p.status === 'rejected', onClick: () => { setRejecting(p); setNote(''); } },
                      { icon: 'external', label: 'ফটোগ্রাফার প্রোফাইল', hide: !p.photographers?.id, onClick: () => openApp(`/photographer/${p.photographers!.id}`) },
                      { icon: 'trash', label: 'ডিলিট করুন', danger: true, divider: true, onClick: () => setDeleting(p) },
                    ]}
                  />
                </div>
              </div>
            </article>
          )}
        />
      )}

      {/* PREVIEW SHEET */}
      <AdminSheet
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.title || 'প্রিভিউ'}
        sub={preview?.photographers?.display_name || ''}
        wide
        footer={
          preview && (
            <>
              {preview.status !== 'approved' && (
                <button type="button" onClick={() => approve(preview)} disabled={busyId === preview.id}
                  className="btn-primary flex-1 justify-center disabled:opacity-50">
                  <AIcon name="check" size={16} strokeWidth={2.4} className="mr-1.5" /> অ্যাপ্রুভ করুন
                </button>
              )}
              {preview.status !== 'rejected' && (
                <button type="button" onClick={() => { setRejecting(preview); setNote(''); }} className="btn-ghost !px-4">
                  ✕ বাতিল
                </button>
              )}
              <OverflowMenu
                items={[
                  { icon: 'external', label: 'ফটোগ্রাফার প্রোফাইল', hide: !preview.photographers?.id, onClick: () => openApp(`/photographer/${preview.photographers!.id}`) },
                  { icon: 'trash', label: 'ডিলিট করুন', danger: true, divider: true, onClick: () => setDeleting(preview) },
                ]}
              />
            </>
          )
        }
      >
        {preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(preview.media || []).map((m, i) =>
                m.type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(m.url) ? (
                  <video key={i} src={m.url} controls className="w-full rounded-xl bg-black/40" />
                ) : (
                  <button key={i} type="button" onClick={() => setViewer({ src: m.url, title: preview.title || 'মিডিয়া' })} className="active:scale-[0.98] transition-transform">
                    <img src={cldUrl(m.url, { w: 640, c: 'limit' })} alt="" className="w-full rounded-xl" />
                  </button>
                )
              )}
            </div>
            {preview.body && <p className="text-sm text-white/70 whitespace-pre-line leading-relaxed">{preview.body}</p>}
            <div className="flex items-center gap-3">
              {preview.price != null && preview.price > 0 && (
                <span className="text-sm font-bold text-sunset-gold">🏷️ শুরু {toBn(preview.price)} ৳</span>
              )}
              <StatusPill status={preview.status} busy={busyId === preview.id} />
            </div>
            {preview.status === 'rejected' && preview.review_note && (
              <p className="text-[13px] text-rose-300/90 bg-rose-400/10 border border-rose-400/20 rounded-xl2 p-3">বাতিলের নোট: {preview.review_note}</p>
            )}
          </div>
        )}
      </AdminSheet>

      {/* REJECT NOTE — full dialog (keyboard safe) */}
      <FullDialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="পোস্ট বাতিল করুন"
        sub={rejecting?.title}
        onSave={confirmReject}
        saving={busy}
        saveLabel="বাতিল করুন"
        dirty
      >
        <div className="space-y-4">
          <p className="text-[13.5px] text-white/60 leading-relaxed">
            <b className="text-white">{rejecting?.title}</b> — বাতিল করার কারণ ফটোগ্রাফার দেখতে পাবেন:
          </p>
          <Field label="নোট (কারণ)">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="যেমন: ছবির মান কম, অসম্পূর্ণ বিবরণ…"
              className="glass-input resize-y !text-base"
            />
          </Field>
        </div>
      </FullDialog>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={delPost}
        busy={busy}
        title={`"${(deleting?.title || 'পোস্ট').slice(0, 30)}" মুছে ফেলবেন?`}
        body="পোস্ট ও মিডিয়া স্থায়ীভাবে মুছে যাবে — ফিরিয়ে আনা যাবে না।"
      />

      {/* MEDIA VIEWER */}
      <MediaViewer src={viewer?.src || null} title={viewer?.title} onClose={() => setViewer(null)} />
    </div>
  );
}
