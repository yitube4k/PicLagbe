import React, { useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Booking } from '../../lib/types';
import { bnDate, bnDateTime, toBn, STATUS_BN } from '../../lib/utils';
import {
  AdminSheet, FullDialog, ConfirmDialog, FilterBar, OverflowMenu, MediaViewer,
  Field, StatusPill, EmptyState, ListSkeleton, KV, ProgressiveRows, waMe, telHref,
  useAdminList, useSnack, useOptimistic,
} from './kit';
import { logAction } from '../../lib/audit';
import { AIcon } from '../../admin/icons';

/* ═══════════════ BOOKINGS — card tap = view sheet, quick status, edit, delete ═══════════════ */

type AdminBooking = Booking & {
  photographers?: { display_name?: string | null } | null;
  profiles?: { full_name?: string | null } | null;
};

const BOOKING_STATUS_CHIPS = ['', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'];

export function AdminBookings() {
  const [filter, setFilter] = useState('');

  const fetcher = useCallback(async () => {
    let query = supabase
      .from('bookings')
      .select('*, photographers(display_name), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(150);
    if (filter) query = query.eq('status', filter);
    const { data } = await query;
    return (data as AdminBooking[]) || [];
  }, [filter]);

  const list = useAdminList<AdminBooking>(fetcher, [filter]);
  const { show } = useSnack();
  const opt = useOptimistic();

  const [viewing, setViewing] = useState<AdminBooking | null>(null);
  const [editing, setEditing] = useState<AdminBooking | null>(null);
  const [deleting, setDeleting] = useState<AdminBooking | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [status, setStatus] = useState<Booking['status']>('pending');
  const [date, setDate] = useState('');
  const [loc, setLoc] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  const openEdit = (b: AdminBooking) => {
    setEditing(b);
    setStatus(b.status);
    setDate(b.event_date?.slice(0, 10) || '');
    setLoc(b.event_location || '');
    setNotes(b.notes || '');
    dirtyRef.current = false;
    setErr(null);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from('bookings').update({
      status,
      event_date: date,
      event_location: loc.trim() || null,
      notes: notes.trim() || null,
    }).eq('id', editing.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    logAction(status !== editing.status ? 'status_change' : 'update', 'booking', editing.id,
      `${editing.profiles?.full_name || 'গ্রাহক'} → ${editing.photographers?.display_name || 'ফটোগ্রাফার'}`, {
      note: status !== editing.status ? `বুকিং স্ট্যাটাস: ${editing.status} → ${status}` : 'বুকিং ডিটেইলস এডিট',
      before: { status: editing.status }, after: { status, event_date: date },
    });
    list.patch(editing.id, {
      status, event_date: date, event_location: loc.trim() || null, notes: notes.trim() || null,
    } as Partial<AdminBooking>);
    setEditing(null);
    show('বুকিং আপডেট হয়েছে');
    list.silentReload();
  };

  /** optimistic quick status from view sheet / menu */
  const quickStatus = async (b: AdminBooking, st: Booking['status']) => {
    if (st === b.status) return;
    const old = b.status;
    setBusyId(b.id);
    const ok = await opt.run({
      patchFn: () => list.patch(b.id, { status: st } as Partial<AdminBooking>),
      mutate: () => supabase.from('bookings').update({ status: st }).eq('id', b.id),
      okMsg: `বুকিং → ${STATUS_BN[st] || st}`,
      reload: () => list.silentReload(),
    });
    setBusyId(null);
    if (ok) {
      logAction('status_change', 'booking', b.id, `${b.profiles?.full_name || 'গ্রাহক'} → ${b.photographers?.display_name || 'ফটোগ্রাফার'}`, {
        note: `বুকিং স্ট্যাটাস: ${old} → ${st}`,
        before: { status: old }, after: { status: st },
      });
      setViewing((v) => (v && v.id === b.id ? { ...v, status: st } : v));
    }
  };

  const del = async () => {
    if (!deleting) return;
    setBusyDelete(true);
    const { error } = await supabase.from('bookings').delete().eq('id', deleting.id);
    setBusyDelete(false);
    if (error) { show('ডিলিট ব্যর্থ: ' + error.message, { tone: 'error' }); return; }
    logAction('delete', 'booking', deleting.id, `${deleting.profiles?.full_name || 'গ্রাহক'} → ${deleting.photographers?.display_name || 'ফটোগ্রাফার'}`, { note: 'বুকিং ডিলিট' });
    list.remove(deleting.id);
    show('বুকিং মুছে ফেলা হয়েছে');
    setDeleting(null);
    setViewing((v) => (v && deleting && v.id === deleting.id ? null : v));
  };

  return (
    <div>
      <FilterBar
        chips={BOOKING_STATUS_CHIPS.map((st) => ({ key: st, label: st === '' ? 'সব' : STATUS_BN[st] || st }))}
        activeChip={filter}
        onChip={setFilter}
      />

      {list.error && <p className="text-sm text-rose-300 mb-3">{list.error}</p>}

      {list.loading ? (
        <ListSkeleton />
      ) : list.items.length === 0 ? (
        <EmptyState icon="📅" title="কোনো বুকিং নেই" sub="এই ফিল্টারে কোনো বুকিং পাওয়া যায়নি।" />
      ) : (
        <ProgressiveRows
          items={list.items}
          resetKey={filter}
          renderRow={(b) => (
            <div key={b.id} className={`glass rounded-xl2 p-3.5 flex items-center gap-2.5 ${list.shakeId === b.id ? 'admin-shake' : ''}`}>
              <button type="button" onClick={() => setViewing(b)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                <span className="w-11 h-11 rounded-xl2 bg-sunset-soft border border-sunset-gold/25 grid place-items-center text-sunset-gold shrink-0">
                  <AIcon name="bookings" size={19} strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="font-bold text-white text-[14.5px] truncate">
                      {b.profiles?.full_name || 'গ্রাহক'} → {b.photographers?.display_name || 'ফটোগ্রাফার'}
                    </span>
                    <StatusPill status={b.status} busy={busyId === b.id} />
                  </div>
                  <span className="text-[12.5px] text-white/50 truncate block mt-0.5">
                    {bnDate(b.event_date)}{b.event_time ? ` · ${b.event_time}` : ''} · {b.packages ? b.packages.name : 'কাস্টম'}
                  </span>
                </div>
              </button>
              <OverflowMenu
                items={[
                  { icon: 'eye', label: 'বিস্তারিত দেখুন', onClick: () => setViewing(b) },
                  { icon: 'check', label: 'গ্রহণ করুন', hide: b.status === 'accepted', onClick: () => quickStatus(b, 'accepted') },
                  { icon: 'posts', label: 'সম্পন্ন করুন', hide: b.status === 'completed', onClick: () => quickStatus(b, 'completed') },
                  { icon: 'xmark', label: 'বাতিল করুন', hide: b.status === 'cancelled', onClick: () => quickStatus(b, 'cancelled') },
                  { icon: 'edit', label: 'এডিট করুন', divider: true, onClick: () => openEdit(b) },
                  { icon: 'trash', label: 'ডিলিট করুন', danger: true, divider: true, onClick: () => setDeleting(b) },
                ]}
              />
            </div>
          )}
        />
      )}

      {/* VIEW SHEET — contacts + quick status + edit */}
      <AdminSheet
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="বুকিং বিস্তারিত"
        sub={viewing ? `${viewing.profiles?.full_name || 'গ্রাহক'} → ${viewing.photographers?.display_name || 'ফটোগ্রাফার'}` : ''}
        footer={
          viewing && (
            <>
              <button type="button" onClick={() => openEdit(viewing)} className="btn-primary flex-1 justify-center">
                <AIcon name="edit" size={16} strokeWidth={2} className="mr-1.5" /> এডিট করুন
              </button>
              <OverflowMenu
                items={[
                  { icon: 'check', label: 'গ্রহণ করুন', hide: viewing.status === 'accepted', onClick: () => quickStatus(viewing, 'accepted') },
                  { icon: 'posts', label: 'সম্পন্ন করুন', hide: viewing.status === 'completed', onClick: () => quickStatus(viewing, 'completed') },
                  { icon: 'xmark', label: 'বাতিল করুন', hide: viewing.status === 'cancelled', onClick: () => quickStatus(viewing, 'cancelled') },
                  { icon: 'xmark', label: 'রিজেক্ট করুন', danger: true, hide: viewing.status === 'rejected', onClick: () => quickStatus(viewing, 'rejected') },
                  { icon: 'trash', label: 'ডিলিট করুন', danger: true, divider: true, onClick: () => setDeleting(viewing) },
                ]}
              />
            </>
          )
        }
      >
        {viewing && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <StatusPill status={viewing.status} busy={busyId === viewing.id} />
              {/* quick status chips */}
              {(['accepted', 'completed', 'rejected', 'cancelled'] as const).filter((s) => s !== viewing.status).map((s) => (
                <button key={s} type="button" onClick={() => quickStatus(viewing, s)} disabled={busyId === viewing.id}
                  className={`h-8 px-3 rounded-full text-[12px] font-bold border transition-colors active:scale-95 disabled:opacity-50 ${
                    s === 'accepted' || s === 'completed'
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                      : 'border-white/12 bg-white/[0.04] text-white/60'
                  }`}>
                  {STATUS_BN[s] || s}
                </button>
              ))}
            </div>
            <KV k="তারিখ" v={`${bnDate(viewing.event_date)}${viewing.event_time ? ` · ${viewing.event_time}` : ''}`} />
            <KV k="প্যাকেজ" v={viewing.packages ? viewing.packages.name : 'কাস্টম'} />
            <KV k="লোকেশন" v={viewing.event_location} />
            <KV k="বুকিং আইডি" v={<span className="break-all">{viewing.id}</span>} mono />
            {viewing.notes && (
              <div className="mt-3">
                <p className="field-label">নোট</p>
                <p className="text-[13.5px] text-white/80 leading-relaxed mt-1 whitespace-pre-line">{viewing.notes}</p>
              </div>
            )}
          </div>
        )}
      </AdminSheet>

      {/* EDIT FULL DIALOG */}
      <FullDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title="বুকিং এডিট"
        sub={editing ? `${editing.profiles?.full_name || 'গ্রাহক'} → ${editing.photographers?.display_name || 'ফটোগ্রাফার'}` : ''}
        onSave={save}
        saving={saving}
        dirty={dirtyRef.current}
        err={err}
      >
        <div className="space-y-4">
          <Field label="স্ট্যাটাস">
            <select value={status} onChange={(e) => { setStatus(e.target.value as Booking['status']); dirtyRef.current = true; }} className="glass-select !text-base">
              {(['pending', 'accepted', 'rejected', 'cancelled', 'completed'] as const).map((st) => (
                <option key={st} value={st}>{STATUS_BN[st] || st}</option>
              ))}
            </select>
          </Field>
          <Field label="ইভেন্ট তারিখ">
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); dirtyRef.current = true; }} className="glass-input !text-base" />
          </Field>
          <Field label="লোকেশন">
            <input value={loc} onChange={(e) => { setLoc(e.target.value); dirtyRef.current = true; }} className="glass-input !text-base" />
          </Field>
          <Field label="নোট">
            <textarea value={notes} onChange={(e) => { setNotes(e.target.value); dirtyRef.current = true; }} rows={3} className="glass-input resize-y !text-base" />
          </Field>
        </div>
      </FullDialog>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={del}
        busy={busyDelete}
        title="বুকিংটি মুছে ফেলবেন?"
        body="বুকিং রেকর্ড স্থায়ীভাবে মুছে যাবে — ফিরিয়ে আনা যাবে না।"
      />
    </div>
  );
}

