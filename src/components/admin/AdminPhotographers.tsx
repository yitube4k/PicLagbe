import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Photographer } from '../../lib/types';
import { COX_SPOTS } from '../../lib/constants';
import { bnDate, taka } from '../../lib/utils';
import { openApp } from '../../lib/base';
import {
  AdminSheet, FullDialog, ConfirmDialog, FilterBar, OverflowMenu,
  Field, StatusPill, EmptyState, ListSkeleton, KV, waMe, telHref,
  useAdminList, useSnack, useOptimistic,
} from './kit';
import { logAction } from '../../lib/audit';
import { AIcon } from '../../admin/icons';

type AdminPhotographer = Photographer & {
  profiles?: { full_name?: string | null; email?: string | null } | null;
  created_at?: string;
};

/**
 * PHOTOGRAPHERS — Android style (Argon spec): card tap = view sheet,
 * pending → inline অ্যাপ্রুভ, else WhatsApp; 3-dot = edit/verify/block/ban/delete.
 * All mutations optimistic (zero-skeleton).
 */
export default function AdminPhotographers({ onChanged }: { onChanged?: () => void }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'blocked' | 'banned'>('all');
  const debouncedQ = useRef('');
  const [qTick, setQTick] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetcher = useCallback(async () => {
    let query = supabase
      .from('photographers')
      .select('*, profiles!photographers_user_id_fkey(full_name, email)')
      .order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('profile_status', filter);
    if (debouncedQ.current.trim()) query = query.ilike('display_name', `%${debouncedQ.current.trim()}%`);
    const { data } = await query;
    return (data as AdminPhotographer[]) || [];
  }, [filter]);

  const list = useAdminList<AdminPhotographer>(fetcher, [filter]);
  const { show } = useSnack();
  const opt = useOptimistic();

  const onQ = useCallback((v: string) => {
    setQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debouncedQ.current = v;
      setQTick((n) => n + 1);
    }, 350);
  }, []);
  React.useEffect(() => { if (qTick) list.silentReload(); }, [qTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const [viewing, setViewing] = useState<AdminPhotographer | null>(null);
  const [editing, setEditing] = useState<AdminPhotographer | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<AdminPhotographer | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // edit form
  const [f, setF] = useState({
    display_name: '', slug: '', bio: '', city: '', full_location: '',
    experience_years: 1, equipment: '', languages: '', starting_price: 1000,
    profile_photo_url: '', cover_photo_url: '', home_spot: 'laboni',
    phone: '', whatsapp: '', service_areas: '',
    profile_status: 'pending' as Photographer['profile_status'], verified: false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const setFD = (p: Partial<typeof f>) => { setF((prev) => ({ ...prev, ...p })); dirtyRef.current = true; };

  const openEdit = (p: AdminPhotographer) => {
    setEditing(p);
    setF({
      display_name: p.display_name || '', slug: p.slug || '', bio: p.bio || '',
      city: p.city || 'Cox\u2019s Bazar', full_location: p.full_location || '',
      experience_years: p.experience_years || 1, equipment: p.equipment || '',
      languages: p.languages || '', starting_price: p.starting_price || 1000,
      profile_photo_url: p.profile_photo_url || '', cover_photo_url: p.cover_photo_url || '',
      home_spot: p.home_spot || 'laboni', phone: p.phone || '', whatsapp: p.whatsapp || '',
      service_areas: p.service_areas || '', profile_status: p.profile_status || 'pending',
      verified: p.verified || false,
    });
    dirtyRef.current = false;
    setErr(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from('photographers').update({
      display_name: f.display_name.trim(),
      slug: f.slug.trim() || undefined,
      bio: f.bio.trim() || null,
      city: f.city.trim() || null,
      full_location: f.full_location.trim() || null,
      experience_years: Number(f.experience_years) || 1,
      equipment: f.equipment.trim() || null,
      languages: f.languages.trim() || null,
      starting_price: Number(f.starting_price) || null,
      profile_photo_url: f.profile_photo_url.trim() || null,
      cover_photo_url: f.cover_photo_url.trim() || null,
      home_spot: f.home_spot,
      phone: f.phone.trim() || null,
      whatsapp: f.whatsapp.trim() || null,
      service_areas: f.service_areas.trim() || null,
      profile_status: f.profile_status,
      verified: f.verified,
    }).eq('id', editing.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    logAction('update', 'photographer', editing.id, f.display_name.trim(), {
      note: 'ফটোগ্রাফার প্রোফাইল এডিট',
      after: { profile_status: f.profile_status, verified: f.verified, home_spot: f.home_spot, starting_price: Number(f.starting_price) || null },
    });
    list.patch(editing.id, {
      display_name: f.display_name.trim(), bio: f.bio.trim() || null, city: f.city.trim() || null,
      starting_price: Number(f.starting_price) || null, home_spot: f.home_spot,
      phone: f.phone.trim() || null, whatsapp: f.whatsapp.trim() || null,
      profile_status: f.profile_status, verified: f.verified,
    } as Partial<AdminPhotographer>);
    setEditing(null);
    show('প্রোফাইল সেভ হয়েছে');
    onChanged?.();
    list.silentReload();
  };

  /** optimistic status change (approve/block/ban/unban) */
  const setStatus = async (p: AdminPhotographer, status: AdminPhotographer['profile_status']) => {
    const old = p.profile_status;
    if (status === old) return;
    setBusyId(p.id);
    const ok = await opt.run({
      patchFn: () => list.patch(p.id, { profile_status: status } as Partial<AdminPhotographer>),
      mutate: () => supabase.from('photographers').update({ profile_status: status }).eq('id', p.id),
      okMsg: status === 'approved' ? `${p.display_name} অ্যাপ্রুভ হয়েছে` : `${p.display_name} → ${status === 'blocked' ? 'ব্লকড' : 'ব্যানড'}`,
      reload: () => list.silentReload(),
    });
    setBusyId(null);
    if (ok) {
      logAction(status === 'approved' ? 'approve' : 'status_change', 'photographer', p.id, p.display_name, {
        note: `স্ট্যাটাস: ${old} → ${status}`,
        before: { profile_status: old }, after: { profile_status: status },
      });
      onChanged?.();
    }
  };

  /** optimistic verify toggle */
  const toggleVerified = async (p: AdminPhotographer) => {
    setBusyId(p.id);
    const ok = await opt.run({
      patchFn: () => list.patch(p.id, { verified: !p.verified } as Partial<AdminPhotographer>),
      mutate: () => supabase.from('photographers').update({ verified: !p.verified }).eq('id', p.id),
      okMsg: p.verified ? `${p.display_name} — ভেরিফায়েড ব্যাজ সরানো হয়েছে` : `${p.display_name} ভেরিফায়েড হয়েছে ✓`,
      reload: () => list.silentReload(),
    });
    setBusyId(null);
    if (ok) {
      logAction(p.verified ? 'unverify' : 'verify', 'photographer', p.id, p.display_name, {
        note: p.verified ? 'ভেরিফায়েড ব্যাজ সরানো হয়েছে' : 'ভেরিফায়েড ব্যাজ দেওয়া হয়েছে',
        after: { verified: !p.verified },
      });
      onChanged?.();
    }
  };

  const delPhotographer = async () => {
    if (!deleting) return;
    setBusyDelete(true);
    const { error } = await supabase.from('photographers').delete().eq('id', deleting.id);
    setBusyDelete(false);
    if (error) { show('ডিলিট ব্যর্থ: ' + error.message, { tone: 'error' }); return; }
    logAction('delete', 'photographer', deleting.id, deleting.display_name, { note: `ফটোগ্রাফার ডিলিট (${deleting.display_name})` });
    list.remove(deleting.id);
    show('ফটোগ্রাফার মুছে ফেলা হয়েছে');
    setDeleting(null);
    setViewing((v) => (v && deleting && v.id === deleting.id ? null : v));
    onChanged?.();
  };

  // manual add
  const [a, setA] = useState({ name: '', email: '', phone: '', spot: 'laboni', price: '4000', bio: '' });
  const [addErr, setAddErr] = useState<string | null>(null);
  const addManual = async () => {
    if (!a.name.trim()) { setAddErr('নাম দিন'); return; }
    setSaving(true);
    setAddErr(null);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    const { data: created, error } = await supabase.from('photographers').insert({
      user_id: uid,
      display_name: a.name.trim(),
      slug: `${a.name.trim().toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')}-${Date.now().toString(36)}`,
      bio: a.bio.trim() || null,
      home_spot: a.spot,
      starting_price: Number(a.price) || null,
      phone: a.phone.trim() || null,
      whatsapp: a.phone.trim() || null,
      profile_status: 'approved',
      city: "Cox's Bazar",
    }).select('id').single();
    setSaving(false);
    if (error) { setAddErr(error.message); return; }
    logAction('create', 'photographer', created?.id || null, a.name.trim(), {
      note: `ম্যানুয়াল ফটোগ্রাফার যোগ (${a.name.trim()})`,
      after: { home_spot: a.spot, starting_price: Number(a.price) || null },
    });
    setAdding(false);
    setA({ name: '', email: '', phone: '', spot: 'laboni', price: '4000', bio: '' });
    show(`${a.name.trim()} যোগ হয়েছে (অ্যাপ্রুভড)`);
    onChanged?.();
    list.silentReload();
  };

  const spotName = (key?: string | null) => COX_SPOTS.find((s) => s.key === key)?.nameBn || key || '—';

  return (
    <div>
      <FilterBar
        q={q}
        onQ={onQ}
        placeholder="নাম খুঁজুন…"
        chips={[
          { key: 'all', label: 'সব' },
          { key: 'pending', label: 'পেন্ডিং' },
          { key: 'approved', label: 'অ্যাপ্রুভড' },
          { key: 'blocked', label: 'ব্লকড' },
          { key: 'banned', label: 'ব্যানড' },
        ]}
        activeChip={filter}
        onChip={(k) => setFilter(k as typeof filter)}
        right={
          <button type="button" onClick={() => setAdding(true)} aria-label="ম্যানুয়াল যোগ" title="ম্যানুয়াল যোগ"
            className="shrink-0 w-11 h-11 rounded-full grid place-items-center bg-sunset-gradient text-[#1A0E06] shadow-sunset-glow active:scale-90 transition-transform">
            <AIcon name="plus" size={20} strokeWidth={2.4} />
          </button>
        }
      />

      {list.error && <p className="text-sm text-rose-300 mb-3">{list.error}</p>}

      {list.loading ? (
        <ListSkeleton />
      ) : list.items.length === 0 ? (
        <EmptyState icon="📷" title="কোনো ফটোগ্রাফার পাওয়া যায়নি" sub="ফিল্টার বদলে দেখুন বা ম্যানুয়াল যোগ করুন।" />
      ) : (
        <div className="space-y-2.5">
          {list.items.map((p) => {
            const wa = waMe(p.whatsapp || p.phone, `আসসালামু আলাইকুম ${p.display_name || ''}! PicLagbe থেকে যোগাযোগ করছি।`);
            return (
              <div key={p.id} className={`glass rounded-xl2 p-3.5 flex items-center gap-2.5 ${list.shakeId === p.id ? 'admin-shake' : ''}`}>
                {/* card tap → view */}
                <button type="button" onClick={() => setViewing(p)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                  {p.profile_photo_url ? (
                    <img src={p.profile_photo_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-sunset-gold/30 shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-sunset-gradient flex items-center justify-center text-sm font-extrabold text-[#1A0E06] shrink-0">
                      {(p.display_name || 'ফ').slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="font-bold text-white text-[14.5px] truncate">{p.display_name}</span>
                      <StatusPill status={p.profile_status} busy={busyId === p.id} />
                      {p.verified && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-300">
                          <AIcon name="shield" size={11} strokeWidth={2.4} /> KYC
                        </span>
                      )}
                    </div>
                    <span className="text-[12.5px] text-white/50 truncate block mt-0.5">
                      {p.profiles?.email || '—'} · {taka(p.starting_price || 0)} · {spotName(p.home_spot)}
                    </span>
                  </div>
                </button>

                {/* visible slot: pending → approve (gold); else WhatsApp */}
                {p.profile_status === 'pending' ? (
                  <button type="button" onClick={() => setStatus(p, 'approved')} disabled={busyId === p.id}
                    title="অ্যাপ্রুভ করুন" aria-label="অ্যাপ্রুভ করুন"
                    className="shrink-0 w-11 h-11 rounded-full grid place-items-center bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 active:scale-90 transition-transform disabled:opacity-50">
                    <AIcon name="check" size={19} strokeWidth={2.4} />
                  </button>
                ) : wa ? (
                  <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp মেসেজ" title="WhatsApp মেসেজ"
                    className="shrink-0 w-11 h-11 rounded-full grid place-items-center text-emerald-300 hover:bg-emerald-400/15 transition-colors active:scale-90">
                    <AIcon name="whatsapp" size={20} strokeWidth={1.9} />
                  </a>
                ) : <span className="w-1 shrink-0" />}
                <OverflowMenu
                  items={[
                    { icon: 'eye', label: 'বিস্তারিত দেখুন', onClick: () => setViewing(p) },
                    { icon: 'external', label: 'প্রোফাইল খুলুন', onClick: () => openApp(`/photographer/${p.id}`) },
                    { icon: 'check', label: 'অ্যাপ্রুভ করুন', hide: p.profile_status === 'approved', onClick: () => setStatus(p, 'approved') },
                    { icon: 'ban', label: 'ব্লক করুন', hide: p.profile_status === 'blocked', onClick: () => setStatus(p, 'blocked') },
                    { icon: 'ban', label: 'ব্যান করুন', danger: true, hide: p.profile_status === 'banned', onClick: () => setStatus(p, 'banned') },
                    { icon: 'shield', label: 'ভেরিফায়েড করুন', checked: p.verified, divider: true, onClick: () => toggleVerified(p) },
                    { icon: 'edit', label: 'এডিট করুন', onClick: () => openEdit(p) },
                    { icon: 'trash', label: 'ডিলিট করুন', danger: true, divider: true, onClick: () => setDeleting(p) },
                  ]}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW SHEET */}
      <AdminSheet
        open={!!viewing}
        onClose={() => setViewing(null)}
        wide
        header={
          viewing ? (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {viewing.profile_photo_url ? (
                <img src={viewing.profile_photo_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-sunset-gold/30 shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-sunset-gradient grid place-items-center text-sm font-extrabold text-[#1A0E06] shrink-0">
                  {(viewing.display_name || 'ফ').slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-extrabold text-white text-[16px] leading-snug truncate">{viewing.display_name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <StatusPill status={viewing.profile_status} busy={busyId === viewing.id} />
                  {viewing.verified && (
                    <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-300">
                      <AIcon name="shield" size={11} strokeWidth={2.4} /> ভেরিফায়েড
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : undefined
        }
        footer={
          viewing && (
            <>
              <button type="button" onClick={() => openEdit(viewing)} className="btn-primary flex-1 justify-center">
                <AIcon name="edit" size={16} strokeWidth={2} className="mr-1.5" /> এডিট করুন
              </button>
              {viewing.profile_status === 'pending' && (
                <button type="button" onClick={() => { const v = viewing; setViewing(null); setStatus(v, 'approved'); }}
                  className="h-11 px-4 rounded-full bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 text-sm font-bold active:scale-95 transition-transform whitespace-nowrap">
                  ✓ অ্যাপ্রুভ
                </button>
              )}
              {waMe(viewing.whatsapp || viewing.phone) && (
                <a href={waMe(viewing.whatsapp || viewing.phone)!} target="_blank" rel="noreferrer"
                  className="h-11 w-11 rounded-full grid place-items-center bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 active:scale-90 transition-transform" aria-label="WhatsApp">
                  <AIcon name="whatsapp" size={19} strokeWidth={1.9} />
                </a>
              )}
            </>
          )
        }
      >
        {viewing && (
          <div>
            <KV k="ইমেইল" v={viewing.profiles?.email} mono />
            <KV k="হোম স্পট" v={spotName(viewing.home_spot)} />
            <KV k="শুরু প্রাইস" v={viewing.starting_price ? taka(viewing.starting_price) : '—'} />
            <KV k="অভিজ্ঞতা" v={viewing.experience_years ? `${viewing.experience_years} বছর` : '—'} />
            <KV k="শহর" v={viewing.city} />
            <KV k="লোকেশন" v={viewing.full_location} />
            <KV k="ফোন" v={viewing.phone || '—'} />
            <KV k="WhatsApp" v={viewing.whatsapp || '—'} />
            <KV k="যন্ত্রপাতি" v={viewing.equipment} />
            <KV k="ভাষা" v={viewing.languages} />
            <KV k="সার্ভিস এরিয়া" v={viewing.service_areas} />
            <KV k="যোগদান" v={viewing.created_at ? bnDate(viewing.created_at) : '—'} />
            {viewing.bio && (
              <div className="mt-3">
                <p className="field-label">বায়ো</p>
                <p className="text-[13.5px] text-white/80 leading-relaxed mt-1 whitespace-pre-line">{viewing.bio}</p>
              </div>
            )}
          </div>
        )}
      </AdminSheet>

      {/* EDIT FULL DIALOG */}
      <FullDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title="ফটোগ্রাফার এডিট"
        sub={editing?.display_name}
        onSave={saveEdit}
        saving={saving}
        dirty={dirtyRef.current}
        err={err}
        wide
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="ডিসপ্লে নেম">
              <input value={f.display_name} onChange={(e) => setFD({ display_name: e.target.value })} className="glass-input !text-base" />
            </Field>
            <Field label="স্লাগ" hint="খালি রাখলে অপরিবর্তিত থাকবে">
              <input value={f.slug} onChange={(e) => setFD({ slug: e.target.value })} className="glass-input !text-base" />
            </Field>
          </div>
          <Field label="বায়ো">
            <textarea value={f.bio} onChange={(e) => setFD({ bio: e.target.value })} rows={3} className="glass-input resize-y !text-base" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="শহর">
              <input value={f.city} onChange={(e) => setFD({ city: e.target.value })} className="glass-input !text-base" />
            </Field>
            <Field label="সম্পূর্ণ লোকেশন">
              <input value={f.full_location} onChange={(e) => setFD({ full_location: e.target.value })} className="glass-input !text-base" />
            </Field>
            <Field label="অভিজ্ঞতা (বছর)">
              <input type="number" min={1} value={f.experience_years} onChange={(e) => setFD({ experience_years: Number(e.target.value) })} className="glass-input !text-base" inputMode="numeric" />
            </Field>
            <Field label="শুরু প্রাইস (৳)">
              <input type="number" min={0} value={f.starting_price} onChange={(e) => setFD({ starting_price: Number(e.target.value) })} className="glass-input !text-base" inputMode="numeric" />
            </Field>
            <Field label="যন্ত্রপাতি" hint="কমা দিয়ে আলাদা করুন">
              <input value={f.equipment} onChange={(e) => setFD({ equipment: e.target.value })} className="glass-input !text-base" />
            </Field>
            <Field label="ভাষা" hint="কমা দিয়ে আলাদা করুন">
              <input value={f.languages} onChange={(e) => setFD({ languages: e.target.value })} className="glass-input !text-base" />
            </Field>
            <Field label="প্রোফাইল ছবি URL">
              <input value={f.profile_photo_url} onChange={(e) => setFD({ profile_photo_url: e.target.value })} className="glass-input !text-base" inputMode="url" />
            </Field>
            <Field label="কভার ছবি URL">
              <input value={f.cover_photo_url} onChange={(e) => setFD({ cover_photo_url: e.target.value })} className="glass-input !text-base" inputMode="url" />
            </Field>
            <Field label="হোম স্পট">
              <select value={f.home_spot} onChange={(e) => setFD({ home_spot: e.target.value })} className="glass-select !text-base">
                {COX_SPOTS.map((s) => (
                  <option key={s.key} value={s.key}>{s.nameBn}</option>
                ))}
              </select>
            </Field>
            <Field label="ফোন">
              <input value={f.phone} onChange={(e) => setFD({ phone: e.target.value })} className="glass-input !text-base" inputMode="tel" />
            </Field>
            <Field label="WhatsApp">
              <input value={f.whatsapp} onChange={(e) => setFD({ whatsapp: e.target.value })} className="glass-input !text-base" inputMode="tel" />
            </Field>
            <Field label="সার্ভিস এরিয়া" hint="কমা দিয়ে আলাদা করুন">
              <input value={f.service_areas} onChange={(e) => setFD({ service_areas: e.target.value })} className="glass-input !text-base" />
            </Field>
            <Field label="স্ট্যাটাস">
              <select value={f.profile_status} onChange={(e) => setFD({ profile_status: e.target.value as Photographer['profile_status'] })} className="glass-select !text-base">
                <option value="pending">পেন্ডিং</option>
                <option value="approved">অ্যাপ্রুভড</option>
                <option value="blocked">ব্লকড</option>
                <option value="banned">ব্যানড</option>
              </select>
            </Field>
            <Field label="KYC ভেরিফায়েড">
              <button type="button" onClick={() => setFD({ verified: !f.verified })} className={f.verified ? 'chip-active' : 'chip'}>
                {f.verified ? '✓ ভেরিফায়েড' : 'ভেরিফায়েড নয়'}
              </button>
            </Field>
          </div>
        </div>
      </FullDialog>

      {/* MANUAL ADD FULL DIALOG */}
      <FullDialog
        open={adding}
        onClose={() => setAdding(false)}
        title="ম্যানুয়াল ফটোগ্রাফার যোগ"
        sub="সরাসরি অ্যাপ্রুভড অবস্থায় যুক্ত হবে"
        onSave={addManual}
        saving={saving}
        saveLabel="যোগ করুন"
        err={addErr}
      >
        <div className="space-y-4">
          <Field label="নাম *">
            <input value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} className="glass-input !text-base" />
          </Field>
          <Field label="ইমেইল (নোটের জন্য)">
            <input value={a.email} onChange={(e) => setA({ ...a, email: e.target.value })} className="glass-input !text-base" inputMode="email" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="ফোন / WhatsApp">
              <input value={a.phone} onChange={(e) => setA({ ...a, phone: e.target.value })} className="glass-input !text-base" inputMode="tel" />
            </Field>
            <Field label="শুরু প্রাইস (৳)">
              <input type="number" value={a.price} onChange={(e) => setA({ ...a, price: e.target.value })} className="glass-input !text-base" inputMode="numeric" />
            </Field>
          </div>
          <Field label="হোম স্পট">
            <select value={a.spot} onChange={(e) => setA({ ...a, spot: e.target.value })} className="glass-select !text-base">
              {COX_SPOTS.map((s) => (
                <option key={s.key} value={s.key}>{s.nameBn}</option>
              ))}
            </select>
          </Field>
          <Field label="বায়ো">
            <textarea value={a.bio} onChange={(e) => setA({ ...a, bio: e.target.value })} rows={2} className="glass-input resize-y !text-base" />
          </Field>
        </div>
      </FullDialog>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={delPhotographer}
        busy={busyDelete}
        title={`${deleting?.display_name || 'ফটোগ্রাফার'}-এর প্রোফাইল মুছে ফেলবেন?`}
        body="প্রোফাইল, পোস্ট ও সংযুক্ত তথ্য স্থায়ীভাবে মুছে যাবে — ফিরিয়ে আনা যাবে না।"
      />
    </div>
  );
}
