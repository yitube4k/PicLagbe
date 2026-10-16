import React, { useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { BlogPost, Category, Review } from '../../lib/types';
import { bnDate, toBn } from '../../lib/utils';
import CldUploadField from '../CldUploadField';
import {
  AdminSheet, FullDialog, ConfirmDialog, FilterBar, OverflowMenu,
  Field, EmptyState, ListSkeleton, KV,
  useAdminList, useSnack, useOptimistic,
} from './kit';
import { logAction } from '../../lib/audit';
import { AIcon } from '../../admin/icons';

/* ═══════════════ BLOG — full CRUD, optimistic publish toggle ═══════════════ */

export function AdminBlog() {
  const fetcher = useCallback(async () => {
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false }).limit(100);
    return (data as BlogPost[]) || [];
  }, []);

  const list = useAdminList<BlogPost>(fetcher, []);
  const { show } = useSnack();
  const opt = useOptimistic();

  const [editing, setEditing] = useState<BlogPost | null>(null); // existing post being edited
  const [adding, setAdding] = useState(false); // new post dialog open
  const [deleting, setDeleting] = useState<BlogPost | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [f, setF] = useState({ title: '', slug: '', excerpt: '', cover: '', content: '', author: 'ফটোলাগবে টিম', tags: '', published: true });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const setFD = (p: Partial<typeof f>) => { setF((prev) => ({ ...prev, ...p })); dirtyRef.current = true; };

  const openNew = () => {
    setF({ title: '', slug: '', excerpt: '', cover: '', content: '', author: 'ফটোলাগবে টিম', tags: '', published: true });
    setEditing(null);
    setAdding(true);
    dirtyRef.current = false;
    setErr(null);
  };

  const openEdit = (b: BlogPost) => {
    setF({
      title: b.title, slug: b.slug, excerpt: b.excerpt, cover: b.cover_url || '',
      content: b.content, author: b.author || 'ফটোলাগবে টিম',
      tags: (b.tags || []).join(', '), published: b.published,
    });
    setEditing(b);
    setAdding(true);
    dirtyRef.current = false;
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
    logAction(editing ? 'update' : 'create', 'blog', editing?.id || null, f.title.trim(), {
      note: editing ? `ব্লগ এডিট: ${f.title.trim()}` : `নতুন ব্লগ: ${f.title.trim()}`,
      after: { published: f.published, slug },
    });
    setAdding(false);
    setEditing(null);
    show(editing ? 'ব্লগ আপডেট হয়েছে' : 'নতুন ব্লগ প্রকাশিত হয়েছে');
    list.silentReload();
  };

  /** optimistic publish toggle */
  const togglePublish = async (b: BlogPost) => {
    setBusyId(b.id);
    const ok = await opt.run({
      patchFn: () => list.patch(b.id, { published: !b.published } as Partial<BlogPost>),
      mutate: () => supabase.from('blog_posts').update({ published: !b.published }).eq('id', b.id),
      okMsg: b.published ? `"${b.title.slice(0, 24)}" অপ্রকাশিত হয়েছে` : `"${b.title.slice(0, 24)}" প্রকাশিত হয়েছে ✓`,
      reload: () => list.silentReload(),
    });
    setBusyId(null);
    if (ok) {
      logAction(b.published ? 'unpublish' : 'publish', 'blog', b.id, b.title, {
        note: b.published ? `ব্লগ অপ্রকাশিত: ${b.title}` : `ব্লগ প্রকাশিত: ${b.title}`,
      });
    }
  };

  const del = async () => {
    if (!deleting) return;
    setBusyDelete(true);
    const { error } = await supabase.from('blog_posts').delete().eq('id', deleting.id);
    setBusyDelete(false);
    if (error) { show('ডিলিট ব্যর্থ: ' + error.message, { tone: 'error' }); return; }
    logAction('delete', 'blog', deleting.id, deleting.title, { note: `ব্লগ ডিলিট: ${deleting.title}` });
    list.remove(deleting.id);
    show('ব্লগ মুছে ফেলা হয়েছে');
    setDeleting(null);
  };

  return (
    <div>
      <FilterBar
        right={
          <button type="button" onClick={openNew} aria-label="নতুন পোস্ট" title="নতুন পোস্ট"
            className="shrink-0 w-11 h-11 rounded-full grid place-items-center bg-sunset-gradient text-[#1A0E06] shadow-sunset-glow active:scale-90 transition-transform">
            <AIcon name="plus" size={20} strokeWidth={2.4} />
          </button>
        }
      />

      {list.error && <p className="text-sm text-rose-300 mb-3">{list.error}</p>}

      {list.loading ? (
        <ListSkeleton />
      ) : list.items.length === 0 ? (
        <EmptyState icon="📝" title="কোনো ব্লগ পোস্ট নেই" sub="＋ বাটনে চেপে প্রথম পোস্ট লিখুন।" />
      ) : (
        <div className="space-y-2.5">
          {list.items.map((b) => (
            <div key={b.id} className={`glass rounded-xl2 p-3.5 flex items-center gap-3 ${list.shakeId === b.id ? 'admin-shake' : ''}`}>
              {b.cover_url ? (
                <img src={b.cover_url} alt="" className="w-14 h-11 rounded-lg object-cover shrink-0" />
              ) : (
                <span className="w-14 h-11 rounded-lg bg-white/[0.05] border border-white/10 grid place-items-center text-lg shrink-0">📝</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-white text-[14.5px] truncate">{b.title}</span>
                  <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${busyId === b.id ? 'admin-busy' : ''} ${
                    b.published
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                      : 'border-white/20 bg-white/5 text-white/60'
                  }`}>
                    {b.published ? 'পাবলিশড' : 'ড্রাফট'}
                  </span>
                </div>
                <span className="text-[12.5px] text-white/50 truncate block mt-0.5">{b.slug} · {bnDate(b.created_at)}</span>
              </div>
              <OverflowMenu
                items={[
                  { icon: 'blog', label: b.published ? 'আনপাবলিশ করুন' : 'পাবলিশ করুন', onClick: () => togglePublish(b) },
                  { icon: 'edit', label: 'এডিট করুন', onClick: () => openEdit(b) },
                  { icon: 'trash', label: 'ডিলিট করুন', danger: true, divider: true, onClick: () => setDeleting(b) },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      {/* EDIT/NEW FULL DIALOG */}
      <FullDialog
        open={adding}
        onClose={() => { setAdding(false); setEditing(null); }}
        title={editing ? 'ব্লগ এডিট' : 'নতুন ব্লগ পোস্ট'}
        sub={editing ? editing.title : ''}
        onSave={save}
        saving={saving}
        dirty={dirtyRef.current}
        err={err}
        saveLabel={editing ? 'আপডেট করুন' : 'পাবলিশ করুন'}
        wide
      >
        <div className="space-y-4">
          <Field label="শিরোনাম *">
            <input value={f.title} onChange={(e) => setFD({ title: e.target.value })} className="glass-input !text-base" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="স্লাগ" hint="খালি রাখলে টাইটেল থেকে হবে">
              <input value={f.slug} onChange={(e) => setFD({ slug: e.target.value })} className="glass-input !text-base" />
            </Field>
            <Field label="লেখক">
              <input value={f.author} onChange={(e) => setFD({ author: e.target.value })} className="glass-input !text-base" />
            </Field>
          </div>
          <Field label="কভার ছবি">
            <CldUploadField label="" value={f.cover} onChange={(url) => setFD({ cover: url })} accept="image" folder="piclagbe/blog" />
          </Field>
          <Field label="সারসংক্ষেপ">
            <textarea value={f.excerpt} onChange={(e) => setFD({ excerpt: e.target.value })} rows={2} className="glass-input resize-y !text-base" />
          </Field>
          <Field label="কনটেন্ট *">
            <textarea value={f.content} onChange={(e) => setFD({ content: e.target.value })} rows={10} className="glass-input resize-y font-mono !text-[14px]" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <Field label="ট্যাগ" hint="কমা দিয়ে আলাদা করুন">
              <input value={f.tags} onChange={(e) => setFD({ tags: e.target.value })} className="glass-input !text-base" />
            </Field>
            <button type="button" onClick={() => setFD({ published: !f.published })} className={f.published ? 'chip-active justify-self-start' : 'chip justify-self-start'}>
              {f.published ? '✓ পাবলিশড' : 'ড্রাফট হিসেবে সেভ'}
            </button>
          </div>
        </div>
      </FullDialog>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={del}
        busy={busyDelete}
        title={`"${(deleting?.title || '').slice(0, 30)}" মুছে ফেলবেন?`}
        body="ব্লগ পোস্ট স্থায়ীভাবে মুছে যাবে — ফিরিয়ে আনা যাবে না।"
      />
    </div>
  );
}

/* ═══════════════ CATEGORIES — add card, edit sheet, delete confirm ═══════════════ */

export function AdminCategories() {
  const fetcher = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('id');
    return (data as unknown as (Category & { id: string })[]) || [];
  }, []);

  const list = useAdminList<Category & { id: string }>(fetcher, []);
  const { show } = useSnack();
  const opt = useOptimistic();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📷');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<(Category & { id: string }) | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('📷');
  const [deleting, setDeleting] = useState<(Category & { id: string }) | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const { error } = await supabase.from('categories').insert({ name: name.trim(), slug, icon: icon || '📷' });
    setBusy(false);
    if (error) { show('যোগ ব্যর্থ: ' + error.message, { tone: 'error' }); return; }
    logAction('create', 'category', null, name.trim(), { note: `নতুন ক্যাটাগরি: ${icon} ${name.trim()}` });
    setName('');
    setIcon('📷');
    setAdding(false);
    show(`ক্যাটাগরি "${name.trim()}" যোগ হয়েছে`);
    list.silentReload();
  };

  /** optimistic rename */
  const saveEdit = async () => {
    if (!editing) return;
    const nm = editName.trim();
    if (!nm || nm === editing.name) { setEditing(null); return; }
    setBusy(true);
    const ok = await opt.run({
      patchFn: () => list.patch(editing.id, { name: nm } as Partial<Category & { id: string }>),
      mutate: () => supabase.from('categories').update({ name: nm, icon: editIcon || editing.icon }).eq('id', editing.id),
      okMsg: `ক্যাটাগরি → "${nm}"`,
      reload: () => list.silentReload(),
    });
    setBusy(false);
    if (ok) {
      logAction('update', 'category', editing.id, nm, {
        note: `ক্যাটাগরি নাম: ${editing.name} → ${nm}`,
        before: { name: editing.name }, after: { name: nm },
      });
    }
    setEditing(null);
  };

  const del = async () => {
    if (!deleting) return;
    setBusyDelete(true);
    const { error } = await supabase.from('categories').delete().eq('id', deleting.id);
    setBusyDelete(false);
    if (error) { show('ডিলিট ব্যর্থ (সম্ভবত ব্যবহৃত হচ্ছে): ' + error.message, { tone: 'error' }); return; }
    logAction('delete', 'category', deleting.id, deleting.name, { note: `ক্যাটাগরি ডিলিট: ${deleting.name}` });
    list.remove(deleting.id);
    show('ক্যাটাগরি মুছে ফেলা হয়েছে');
    setDeleting(null);
  };

  return (
    <div>
      <FilterBar
        right={
          <button type="button" onClick={() => setAdding(true)} aria-label="নতুন ক্যাটাগরি" title="নতুন ক্যাটাগরি"
            className="shrink-0 w-11 h-11 rounded-full grid place-items-center bg-sunset-gradient text-[#1A0E06] shadow-sunset-glow active:scale-90 transition-transform">
            <AIcon name="plus" size={20} strokeWidth={2.4} />
          </button>
        }
      />

      {list.error && <p className="text-sm text-rose-300 mb-3">{list.error}</p>}

      {list.loading ? (
        <ListSkeleton rows={5} h="h-16" />
      ) : list.items.length === 0 ? (
        <EmptyState icon="🏷️" title="কোনো ক্যাটাগরি নেই" sub="＋ বাটনে চেপে যোগ করুন।" />
      ) : (
        <div className="space-y-2.5">
          {list.items.map((c) => (
            <div key={c.id} className={`glass rounded-xl2 px-4 py-3 flex items-center gap-3 ${list.shakeId === c.id ? 'admin-shake' : ''}`}>
              <span className="w-11 h-11 rounded-xl2 bg-white/[0.05] border border-white/10 grid place-items-center text-xl shrink-0">{c.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white text-[14.5px] truncate">{c.name}</p>
                <p className="text-[12px] text-white/40 truncate">{c.slug}</p>
              </div>
              <OverflowMenu
                items={[
                  { icon: 'edit', label: 'নাম/আইকন বদলান', onClick: () => { setEditing(c); setEditName(c.name); setEditIcon(c.icon || '📷'); } },
                  { icon: 'trash', label: 'ডিলিট করুন', danger: true, divider: true, onClick: () => setDeleting(c) },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      {/* ADD FULL DIALOG */}
      <FullDialog
        open={adding}
        onClose={() => setAdding(false)}
        title="নতুন ক্যাটাগরি"
        sub="সার্চ ফিল্টারে দেখা যাবে"
        onSave={add}
        saving={busy}
        saveLabel="যোগ করুন"
        dirty={!!name.trim()}
      >
        <div className="space-y-4">
          <Field label="আইকন (ইমোজি)" hint="যেমন: 📷 🎥 🚁 💡">
            <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} className="glass-input !text-base text-center w-24" />
          </Field>
          <Field label="ক্যাটাগরির নাম *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: ড্রোন শুট"
              className="glass-input !text-base"
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
          </Field>
        </div>
      </FullDialog>

      {/* EDIT FULL DIALOG */}
      <FullDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title="ক্যাটাগরি এডিট"
        sub={editing?.name}
        onSave={saveEdit}
        saving={busy}
        saveLabel="সংরক্ষণ করুন"
        dirty={!!editName.trim() && editName.trim() !== editing?.name}
      >
        <div className="space-y-4">
          <Field label="আইকন (ইমোজি)">
            <input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} maxLength={4} className="glass-input !text-base text-center w-24" />
          </Field>
          <Field label="নাম">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="glass-input !text-base"
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
            />
          </Field>
        </div>
      </FullDialog>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={del}
        busy={busyDelete}
        title={`"${deleting?.name || ''}" ক্যাটাগরি মুছে ফেলবেন?`}
        body="ব্যবহৃত ক্যাটাগরি মুছতে ব্যর্থ হতে পারে। মুছে গেলে ফিরিয়ে আনা যাবে না।"
      />
    </div>
  );
}

/* ═══════════════ REVIEWS — view sheet + M3 delete ═══════════════ */

export function AdminReviews() {
  const [q, setQ] = useState('');
  const debouncedQ = useRef('');
  const [qTick, setQTick] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetcher = useCallback(async () => {
    let query = supabase
      .from('reviews')
      .select('*, photographers(display_name), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (debouncedQ.current.trim()) query = query.ilike('comment', `%${debouncedQ.current.trim()}%`);
    const { data } = await query;
    return (data as (Review & { photographers?: { display_name?: string | null } | null; profiles?: { full_name?: string | null } | null })[]) || [];
  }, []);

  const list = useAdminList<Review & { photographers?: { display_name?: string | null } | null; profiles?: { full_name?: string | null } | null }>(fetcher, []);
  const { show } = useSnack();

  const onQ = useCallback((v: string) => {
    setQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debouncedQ.current = v;
      setQTick((n) => n + 1);
    }, 350);
  }, []);
  React.useEffect(() => { if (qTick) list.silentReload(); }, [qTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const [viewing, setViewing] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const del = async () => {
    if (!deleting) return;
    setBusyDelete(true);
    const { error } = await supabase.from('reviews').delete().eq('id', deleting.id);
    setBusyDelete(false);
    if (error) { show('ডিলিট ব্যর্থ: ' + error.message, { tone: 'error' }); return; }
    logAction('delete', 'review', deleting.id, 'রিভিউ', {
      note: `রিভিউ ডিলিট${deleting.comment ? `: ${deleting.comment.slice(0, 60)}` : ''}`,
    });
    list.remove(deleting.id);
    show('রিভিউ মুছে ফেলা হয়েছে');
    setDeleting(null);
    setViewing((v) => (v && deleting && v.id === deleting.id ? null : v));
  };

  return (
    <div>
      <FilterBar q={q} onQ={onQ} placeholder="রিভিউ টেক্সট খুঁজুন…" />

      {list.error && <p className="text-sm text-rose-300 mb-3">{list.error}</p>}

      {list.loading ? (
        <ListSkeleton />
      ) : list.items.length === 0 ? (
        <EmptyState icon="⭐" title="কোনো রিভিউ নেই" />
      ) : (
        <div className="space-y-2.5">
          {list.items.map((r) => (
            <div key={r.id} className={`glass rounded-xl2 p-3.5 flex items-center gap-3 ${list.shakeId === r.id ? 'admin-shake' : ''}`}>
              <button type="button" onClick={() => setViewing(r)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                <span className="w-11 h-11 rounded-xl2 bg-sunset-soft border border-sunset-gold/25 grid place-items-center text-sunset-gold font-extrabold text-[13px] shrink-0 tabular-nums">
                  {toBn(r.rating)}★
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] text-white/80 line-clamp-2 leading-relaxed">{r.comment || '—'}</p>
                  <span className="text-[12px] text-white/45 block mt-0.5 truncate">
                    {r.profiles?.full_name || 'গ্রাহক'} → {r.photographers?.display_name || 'ফটোগ্রাফার'} · {bnDate(r.created_at)}
                  </span>
                </div>
              </button>
              <OverflowMenu
                items={[
                  { icon: 'eye', label: 'পুরোটা দেখুন', onClick: () => setViewing(r) },
                  { icon: 'trash', label: 'ডিলিট করুন', danger: true, divider: true, onClick: () => setDeleting(r) },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      {/* VIEW SHEET */}
      <AdminSheet
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="রিভিউ"
        sub={viewing ? `${(viewing as Review & { profiles?: { full_name?: string } }).profiles?.full_name || 'গ্রাহক'} → ${bnDate(viewing.created_at)}` : ''}
        footer={
          viewing && (
            <button type="button" onClick={() => setDeleting(viewing)} className="btn-ghost flex-1 justify-center !text-rose-300">
              <AIcon name="trash" size={16} strokeWidth={2} className="mr-1.5" /> রিভিউ ডিলিট করুন
            </button>
          )
        }
      >
        {viewing && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sunset-gold font-extrabold text-lg tabular-nums">{toBn(viewing.rating)}★</span>
            </div>
            <p className="text-[14.5px] text-white/85 leading-relaxed whitespace-pre-line">{viewing.comment || '—'}</p>
            <div className="mt-4">
              <KV k="গ্রাহক" v={(viewing as Review & { profiles?: { full_name?: string } }).profiles?.full_name || '—'} />
              <KV k="ফটোগ্রাফার" v={(viewing as Review & { photographers?: { display_name?: string } }).photographers?.display_name || '—'} />
              <KV k="তারিখ" v={bnDate(viewing.created_at)} />
              <KV k="রিভিউ আইডি" v={<span className="break-all">{viewing.id}</span>} mono />
            </div>
          </div>
        )}
      </AdminSheet>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={del}
        busy={busyDelete}
        title="রিভিউটি মুছে ফেলবেন?"
        body="রিভিউ স্থায়ীভাবে মুছে যাবে — ফিরিয়ে আনা যাবে না।"
      />
    </div>
  );
}
