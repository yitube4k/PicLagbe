import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Photographer } from '../../lib/types';
import { COX_SPOTS } from '../../lib/constants';
import { bnDate, taka } from '../../lib/utils';
import { AdminModal, Field, StatusPill, EmptyState, SectionHead, DangerConfirm } from './kit';
import { logAction } from '../../lib/audit';

type AdminPhotographer = Photographer & {
  profiles?: { full_name?: string | null; email?: string | null } | null;
  created_at?: string;
};

/**
 * PHOTOGRAPHERS — full control: সব ফিল্ড এডিট, স্ট্যাটাস (approve/block/ban),
 * ভেরিফাইড টগল, ম্যানুয়াল যোগ, ডিলিট।
 */
export default function AdminPhotographers({ onChanged }: { onChanged?: () => void }) {
  const [list, setList] = useState<AdminPhotographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'blocked' | 'banned'>('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<AdminPhotographer | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // edit form state (সব ফিল্ড)
  const [f, setF] = useState({
    display_name: '',
    slug: '',
    bio: '',
    city: '',
    full_location: '',
    experience_years: 1,
    equipment: '',
    languages: '',
    starting_price: 1000,
    profile_photo_url: '',
    cover_photo_url: '',
    home_spot: 'laboni',
    phone: '',
    whatsapp: '',
    service_areas: '',
    profile_status: 'pending' as Photographer['profile_status'],
    verified: false,
  });

  // add form
  const [a, setA] = useState({ name: '', email: '', phone: '', spot: 'laboni', price: '4000', bio: '' });

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('photographers')
      .select('*, profiles!photographers_user_id_fkey(full_name, email)')
      .order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('profile_status', filter);
    if (q.trim()) query = query.ilike('display_name', `%${q.trim()}%`);
    const { data } = await query;
    setList((data as AdminPhotographer[]) || []);
    setLoading(false);
  }, [filter, q]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(load, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [load]);

  const openEdit = (p: AdminPhotographer) => {
    setEditing(p);
    setF({
      display_name: p.display_name || '',
      slug: p.slug || '',
      bio: p.bio || '',
      city: p.city || 'Cox\u2019s Bazar',
      full_location: p.full_location || '',
      experience_years: p.experience_years || 1,
      equipment: p.equipment || '',
      languages: p.languages || '',
      starting_price: p.starting_price || 1000,
      profile_photo_url: p.profile_photo_url || '',
      cover_photo_url: p.cover_photo_url || '',
      home_spot: p.home_spot || 'laboni',
      phone: p.phone || '',
      whatsapp: p.whatsapp || '',
      service_areas: p.service_areas || '',
      profile_status: p.profile_status || 'pending',
      verified: p.verified || false,
    });
    setErr(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setErr(null);
    const { error } = await supabase
      .from('photographers')
      .update({
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
      })
      .eq('id', editing.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    logAction('update', 'photographer', editing.id, f.display_name.trim(), {
      note: 'ফটোগ্রাফার প্রোফাইল এডিট',
      after: { profile_status: f.profile_status, verified: f.verified, home_spot: f.home_spot, starting_price: Number(f.starting_price) || null },
    });
    setEditing(null);
    load();
    onChanged?.();
  };

  const setStatus = async (p: AdminPhotographer, status: AdminPhotographer['profile_status']) => {
    const { error } = await supabase.from('photographers').update({ profile_status: status }).eq('id', p.id);
    if (error) { window.alert('ব্যর্থ: ' + error.message); return; }
    logAction(status === 'approved' ? 'approve' : 'status_change', 'photographer', p.id, p.display_name, {
      note: `স্ট্যাটাস: ${p.profile_status} → ${status}`,
      before: { profile_status: p.profile_status },
      after: { profile_status: status },
    });
    load();
    onChanged?.();
  };

  const toggleVerified = async (p: AdminPhotographer) => {
    const { error } = await supabase.from('photographers').update({ verified: !p.verified }).eq('id', p.id);
    if (error) { window.alert('ব্যর্থ: ' + error.message); return; }
    logAction(p.verified ? 'unverify' : 'verify', 'photographer', p.id, p.display_name, {
      note: p.verified ? 'ভেরিফায়েড ব্যাজ সরানো হয়েছে' : 'ভেরিফায়েড ব্যাজ দেওয়া হয়েছে',
      after: { verified: !p.verified },
    });
    load();
    onChanged?.();
  };

  const delPhotographer = async (p: AdminPhotographer) => {
    const { error } = await supabase.from('photographers').delete().eq('id', p.id);
    if (error) { window.alert('ডিলিট ব্যর্থ: ' + error.message); return; }
    logAction('delete', 'photographer', p.id, p.display_name, {
      note: `ফটোগ্রাফার ডিলিট (${p.display_name})`,
    });
    load();
    onChanged?.();
  };

  const addManual = async () => {
    if (!a.name.trim()) { setErr('নাম দিন'); return; }
    setSaving(true);
    setErr(null);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    const { error } = await supabase.from('photographers').insert({
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
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    logAction('create', 'photographer', null, a.name.trim(), {
      note: `ম্যানুয়াল ফটোগ্রাফার যোগ (${a.name.trim()})`,
      after: { home_spot: a.spot, starting_price: Number(a.price) || null },
    });
    setAdding(false);
    setA({ name: '', email: '', phone: '', spot: 'laboni', price: '4000', bio: '' });
    load();
    onChanged?.();
  };

  return (
    <div>
      <SectionHead
        title="ফটোগ্রাফার ম্যানেজমেন্ট"
        sub="সব প্রোফাইলের সম্পূর্ণ নিয়ন্ত্রণ — এডিট, অ্যাপ্রুভ, ব্লক, ব্যান, ভেরিফাই"
        right={
          <button type="button" onClick={() => setAdding(true)} className="btn-primary text-sm">
            ＋ ম্যানুয়াল যোগ
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="নাম খুঁজুন…"
          className="glass-input !w-56"
        />
        {(['all', 'pending', 'approved', 'blocked', 'banned'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilter(st)}
            className={filter === st ? 'chip-active' : 'chip'}
          >
            {st === 'all' ? 'সব' : st === 'pending' ? 'পেন্ডিং' : st === 'approved' ? 'অ্যাপ্রুভড' : st === 'blocked' ? 'ব্লকড' : 'ব্যানড'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl2" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon="📷" title="কোনো ফটোগ্রাফার পাওয়া যায়নি" />
      ) : (
        <div className="space-y-2">
          {list.map((p) => (
            <div key={p.id} className="glass rounded-xl2 p-3.5 flex items-center gap-3">
              {p.profile_photo_url ? (
                <img src={p.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-sunset-gold/30 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-sunset-gradient flex items-center justify-center text-xs font-extrabold text-[#1A0E06] shrink-0">
                  {(p.display_name || 'ফ').slice(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/photographer/${p.id}`} className="font-bold text-white text-sm hover:text-sunset-gold truncate">
                    {p.display_name}
                  </Link>
                  <StatusPill status={p.profile_status} />
                  {p.verified && (
                    <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      ✓ KYC
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/50 truncate block">
                  {p.profiles?.email || '—'} · {taka(p.starting_price || 0)}{p.created_at ? ` · ${bnDate(p.created_at)}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {p.profile_status === 'pending' && (
                  <button type="button" onClick={() => setStatus(p, 'approved')} className="text-xs font-semibold text-emerald-300 hover:underline">
                    ✓ অ্যাপ্রুভ
                  </button>
                )}
                {p.profile_status === 'approved' && (
                  <button type="button" onClick={() => setStatus(p, 'blocked')} className="text-xs font-semibold text-orange-300 hover:underline">
                    ব্লক
                  </button>
                )}
                {(p.profile_status === 'blocked' || p.profile_status === 'banned') && (
                  <button type="button" onClick={() => setStatus(p, 'approved')} className="text-xs font-semibold text-emerald-300 hover:underline">
                    আনবান
                  </button>
                )}
                <button type="button" onClick={() => toggleVerified(p)} className="text-xs font-semibold text-white/70 hover:text-white">
                  {p.verified ? 'অভেরিফাই' : 'ভেরিফাই'}
                </button>
                <button type="button" onClick={() => openEdit(p)} className="text-xs font-semibold text-sunset-gold hover:underline">
                  ✏️ এডিট
                </button>
                <DangerConfirm onConfirm={() => delPhotographer(p)} message={`${p.display_name}-এর প্রোফাইল ডিলিট করবেন?`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full edit modal */}
      <AdminModal open={!!editing} onClose={() => setEditing(null)} title="ফটোগ্রাফার সম্পূর্ণ এডিট" wide>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="ডিসপ্লে নেম">
            <input value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} className="glass-input" />
          </Field>
          <Field label="স্লাগ" hint="খালি রাখলে অপরিবর্তিত থাকবে">
            <input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} className="glass-input" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="বায়ো">
              <textarea value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} rows={3} className="glass-input resize-y" />
            </Field>
          </div>
          <Field label="শহর">
            <input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className="glass-input" />
          </Field>
          <Field label="সম্পূর্ণ লোকেশন">
            <input value={f.full_location} onChange={(e) => setF({ ...f, full_location: e.target.value })} className="glass-input" />
          </Field>
          <Field label="অভিজ্ঞতা (বছর)">
            <input type="number" min={1} value={f.experience_years} onChange={(e) => setF({ ...f, experience_years: Number(e.target.value) })} className="glass-input" />
          </Field>
          <Field label="শুরু প্রাইস (৳)">
            <input type="number" min={0} value={f.starting_price} onChange={(e) => setF({ ...f, starting_price: Number(e.target.value) })} className="glass-input" />
          </Field>
          <Field label="যন্ত্রপাতি" hint="কমা দিয়ে আলাদা করুন">
            <input value={f.equipment} onChange={(e) => setF({ ...f, equipment: e.target.value })} className="glass-input" />
          </Field>
          <Field label="ভাষা" hint="কমা দিয়ে আলাদা করুন">
            <input value={f.languages} onChange={(e) => setF({ ...f, languages: e.target.value })} className="glass-input" />
          </Field>
          <Field label="প্রোফাইল ছবি URL">
            <input value={f.profile_photo_url} onChange={(e) => setF({ ...f, profile_photo_url: e.target.value })} className="glass-input" />
          </Field>
          <Field label="কভার ছবি URL">
            <input value={f.cover_photo_url} onChange={(e) => setF({ ...f, cover_photo_url: e.target.value })} className="glass-input" />
          </Field>
          <Field label="হোম স্পট">
            <select value={f.home_spot} onChange={(e) => setF({ ...f, home_spot: e.target.value })} className="glass-select">
              {COX_SPOTS.map((s) => (
                <option key={s.key} value={s.key}>{s.nameBn}</option>
              ))}
            </select>
          </Field>
          <Field label="ফোন">
            <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="glass-input" />
          </Field>
          <Field label="WhatsApp">
            <input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} className="glass-input" />
          </Field>
          <Field label="সার্ভিস এরিয়া" hint="কমা দিয়ে আলাদা করুন">
            <input value={f.service_areas} onChange={(e) => setF({ ...f, service_areas: e.target.value })} className="glass-input" />
          </Field>
          <Field label="স্ট্যাটাস">
            <select value={f.profile_status} onChange={(e) => setF({ ...f, profile_status: e.target.value as Photographer['profile_status'] })} className="glass-select">
              <option value="pending">পেন্ডিং</option>
              <option value="approved">অ্যাপ্রুভড</option>
              <option value="blocked">ব্লকড</option>
              <option value="banned">ব্যানড</option>
            </select>
          </Field>
          <Field label="KYC ভেরিফায়েড">
            <button
              type="button"
              onClick={() => setF({ ...f, verified: !f.verified })}
              className={f.verified ? 'chip-active' : 'chip'}
            >
              {f.verified ? '✓ ভেরিফায়েড' : 'ভেরিফায়েড নয়'}
            </button>
          </Field>
        </div>

        {err && <p className="text-xs text-rose-400 mt-4">{err}</p>}

        <div className="flex gap-3 mt-5">
          <button type="button" onClick={saveEdit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
          </button>
          <button type="button" onClick={() => setEditing(null)} className="btn-ghost">
            বাতিল
          </button>
        </div>
      </AdminModal>

      {/* Manual add modal */}
      <AdminModal open={adding} onClose={() => setAdding(false)} title="ম্যানুয়াল ফটোগ্রাফার যোগ">
        <div className="space-y-4">
          <Field label="নাম *">
            <input value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} className="glass-input" />
          </Field>
          <Field label="ইমেইল (নোটের জন্য)">
            <input value={a.email} onChange={(e) => setA({ ...a, email: e.target.value })} className="glass-input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ফোন / WhatsApp">
              <input value={a.phone} onChange={(e) => setA({ ...a, phone: e.target.value })} className="glass-input" />
            </Field>
            <Field label="শুরু প্রাইস (৳)">
              <input type="number" value={a.price} onChange={(e) => setA({ ...a, price: e.target.value })} className="glass-input" />
            </Field>
          </div>
          <Field label="হোম স্পট">
            <select value={a.spot} onChange={(e) => setA({ ...a, spot: e.target.value })} className="glass-select">
              {COX_SPOTS.map((s) => (
                <option key={s.key} value={s.key}>{s.nameBn}</option>
              ))}
            </select>
          </Field>
          <Field label="বায়ো">
            <textarea value={a.bio} onChange={(e) => setA({ ...a, bio: e.target.value })} rows={2} className="glass-input resize-y" />
          </Field>
          <p className="text-[11px] text-white/45">ম্যানুয়াল যোগ করা প্রোফাইল সরাসরি অ্যাপ্রুভড অবস্থায় যাবে।</p>
          {err && <p className="text-xs text-rose-400">{err}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={addManual} disabled={saving} className="btn-primary flex-1">
              {saving ? 'যোগ হচ্ছে…' : 'যোগ করুন'}
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
