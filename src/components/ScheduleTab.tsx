import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toBn, BN_MONTHS, bnDate } from '../lib/utils';

type Slot = {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  note: string | null;
  status: 'available' | 'booked' | 'unavailable';
};

type MiniBooking = { id: string; event_date: string; event_time: string | null; status: string; profiles?: { full_name?: string | null } | null };

const WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

const STATUS_META: Record<Slot['status'], { label: string; dot: string; chip: string }> = {
  available: { label: 'ফ্রি', dot: 'bg-emerald-400', chip: 'text-emerald-400 border-emerald-400/40' },
  booked: { label: 'বুকড', dot: 'bg-sunset-gold', chip: 'text-sunset-gold border-sunset-gold/40' },
  unavailable: { label: 'ছুটি', dot: 'bg-red-400', chip: 'text-red-400 border-red-400/40' },
};

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * ফটোগ্রাফারের সময়সূচি ক্যালেন্ডার —
 * মাস ভিউ + তারিখে ক্লিক করে টাইম-স্লট (শুরু/শেষ) + নোট + স্ট্যাটাস ম্যানেজ।
 * বুকড বুকিংগুলো অটো দেখায় (bookings prop থেকে)।
 */
export default function ScheduleTab({ photographerId, bookings }: { photographerId: string; bookings: MiniBooking[] }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  // ফর্ম
  const [fStart, setFStart] = useState('09:00');
  const [fEnd, setFEnd] = useState('18:00');
  const [fNote, setFNote] = useState('');
  const [fStatus, setFStatus] = useState<Slot['status']>('available');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('schedule_slots')
        .select('*')
        .eq('photographer_id', photographerId)
        .order('slot_date');
      if (!active) return;
      if (!error) setSlots((data as Slot[]) || []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [photographerId]);

  const slotsByDate = useMemo(() => {
    const m: Record<string, Slot[]> = {};
    slots.forEach((s) => {
      (m[s.slot_date] = m[s.slot_date] || []).push(s);
    });
    return m;
  }, [slots]);

  const bookingsByDate = useMemo(() => {
    const m: Record<string, MiniBooking[]> = {};
    bookings
      .filter((b) => b.status === 'accepted' || b.status === 'completed' || b.status === 'pending')
      .forEach((b) => {
        (m[b.event_date] = m[b.event_date] || []).push(b);
      });
    return m;
  }, [bookings]);

  // মাসের গ্রিড (৬ সারি × ৭)
  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    const last = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= last; d++) days.push(new Date(year, month, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [year, month]);

  const upcoming = useMemo(() => {
    const t = fmtDate(today);
    return slots
      .filter((s) => s.slot_date >= t)
      .sort((a, b) => (a.slot_date + a.start_time).localeCompare(b.slot_date + b.start_time))
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  const openDay = (d: Date) => {
    const key = fmtDate(d);
    setSelected(key === selected ? null : key);
    setMsg(null);
    const daySlots = slotsByDate[key] || [];
    if (daySlots.length > 0) {
      setFStart(daySlots[0].start_time);
      setFEnd(daySlots[0].end_time);
      setFNote(daySlots[0].note || '');
      setFStatus(daySlots[0].status);
    } else {
      setFStart('09:00');
      setFEnd('18:00');
      setFNote('');
      setFStatus('available');
    }
  };

  const addSlot = async () => {
    if (!selected) return;
    setSaving(true);
    setMsg(null);
    const { data, error } = await supabase
      .from('schedule_slots')
      .insert({ photographer_id: photographerId, slot_date: selected, start_time: fStart, end_time: fEnd, note: fNote.trim() || null, status: fStatus })
      .select('*')
      .single();
    setSaving(false);
    if (error) {
      setMsg('যোগ করা যায়নি — একই সময়ে স্লট আছে কিনা দেখুন।');
      console.error('Slot insert error:', error);
    } else {
      setSlots((p) => [...p, data as Slot].sort((a, b) => (a.slot_date + a.start_time).localeCompare(b.slot_date + b.start_time)));
      setFNote('');
    }
  };

  const deleteSlot = async (id: string) => {
    const { error } = await supabase.from('schedule_slots').delete().eq('id', id);
    if (!error) setSlots((p) => p.filter((s) => s.id !== id));
  };

  const selSlots = selected ? slotsByDate[selected] || [] : [];
  const selBookings = selected ? bookingsByDate[selected] || [] : [];
  const tStr = fmtDate(today);

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl3 p-5 sm:p-6">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            aria-label="আগের মাস"
            onClick={() => {
              const m = month - 1;
              if (m < 0) { setMonth(11); setYear((y) => y - 1); } else setMonth(m);
            }}
            className="chip !px-3 !py-1.5"
          >
            ‹
          </button>
          <h3 className="font-bold text-white text-base sm:text-lg">
            🗓️ {BN_MONTHS[month]} {toBn(year)} — সময়সূচি
          </h3>
          <button
            type="button"
            aria-label="পরের মাস"
            onClick={() => {
              const m = month + 1;
              if (m > 11) { setMonth(0); setYear((y) => y + 1); } else setMonth(m);
            }}
            className="chip !px-3 !py-1.5"
          >
            ›
          </button>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-[10px] sm:text-[11px] font-bold text-white/45 py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="skeleton h-56 rounded-xl2" />
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              if (!d) return <div key={`e${i}`} className="h-12 sm:h-14 rounded-lg bg-white/[0.015]" />;
              const key = fmtDate(d);
              const daySlots = slotsByDate[key] || [];
              const dayBookings = bookingsByDate[key] || [];
              const hasFree = daySlots.some((s) => s.status === 'available');
              const hasOff = daySlots.some((s) => s.status === 'unavailable');
              const hasBook = dayBookings.length > 0 || daySlots.some((s) => s.status === 'booked');
              const isToday = key === tStr;
              const isPast = key < tStr;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => !isPast && openDay(d)}
                  disabled={isPast}
                  className={`relative h-12 sm:h-14 rounded-lg border text-center transition-colors ${
                    selected === key
                      ? 'border-sunset-gold bg-sunset-gold/10'
                      : isPast
                      ? 'border-white/[0.03] opacity-40 cursor-not-allowed'
                      : 'border-white/[0.07] hover:border-sunset-gold/40'
                  }`}
                >
                  <span className={`text-[12px] sm:text-[13px] font-semibold ${isToday ? 'text-sunset-gold' : 'text-white/80'}`}>
                    {toBn(d.getDate())}
                  </span>
                  <span className="absolute bottom-1.5 left-0 right-0 flex items-center justify-center gap-1">
                    {hasFree && <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META.available.dot}`} />}
                    {hasBook && <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META.booked.dot}`} />}
                    {hasOff && <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META.unavailable.dot}`} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-[11px] text-white/55">
          <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${STATUS_META.available.dot}`} /> ফ্রি স্লট</span>
          <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${STATUS_META.booked.dot}`} /> বুকড / শুট</span>
          <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${STATUS_META.unavailable.dot}`} /> ছুটি</span>
        </div>
      </div>

      {/* Day panel */}
      {selected && (
        <div className="glass-card rounded-xl3 p-5 sm:p-6 space-y-4">
          <h4 className="font-bold text-white text-base">📅 {bnDate(selected)} — স্লট ম্যানেজ</h4>

          {/* Existing slots */}
          {selSlots.length > 0 && (
            <div className="space-y-2">
              {selSlots.map((s) => (
                <div key={s.id} className="glass rounded-xl2 p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-white tabular-nums">
                      {toBn(s.start_time)} – {toBn(s.end_time)}
                    </span>
                    <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ml-2 ${STATUS_META[s.status].chip}`}>
                      {STATUS_META[s.status].label}
                    </span>
                    {s.note && <p className="text-[12px] text-white/60 mt-0.5 truncate">📝 {s.note}</p>}
                  </div>
                  <button type="button" onClick={() => deleteSlot(s.id)} className="btn-danger !py-1 !px-2.5 !text-[11px] shrink-0" aria-label="স্লট মুছুন">
                    মুছুন
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Booked bookings that day */}
          {selBookings.length > 0 && (
            <div className="space-y-2">
              <p className="text-[12px] font-bold text-white/70">📌 এই দিনের বুকিং:</p>
              {selBookings.map((b) => (
                <div key={b.id} className="glass rounded-xl2 p-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-white/85 truncate">
                    {b.profiles?.full_name || 'গ্রাহক'} {b.event_time ? `· ${toBn(b.event_time)}` : ''}
                  </span>
                  <span className="text-[10px] font-bold border border-sunset-gold/40 text-sunset-gold rounded-full px-2 py-0.5">
                    {b.status === 'accepted' ? 'গৃহীত' : b.status === 'completed' ? 'সম্পন্ন' : 'অপেক্ষমাণ'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Add form */}
          <div className="border-t border-white/[0.07] pt-4 space-y-3">
            <p className="text-[12px] font-bold text-white/70">➕ নতুন স্লট যোগ করুন</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="field-label" htmlFor="sl-start">শুরু</label>
                <input id="sl-start" type="time" className="glass-input !py-2" value={fStart} onChange={(e) => setFStart(e.target.value)} />
              </div>
              <div>
                <label className="field-label" htmlFor="sl-end">শেষ</label>
                <input id="sl-end" type="time" className="glass-input !py-2" value={fEnd} onChange={(e) => setFEnd(e.target.value)} />
              </div>
              <div>
                <label className="field-label" htmlFor="sl-status">স্ট্যাটাস</label>
                <select id="sl-status" className="glass-select !py-2" value={fStatus} onChange={(e) => setFStatus(e.target.value as Slot['status'])}>
                  <option value="available">ফ্রি</option>
                  <option value="booked">বুকড</option>
                  <option value="unavailable">ছুটি</option>
                </select>
              </div>
              <div className="sm:col-span-4">
                <label className="field-label" htmlFor="sl-note">নোট (টাইমস্ট্যাম্প সহ প্রদর্শিত হবে)</label>
                <input id="sl-note" className="glass-input !py-2" value={fNote} onChange={(e) => setFNote(e.target.value)} placeholder="যেমন: সকালের গোল্ডেন আওয়ার শুট — লাবণী পয়েন্ট" />
              </div>
            </div>
            {msg && <p className="text-xs text-red-400">{msg}</p>}
            <button type="button" onClick={addSlot} disabled={saving} className="btn-primary !py-2 !px-5 !text-sm">
              {saving ? 'যোগ হচ্ছে…' : 'স্লট যোগ করুন'}
            </button>
          </div>
        </div>
      )}

      {/* Upcoming */}
      {!selected && upcoming.length > 0 && (
        <div className="glass-card rounded-xl3 p-5 sm:p-6">
          <h4 className="font-bold text-white text-base mb-3">⏭️ আসন্ন স্লট</h4>
          <div className="space-y-2">
            {upcoming.map((s) => (
              <div key={s.id} className="glass rounded-xl2 p-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white">{bnDate(s.slot_date)}</span>
                <span className="text-[13px] text-white/75 tabular-nums">{toBn(s.start_time)}–{toBn(s.end_time)}</span>
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${STATUS_META[s.status].chip}`}>{STATUS_META[s.status].label}</span>
                {s.note && <span className="text-[12px] text-white/55 basis-full sm:basis-auto truncate">📝 {s.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-white/40 text-center">
        যে দিনে কাজ করবেন না — স্ট্যাটাস <b className="text-red-400">ছুটি</b> দিন; গ্রাহক বুক করার আগে আপনার ফ্রি সময় দেখতে পাবে।
      </p>
    </div>
  );
}
