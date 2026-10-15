import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { BlogPost, Category, Review } from '../../lib/types';
import { bnDate, toBn } from '../../lib/utils';
import CldUploadField from '../CldUploadField';
import { AdminModal, Field, EmptyState, SectionHead, DangerConfirm } from './kit';

/* ═══════════════ BLOG — full CRUD ═══════════════ */
export function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [f, setF] = useState({ title: '', slug: '', excerpt: '', cover: '', content: '', author: 'ফটোলাগবে টিম', tags: '', published: true });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false }).limit(100);
    setPosts((data as BlogPost[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setF({ title: '', slug: '', excerpt: '', cover: '', content: '', author: 'ফটোলাগবে টিম', tags: '', published: true });
    setEditing(null);
    setAdding(true);
    setErr(null);
  };

  const openEdit = (b: BlogPost) => {
    setF({
      title: b.title,
      slug: b.slug,
      excerpt: b.excerpt,
      cover: b.cover_url || '',
      content: b.content,
      author: b.author || 'ফটোলাগবে টিম',
      tags: (b.tags || []).join(', '),
      published: b.published,
    });
    setEditing(b);
    setAdding(true);
    setErr(null);
  };

  const save = async () => {
    setSaving(true);
    setErr(null);
    const slug = (f.slug.trim() || f.title.trim().toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')).slice(0, 80);
    const payload = {
      title: f.title.trim(),
      slug,
      excerpt: f.excerpt.trim() || f.content.slice(0, 140),
      cover_url: f.cover.trim() || null,
      content: f.content,
      author: f.author.trim() || 'ফটোলাগবে টিম',
      tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
      published: f.published,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('blog_posts').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('blog_posts').insert(payload));
    }
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setAdding(false);
    load();
  };

  const togglePublish = async (b: BlogPost) => {
    await supabase.from('blog_posts').update({ published: !b.published }).eq('id', b.id);
    load();
  };

  const del = async (b: BlogPost) => {
    await supabase.from('blog_posts').delete().eq('id', b.id);
    load();
  };

  return (
    <div>
      <SectionHead
        title="ব্লগ ম্যানেজমেন্ট"
        sub="পোস্ট লেখা, এডিট, পাবলিশ/আনপাবলিশ, ডিলিট"
        right={
          <button type="button" onClick={openNew} className="btn-primary text-sm">
            ＋ নতুন পোস্ট
          </button>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl2" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState icon="📝" title="কোনো ব্লগ পোস্ট নেই" />
      ) : (
        <div className="space-y-2">
          {posts.map((b) => (
            <div key={b.id} className="glass rounded-xl2 p-3.5 flex items-center gap-3">
              {b.cover_url && <img src={b.cover_url} alt="" className="w-14 h-10 rounded-lg object-cover shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm truncate">{b.title}</span>
                  {b.published ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">পাবলিশড</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/60">ড্রাফট</span>
                  )}
                </div>
                <span className="text-xs text-white/50 truncate block">{b.slug} · {bnDate(b.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => togglePublish(b)} className="text-xs font-semibold text-white/70 hover:text-white">
                  {b.published ? 'আনপাবলিশ' : 'পাবলিশ'}
                </button>
                <button type="button" onClick={() => openEdit(b)} className="text-xs font-semibold text-sunset-gold hover:underline">
                  ✏️ এডিট
                </button>
                <DangerConfirm onConfirm={() => del(b)} message={`"${b.title}" ডিলিট করবেন?`} />
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminModal open={adding} onClose={() => setAdding(false)} title={editing ? 'ব্লগ এডিট' : 'নতুন ব্লগ পোস্ট'} wide>
        <div className="space-y-4">
          <Field label="শিরোনাম *">
            <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="glass-input" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="স্লাগ" hint="খালি রাখলে টাইটেল থেকে হবে">
              <input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} className="glass-input" />
            </Field>
            <Field label="লেখক">
              <input value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} className="glass-input" />
            </Field>
          </div>
          <Field label="কভার ছবি">
            <CldUploadField label="" value={f.cover} onChange={(url) => setF({ ...f, cover: url })} accept="image" folder="piclagbe/blog" />
          </Field>
          <Field label="সারসংক্ষেপ">
            <textarea value={f.excerpt} onChange={(e) => setF({ ...f, excerpt: e.target.value })} rows={2} className="glass-input resize-y" />
          </Field>
          <Field label="কনটেন্ট *">
            <textarea value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} rows={8} className="glass-input resize-y font-mono !text-[13px]" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <Field label="ট্যাগ" hint="কমা দিয়ে আলাদা করুন">
              <input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} className="glass-input" />
            </Field>
            <button type="button" onClick={() => setF({ ...f, published: !f.published })} className={f.published ? 'chip-active justify-self-start' : 'chip justify-self-start'}>
              {f.published ? '✓ পাবলিশড' : 'ড্রাফট'}
            </button>
          </div>
          {err && <p className="text-xs text-rose-400">{err}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={save} disabled={saving} className="btn-primary flex-1">
              {saving ? 'সেভ হচ্ছে…' : editing ? 'আপডেট' : 'পাবলিশ করুন'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="btn-ghost">
              বাতিল
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}

/* ═══════════════ CATEGORIES — full CRUD ═══════════════ */
export function AdminCategories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📷');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('id');
    setCats((data as Category[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const { error } = await supabase.from('categories').insert({ name: name.trim(), slug, icon: icon || '📷' });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setName('');
    load();
  };

  const saveEdit = async (c: Category) => {
    await supabase.from('categories').update({ name: editName.trim() }).eq('id', c.id);
    setEditId(null);
    load();
  };

  const del = async (c: Category) => {
    const { error } = await supabase.from('categories').delete().eq('id', c.id);
    if (error) { window.alert('ডিলিট ব্যর্থ (সম্ভবত ব্যবহৃত হচ্ছে): ' + error.message); return; }
    load();
  };

  return (
    <div>
      <SectionHead title="ক্যাটাগরি ম্যানেজমেন্ট" sub="সার্চ ফিল্টারের ক্যাটাগরি — যোগ, এডিট, ডিলিট" />

      <div className="glass rounded-xl2 p-4 mb-5 flex flex-wrap gap-2 items-end">
        <div className="w-16">
          <Field label="আইকন">
            <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} className="glass-input text-center" />
          </Field>
        </div>
        <div className="flex-1 min-w-[180px]">
          <Field label="নতুন ক্যাটাগরির নাম">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: ড্রোন শুট"
              className="glass-input"
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
          </Field>
        </div>
        <button type="button" onClick={add} disabled={busy} className="btn-primary">
          ＋ যোগ
        </button>
      </div>
      {err && <p className="text-xs text-rose-400 mb-3">{err}</p>}

      {loading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-36 rounded-full" />
          ))}
        </div>
      ) : cats.length === 0 ? (
        <EmptyState icon="🏷️" title="কোনো ক্যাটাগরি নেই" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <div key={c.id} className="glass rounded-full px-3 py-1.5 flex items-center gap-2">
              {editId === c.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="glass-input !py-1 !w-32 !text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(c)}
                    autoFocus
                  />
                  <button type="button" onClick={() => saveEdit(c)} className="text-xs text-emerald-300 font-bold">✓</button>
                  <button type="button" onClick={() => setEditId(null)} className="text-xs text-white/50">✕</button>
                </>
              ) : (
                <>
                  <span className="text-sm">{c.icon}</span>
                  <span className="text-xs font-semibold text-white/85">{c.name}</span>
                  <button type="button" onClick={() => { setEditId(c.id); setEditName(c.name); }} className="text-[10px] text-sunset-gold font-bold" title="নাম বদলান">✏️</button>
                  <DangerConfirm onConfirm={() => del(c)} label="" message={`"${c.name}" ক্যাটাগরি ডিলিট করবেন?`} />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════ REVIEWS — moderation ═══════════════ */
export function AdminReviews() {
  const [reviews, setReviews] = useState<(Review & { photographers?: { display_name?: string | null } | null; profiles?: { full_name?: string | null } | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('reviews')
      .select('*, photographers(display_name), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (q.trim()) query = query.ilike('comment', `%${q.trim()}%`);
    const { data } = await query;
    setReviews(data || []);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(load, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [load]);

  const del = async (r: Review) => {
    const { error } = await supabase.from('reviews').delete().eq('id', r.id);
    if (error) { window.alert('ডিলিট ব্যর্থ: ' + error.message); return; }
    load();
  };

  return (
    <div>
      <SectionHead title="রিভিউ মডারেশন" sub="সব রিভিউ — অনুপযুক্ত রিভিউ মুছে ফেলুন" />

      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="রিভিউ টেক্সট খুঁজুন…"
        className="glass-input !w-72 mb-5"
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl2" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState icon="⭐" title="কোনো রিভিউ নেই" />
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="glass rounded-xl2 p-3.5 flex items-start gap-3">
              <span className="text-sunset-gold font-bold text-sm shrink-0">{toBn(r.rating)}★</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/80 line-clamp-2">{r.comment || '—'}</p>
                <span className="text-[11px] text-white/45 block mt-0.5">
                  {r.profiles?.full_name || 'গ্রাহক'} → {r.photographers?.display_name || 'ফটোগ্রাফার'} · {bnDate(r.created_at)}
                </span>
              </div>
              <DangerConfirm onConfirm={() => del(r)} message="রিভিউটি ডিলিট করবেন?" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