/* ═══════════════ KYC — approve/reject with full-screen doc viewer ═══════════════ */

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
  const fetcher = useCallback(async () => {
    const { data } = await supabase
      .from('kyc_submissions')
      .select('*, photographers(display_name, slug)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    return (data as KycSub[]) || [];
  }, []);

  const list = useAdminList<KycSub>(fetcher, []);
  const { show } = useSnack();
  const [viewing, setViewing] = useState<KycSub | null>(null);
  const [rejecting, setRejecting] = useState<KycSub | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState<{ src: string; title: string } | null>(null);

  const approve = async (s: KycSub) => {
    setBusy(true);
    const [r1] = await Promise.all([
      supabase.from('kyc_submissions').update({ status: 'approved', review_note: null, reviewed_at: new Date().toISOString() }).eq('id', s.id),
      supabase.from('photographers').update({ verified: true, profile_status: 'approved' }).eq('id', s.photographer_id),
    ]);
    setBusy(false);
    if (r1.error) { show('অনুমোদন ব্যর্থ: ' + r1.error.message, { tone: 'error' }); return; }
    logAction('approve', 'kyc', s.id, s.photographers?.display_name || 'ফটোগ্রাফার', {
      note: `KYC অনুমোদন + ভেরিফাই (${s.photographers?.display_name || 'ফটোগ্রাফার'})`,
    });
    list.remove(s.id);
    setViewing((v) => (v && v.id === s.id ? null : v));
    show(`${s.photographers?.display_name || 'ফটোগ্রাফার'} ভেরিফায়েড হয়েছে ✓`);
    onChanged?.();
  };

  const reject = async () => {
    if (!rejecting) return;
    setBusy(true);
    const { error } = await supabase
      .from('kyc_submissions')
      .update({ status: 'rejected', review_note: note.trim() || null, reviewed_at: new Date().toISOString() })
      .eq('id', rejecting.id);
    setBusy(false);
    if (error) { show('বাতিল ব্যর্থ: ' + error.message, { tone: 'error' }); return; }
    logAction('reject', 'kyc', rejecting.id, rejecting.photographers?.display_name || 'ফটোগ্রাফার', {
      note: `KYC বাতিল${note.trim() ? ` — কারণ: ${note.trim()}` : ''}`,
    });
    list.remove(rejecting.id);
    show('KYC বাতিল করা হয়েছে');
    setRejecting(null);
    setViewing((v) => (v && rejecting && v.id === rejecting.id ? null : v));
    onChanged?.();
  };

  const docs = (s: KycSub) => [
    { src: s.nid_front_url, title: 'NID ফ্রন্ট' },
    ...(s.nid_back_url ? [{ src: s.nid_back_url, title: 'NID ব্যাক' }] : []),
    { src: s.selfie_url, title: 'সেলফি' },
  ];

  return (
    <div>
      {list.error && <p className="text-sm text-rose-300 mb-3">{list.error}</p>}

      {list.loading ? (
        <ListSkeleton rows={2} h="h-64" />
      ) : list.items.length === 0 ? (
        <EmptyState icon="✅" title="কোনো পেন্ডিং KYC নেই" sub="সব সাবমিশন রিভিউ করা হয়েছে।" />
      ) : (
        <div className="space-y-2.5">
          {list.items.map((s) => (
            <div key={s.id} className="glass rounded-xl2 p-4">
              {/* header row — tap → view sheet */}
              <button type="button" onClick={() => setViewing(s)} className="w-full flex items-center gap-3 text-left">
                <span className="w-11 h-11 rounded-full bg-sunset-soft border border-sunset-gold/25 grid place-items-center text-sunset-gold shrink-0">
                  <AIcon name="shield" size={19} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-white text-[14.5px] truncate block">{s.photographers?.display_name || 'ফটোগ্রাফার'}</span>
                  <span className="text-[12.5px] text-white/50 truncate block mt-0.5">📞 {s.phone} · {bnDate(s.created_at)}</span>
                </div>
                <span className="w-11 h-11 rounded-full grid place-items-center text-white/35 shrink-0">
                  <AIcon name="chevron" size={18} className="rotate-90" />
                </span>
              </button>
              {/* doc thumbnails — tap → full viewer */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                {docs(s).map((d) => (
                  <button key={d.title} type="button" onClick={() => setDoc(d)}
                    className="relative h-24 rounded-xl overflow-hidden bg-twilight-900 border border-white/10 active:scale-[0.97] transition-transform">
                    <img src={d.src} alt={d.title} className="w-full h-full object-cover" loading="lazy" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[10.5px] font-bold py-0.5 text-center">{d.title}</span>
                  </button>
                ))}
              </div>
              {/* footer actions — approve visible, reject in menu/sheet */}
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => approve(s)} disabled={busy}
                  className="btn-primary flex-1 justify-center !py-2.5 !text-[13.5px] disabled:opacity-50">
                  <AIcon name="check" size={16} strokeWidth={2.4} className="mr-1.5" /> অ্যাপ্রুভ + ভেরিফাই
                </button>
                <button type="button" onClick={() => { setRejecting(s); setNote(''); }}
                  className="btn-ghost !py-2.5 !px-4 !text-[13.5px]">
                  ✕ বাতিল
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW SHEET — all docs + info */}
      <AdminSheet
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.photographers?.display_name || 'KYC সাবমিশন'}
        sub={viewing ? `📞 ${viewing.phone} · ${bnDate(viewing.created_at)}` : ''}
        footer={
          viewing && (
            <>
              <button type="button" onClick={() => approve(viewing)} disabled={busy} className="btn-primary flex-1 justify-center disabled:opacity-50">
                <AIcon name="check" size={16} strokeWidth={2.4} className="mr-1.5" /> অ্যাপ্রুভ + ভেরিফাই
              </button>
              <button type="button" onClick={() => { setRejecting(viewing); setNote(''); }} className="btn-ghost !px-4">
                ✕ বাতিল
              </button>
            </>
          )
        }
      >
        {viewing && (
          <div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {docs(viewing).map((d) => (
                <button key={d.title} type="button" onClick={() => setDoc(d)}
                  className="relative h-32 rounded-xl overflow-hidden bg-twilight-900 border border-white/10 active:scale-[0.97] transition-transform">
                  <img src={d.src} alt={d.title} className="w-full h-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[10.5px] font-bold py-0.5 text-center">{d.title}</span>
                </button>
              ))}
            </div>
            <KV k="ফোন" v={viewing.phone} />
            <KV k="সাবমিট" v={bnDateTime(viewing.created_at)} />
            {viewing.note && (
              <div className="mt-3">
                <p className="field-label">নোট</p>
                <p className="text-[13.5px] text-white/80 leading-relaxed mt-1 whitespace-pre-line">{viewing.note}</p>
              </div>
            )}
          </div>
        )}
      </AdminSheet>

      {/* REJECT FULL DIALOG */}
      <FullDialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="KYC বাতিল করুন"
        sub={rejecting?.photographers?.display_name}
        onSave={reject}
        saving={busy}
        saveLabel="বাতিল করুন"
        dirty
      >
        <div className="space-y-4">
          <p className="text-[13.5px] text-white/60 leading-relaxed">
            <b className="text-white">{rejecting?.photographers?.display_name}</b> — বাতিল করার কারণ ফটোগ্রাফার দেখতে পাবেন। ডকুমেন্ট যাচাই করে নোট দিন।
          </p>
          <Field label="নোট (কারণ)">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} className="glass-input resize-y !text-base" placeholder="যেমন: NID ছবি অস্পষ্ট, সেলফি মিলছে না…" />
          </Field>
        </div>
      </FullDialog>

      {/* DOC VIEWER */}
      <MediaViewer src={doc?.src || null} title={doc?.title} onClose={() => setDoc(null)} />
    </div>
  );
}

/* ═══════════════ CHATS — conversation list → tap opens message sheet ═══════════════ */

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
  const fetcher = useCallback(async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*, customers:customer_id(full_name, avatar_url), photographers:photographer_id(display_name, profile_photo_url)')
      .order('last_message_at', { ascending: false })
      .limit(60);
    return (data as Conv[]) || [];
  }, []);

  const list = useAdminList<Conv>(fetcher, []);
  const [selId, setSelId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);

  const sel = list.items.find((c) => c.id === selId) || null;

  React.useEffect(() => {
    if (!selId) { setMsgs([]); return; }
    let alive = true;
    setMsgsLoading(true);
    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, body, created_at')
        .eq('conversation_id', selId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (alive) { setMsgs((data as Msg[]) || []); setMsgsLoading(false); }
    })();
    return () => { alive = false; };
  }, [selId]);

  return (
    <div>
      {list.loading ? (
        <ListSkeleton />
      ) : list.items.length === 0 ? (
        <EmptyState icon="💬" title="কোনো কথোপকথন নেই" />
      ) : (
        <div className="space-y-2.5">
          {list.items.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelId(c.id)}
              className={`w-full text-left glass rounded-xl2 p-3.5 flex items-center gap-3 transition-colors active:scale-[0.99] ${selId === c.id ? '!border-sunset-gold/50 bg-sunset-soft' : ''}`}
            >
              {c.customers?.avatar_url ? (
                <img src={c.customers.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-sunset-gold/25 shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-sunset-gradient grid place-items-center text-sm font-extrabold text-[#1A0E06] shrink-0">
                  {(c.customers?.full_name || 'ই').slice(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[14.5px] font-bold text-white truncate block">
                  {c.customers?.full_name || 'ইউজার'} ↔ {c.photographers?.display_name || 'ফটোগ্রাফার'}
                </span>
                <span className="text-[12.5px] text-white/45">{bnDateTime(c.last_message_at)}</span>
              </div>
              <span className="w-9 h-9 rounded-full grid place-items-center text-white/35 shrink-0">
                <AIcon name="chevron" size={17} className="rotate-90" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* MESSAGES SHEET */}
      <AdminSheet
        open={!!sel}
        onClose={() => setSelId(null)}
        title={sel ? `${sel.customers?.full_name || 'ইউজার'} ↔ ${sel.photographers?.display_name || 'ফটোগ্রাফার'}` : ''}
        sub={sel ? bnDateTime(sel.last_message_at) : ''}
        wide
      >
        {msgsLoading ? (
          <ListSkeleton rows={3} h="h-14" />
        ) : msgs.length === 0 ? (
          <p className="text-sm text-white/50 text-center py-8">মেসেজ নেই</p>
        ) : (
          <div className="space-y-2.5">
            {msgs.map((m) => (
              <div key={m.id} className="glass rounded-xl2 px-3.5 py-2.5">
                <p className="text-[13.5px] text-white/85 whitespace-pre-line leading-relaxed">{m.body}</p>
                <span className="text-[11.5px] text-white/40 mt-1 block">{bnDateTime(m.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </AdminSheet>
    </div>
  );
}
