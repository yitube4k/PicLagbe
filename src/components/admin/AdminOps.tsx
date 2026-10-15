import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Booking } from '../../lib/types';
import { bnDate, STATUS_BN } from '../../lib/utils';
import { AdminModal, Field, StatusPill, EmptyState, SectionHead, DangerConfirm } from './kit';

type AdminBooking = Booking & {
  photographers?: { display_name?: string | null } | null;
  profiles?: { full_name?: string | null } | null;
};

/* ═══════════════ BOOKINGS — status control + delete ═══════════════ */
export function AdminBookings() {
  const [list, setList] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<AdminBooking | null>(null);
  const [status, setStatus] = useState<Booking['status']>('pending');
  const [date, setDate] = useState('');
  const [loc, setLoc] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('bookings')
      .select('*, photographers(display_name), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(150);
    if (filter) query = query.eq('status', filter);
    const { data } = await query;
    setList((data as AdminBooking[]) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(load, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [load]);

  const openEdit = (b: AdminBooking) => {
    setEditing(b);
    setStatus(b.status);
    setDate(b.event_date?.slice(0, 10) || '');
    setLoc(b.event_location || '');
    setNotes(b.notes || '');
    setErr(null);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setErr(null);
    const { error } = await supabase
      .from('bookings')
      .update({
        status,
        event_date: date,
        event_location: loc.trim() || null,
        notes: notes.trim() || null,
      })
      .eq('id', editing.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setEditing(null);
    load();
  };

  const del = async (b: AdminBooking) => {
    const { error } = await supabase.from('bookings').delete().eq('id', b.id);
    if (error) { window.alert('ডিলিট ব্যর্থ: ' + error.message); return; }
    load();
  };

  return (
    <div>
      <SectionHead title="বুকিং ম্যানেজমেন্ট" sub="সব বুকিং — স্ট্যাটাস বদল, বিস্তারিত এডিট, ডিলিট" />

      <div className="flex flex-wrap gap-2 mb-5">
        {['', 'pending', 'accepted', 'rejected', 'cancelled', 'completed'].map((st) => (
          <button key={st} type="button" onClick={() => setFilter(st)} className={filter === st ? 'chip-active' : 'chip'}>
            {st === '' ? 'সব' : STATUS_BN[st] || st}
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
        <EmptyState icon="📅" title="কোনো বুকিং নেই" />
      ) : (
        <div className="space-y-2">
          {list.map((b) => (
            <div key={b.id} className="glass rounded-xl2 p-3.5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm truncate">
                    {b.profiles?.full_name || 'গ্রাহক'} → {b.photographers?.display_name || 'ফটোগ্রাফার'}
                  </span>
                  <StatusPill status={b.status} />
                </div>
                <span className="text-xs text-white/50 truncate block">
                  {bnDate(b.event_date)} {b.event_time || ''} · {b.packages ? b.packages.name : 'কাস্টম'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => openEdit(b)} className="text-xs font-semibold text-sunset-gold hover:underline">
                  ✏️ এডিট
                </button>
                <DangerConfirm onConfirm={() => del(b)} message="বুকিংটি ডিলিট করবেন?" />
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminModal open={!!editing} onClose={() => setEditing(null)} title="বুকিং এডিট">
        <div className="space-y-4">
          <Field label="স্ট্যাটাস">
            <select value={status} onChange={(e) => setStatus(e.target.value as Booking['status'])} className="glass-select">
              {(['pending', 'accepted', 'rejected', 'cancelled', 'completed'] as const).map((st) => (
                <option key={st} value={st}>{STATUS_BN[st] || st}</option>
              ))}
            </select>
          </Field>
          <Field label="ইভেন্ট তারিখ">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="glass-input" />
          </Field>
          <Field label="লোকেশন">
            <input value={loc} onChange={(e) => setLoc(e.target.value)} className="glass-input" />
          </Field>
          <Field label="নোট">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="glass-input resize-y" />
          </Field>
          {err && <p className="text-xs text-rose-400">{err}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={save} disabled={saving} className="btn-primary flex-1">
              {saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="btn-ghost">
              বাতিল
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}

/* ═══════════════ KYC — approve/reject ═══════════════ */
type KycSub = {
  id: string;
  photographer_id: string;
  status: 'pending' | 'approved' | 'rejected';
  nid_front_url: string;
  nid_back_url?: string;
  selfie_url: string;
  phone: string;
  note?: string;
  created_at: string;
  photographers?: { display_name?: string; slug?: string } | null;
};

export function AdminKyc({ onChanged }: { onChanged?: () => void }) {
  const [subs, setSubs] = useState<KycSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState<KycSub | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('kyc_submissions')
      .select('*, photographers(display_name, slug)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setSubs((data as KycSub[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (s: KycSub) => {
    setBusy(true);
    await supabase
      .from('kyc_submissions')
      .update({ status: 'approved', review_note: null, reviewed_at: new Date().toISOString() })
      .eq('id', s.id);
    await supabase.from('photographers').update({ verified: true, profile_status: 'approved' }).eq('id', s.photographer_id);
    setBusy(false);
    load();
    onChanged?.();
  };

  const reject = async () => {
    if (!rejecting) return;
    setBusy(true);
    await supabase
      .from('kyc_submissions')
      .update({ status: 'rejected', review_note: note.trim() || null, reviewed_at: new Date().toISOString() })
      .eq('id', rejecting.id);
    setBusy(false);
    setRejecting(null);
    load();
    onChanged?.();
  };

  return (
    <div>
      <SectionHead title="KYC ভেরিফিকেশন" sub="পেন্ডিং KYC সাবমিশন — NID ও সেলফি যাচাই করে অ্যাপ্রুভ করুন" />

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-72 rounded-xl3" />
          ))}
        </div>
      ) : subs.length === 0 ? (
        <EmptyState icon="✅" title="কোনো পেন্ডিং KYC নেই" sub="সব সাবমিশন রিভিউ করা হয়েছে।" />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {subs.map((s) => (
            <div key={s.id} className="glass-card rounded-xl3 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{s.photographers?.display_name || 'ফটোগ্রাফার'}</span>
                <StatusPill status={s.status} />
              </div>
              <p className="text-xs text-white/55">📞 {s.phone} · {bnDate(s.created_at)}</p>
              <div className="grid grid-cols-3 gap-2">
                <a href={s.nid_front_url} target="_blank" rel="noreferrer" className="block h-24 rounded-lg overflow-hidden bg-twilight-900 border border-white/10">
                  <img src={s.nid_front_url} alt="NID ফ্রন্ট" className="w-full h-full object-cover" />
                </a>
                {s.nid_back_url ? (
                  <a href={s.nid_back_url} target="_blank" rel="noreferrer" className="block h-24 rounded-lg overflow-hidden bg-twilight-900 border border-white/10">
                    <img src={s.nid_back_url} alt="NID ব্যাক" className="w-full h-full object-cover" />
                  </a>
                ) : <div />}
                <a href={s.selfie_url} target="_blank" rel="noreferrer" className="block h-24 rounded-lg overflow-hidden bg-twilight-900 border border-white/10">
                  <img src={s.selfie_url} alt="সেলফি" className="w-full h-full object-cover" />
                </a>
              </div>
              {s.note && <p className="text-xs text-white/55">নোট: {s.note}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => approve(s)} disabled={busy} className="btn-primary flex-1 !py-2 !text-xs">
                  ✓ অ্যাপ্রুভ + ভেরিফাই
                </button>
                <button
                  type="button"
                  onClick={() => { setRejecting(s); setNote(''); }}
                  className="btn-ghost !py-2 !text-xs"
                >
                  ✕ বাতিল
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminModal open={!!rejecting} onClose={() => setRejecting(null)} title="KYC বাতিল করুন">
        <div className="space-y-4">
          <Field label="নোট (কারণ)">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="glass-input resize-y" />
          </Field>
          <div className="flex gap-3">
            <button type="button" onClick={reject} disabled={busy} className="btn-danger flex-1">
              {busy ? 'হচ্ছে…' : 'বাতিল করুন'}
            </button>
            <button type="button" onClick={() => setRejecting(null)} className="btn-ghost">
              ফিরে যান
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}

/* ═══════════════ CHATS — monitor conversations ═══════════════ */
type Conv = {
  id: string;
  customer_id: string;
  photographer_id: string;
  last_message_at: string;
  customers?: { full_name?: string; avatar_url?: string } | null;
  photographers?: { display_name?: string; profile_photo_url?: string } | null;
};

type Msg = { id: string; sender_id: string; body: string; created_at: string };

export function AdminChats() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('conversations')
      .select('*, customers:customer_id(full_name, avatar_url), photographers:photographer_id(display_name, profile_photo_url)')
      .order('last_message_at', { ascending: false })
      .limit(60);
    setConvs((data as Conv[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selId) { setMsgs([]); return; }
    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, body, created_at')
        .eq('conversation_id', selId)
        .order('created_at', { ascending: true })
        .limit(200);
      setMsgs((data as Msg[]) || []);
    })();
  }, [selId]);

  return (
    <div>
      <SectionHead title="চ্যাট মনিটর" sub="ইউজার ↔ ফটোগ্রাফার কথোপকথন পর্যবেক্ষণ" />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-xl2" />
          ))}
        </div>
      ) : convs.length === 0 ? (
        <EmptyState icon="💬" title="কোনো কথোপকথন নেই" />
      ) : (
        <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start">
          <div className="space-y-2">
            {convs.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelId(c.id)}
                className={`w-full text-left glass rounded-xl2 p-3 flex items-center gap-3 transition ${selId === c.id ? '!border-sunset-gold/50 bg-sunset-soft' : 'hover:border-white/25'}`}
              >
                {c.customers?.avatar_url ? (
                  <img src={c.customers.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-sunset-gradient shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-white truncate block">
                    {c.customers?.full_name || 'ইউজার'} ↔ {c.photographers?.display_name || 'ফটোগ্রাফার'}
                  </span>
                  <span className="text-[11px] text-white/45">{bnDate(c.last_message_at)}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="glass rounded-xl3 p-4 min-h-[300px] max-h-[70vh] overflow-y-auto">
            {selId ? (
              msgs.length === 0 ? (
                <p className="text-sm text-white/50 text-center py-8">মেসেজ নেই</p>
              ) : (
                <div className="space-y-2.5">
                  {msgs.map((m) => (
                    <div key={m.id} className="glass rounded-xl2 px-3 py-2">
                      <p className="text-sm text-white/85 whitespace-pre-line">{m.body}</p>
                      <span className="text-[10px] text-white/40">{bnDate(m.created_at)}</span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-sm text-white/50 text-center py-8">বাম থেকে একটি কথোপকথন বাছুন</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
