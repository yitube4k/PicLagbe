import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TravelData, RentRow, FoodRow, CaptionedPhoto } from '../../lib/types';
import { COX_SPOTS } from '../../lib/constants';
import { cldUrl } from '../../lib/cloudinary';
import { AIcon } from '../../admin/icons';

/**
 * V21 — ব্লগের স্ট্রাকচার্ড "ট্রাভেল ডেটা" বিল্ডার (AdminContent)।
 * Argon spec: M3 switch toggle, 19-spot picker, dynamic rows as stacked tonal
 * cards (44px targets, up/down/delete), chip lists, 2-col photo grids with
 * caption + price_range inputs beneath each tile (folder piclagbe/blog).
 */
export default function TravelDataBuilder({
  value,
  onChange,
}: {
  value: TravelData | null;
  onChange: (td: TravelData | null) => void;
}) {
  const enabled = value !== null;
  const td = value || {};
  const [tipText, setTipText] = useState('');
  const [photoSpotText, setPhotoSpotText] = useState('');
  const [uploading, setUploading] = useState<string | null>(null); // 'hotel' | 'gallery'

  const update = (patch: Partial<TravelData>) => onChange({ ...td, ...patch });

  const toggle = (on: boolean) => onChange(on ? {} : null);

  /* ── dynamic row helpers ── */
  const rentRows = td.rent_rows || [];
  const foodRows = td.food_rows || [];
  const tips = td.tips || [];
  const photoSpots = td.photo_spots || [];
  const hotels = td.hotel_photos || [];
  const gallery = td.gallery || [];

  const setRent = (rows: RentRow[]) => update({ rent_rows: rows });
  const setFood = (rows: FoodRow[]) => update({ food_rows: rows });

  const move = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const next = [...arr];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };

  const uploadPhoto = async (file: File, bucket: 'hotel' | 'gallery') => {
    setUploading(bucket);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'piclagbe_unsigned');
      const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'yrxtdqyo';
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: fd });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      if (bucket === 'hotel') update({ hotel_photos: [...hotels, { url: json.secure_url, caption: '', price_range: '' }] });
      else update({ gallery: [...gallery, { url: json.secure_url, caption: '' }] });
    } catch {
      alert('আপলোড ব্যর্থ — আবার চেষ্টা করুন');
    } finally {
      setUploading(null);
    }
  };

  const photoGrid = (
    bucket: 'hotel' | 'gallery',
    items: CaptionedPhoto[],
    setItems: (p: CaptionedPhoto[]) => void,
    withPrice: boolean,
  ) => (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((ph, i) => (
        <div key={i} className="rounded-xl border border-white/12 bg-white/[0.04] overflow-hidden">
          <div className="relative aspect-[4/3] bg-twilight-800">
            <img src={cldUrl(ph.url, { w: 360, c: 'fill' })} alt="" className="w-full h-full object-cover" loading="lazy" />
            <button
              type="button"
              onClick={() => setItems(items.filter((_, j) => j !== i))}
              aria-label="ছবি মুছুন"
              className="absolute top-1 right-1 w-11 h-11 grid place-items-center"
            >
              <span className="w-7 h-7 rounded-full bg-black/65 text-white grid place-items-center hover:bg-rose-500">
                <AIcon name="xmark" size={12} strokeWidth={2.4} />
              </span>
            </button>
          </div>
          <div className="p-2 space-y-1.5">
            <input
              value={ph.caption || ''}
              onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))}
              placeholder="ক্যাপশন লিখুন..."
              className="glass-input !text-[12.5px] !px-2.5 !py-2"
            />
            {withPrice && (
              <input
                value={ph.price_range || ''}
                onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, price_range: e.target.value } : x)))}
                placeholder="রেঞ্জ — যেমন ৳১৫০০–২৫০০"
                className="glass-input !text-[12.5px] !px-2.5 !py-2"
              />
            )}
          </div>
        </div>
      ))}
      <label className="aspect-[4/3] min-h-[120px] rounded-xl border-2 border-dashed border-white/20 grid place-items-center cursor-pointer hover:border-sunset-gold/50 transition text-center px-2">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f, bucket); e.target.value = ''; }}
        />
        <span>
          <span className="block text-xl mb-1">{uploading === bucket ? '⏳' : '🖼️'}</span>
          <span className="block text-[11.5px] font-bold text-white/60">{uploading === bucket ? 'আপলোড হচ্ছে…' : 'ছবি যোগ করুন'}</span>
        </span>
      </label>
    </div>
  );

  return (
    <div className="rounded-xl3 border border-white/12 overflow-hidden">
      {/* toggle header */}
      <button
        type="button"
        onClick={() => toggle(!enabled)}
        className="w-full flex items-center gap-3 p-3.5 text-left bg-white/[0.04] hover:bg-white/[0.07] transition"
      >
        <span className={`w-12 h-7 rounded-full relative transition shrink-0 ${enabled ? 'bg-emerald-500' : 'bg-white/15'}`}>
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-white">এই পোস্টে ট্রাভেল গাইড কার্ড যুক্ত করুন</span>
          <span className="block text-[11.5px] text-white/45 leading-tight mt-0.5">স্পট, ভাড়া, খাওয়া, সময়, হোটেল — প্রিমিয়াম কার্ড হিসেবে দেখাবে</span>
        </span>
      </button>

      {enabled && (
        <div className="p-3.5 space-y-5 border-t border-white/[0.08]">
          {/* স্পট নির্বাচন */}
          <div>
            <label className="field-label">স্পট (১৯টি ট্যুর পয়েন্ট থেকে)</label>
            <select
              value={td.spot_key || ''}
              onChange={(e) => update({ spot_key: e.target.value || null })}
              className="glass-input !text-base"
            >
              <option value="">— স্পট নেই —</option>
              {COX_SPOTS.map((s) => (
                <option key={s.key} value={s.key}>{s.nameBn} ({s.nameEn})</option>
              ))}
            </select>
          </div>

          {/* কুইক ফ্যাক্টস */}
          <div>
            <label className="field-label">কুইক ফ্যাক্টস (উপরের সারসংক্ষেপ কার্ডে দেখাবে)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
              <input value={td.quick_facts?.entry_fee || ''} onChange={(e) => update({ quick_facts: { ...td.quick_facts, entry_fee: e.target.value } })} placeholder="🎟 এন্ট্রি ফি — যেমন ফ্রি" className="glass-input !text-[14px]" />
              <input value={td.quick_facts?.distance_from_town || ''} onChange={(e) => update({ quick_facts: { ...td.quick_facts, distance_from_town: e.target.value } })} placeholder="📍 শহর থেকে দূরত্ব — যেমন ৩০ কি.মি." className="glass-input !text-[14px]" />
              <input value={td.quick_facts?.best_season || ''} onChange={(e) => update({ quick_facts: { ...td.quick_facts, best_season: e.target.value } })} placeholder="🌤 সেরা সময় — যেমন নভেম্বর–ফেব্রুয়ারি" className="glass-input !text-[14px]" />
              <input value={td.quick_facts?.safety_or_tide_note || ''} onChange={(e) => update({ quick_facts: { ...td.quick_facts, safety_or_tide_note: e.target.value } })} placeholder="⚠️ জোয়ার/সতর্কতা নোট" className="glass-input !text-[14px]" />
            </div>
          </div>

          {/* ভাড়া rows */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="field-label !mb-0">🛺 ভাড়া ও খরচ তালিকা ({rentRows.length})</label>
              <button type="button" onClick={() => setRent([...rentRows, { label: '', value: '' }])} className="h-9 px-3 rounded-full bg-sunset-soft text-sunset-gold text-xs font-bold hover:bg-sunset-gold hover:text-white transition flex items-center gap-1">
                <AIcon name="plus" size={13} strokeWidth={2.4} /> রো
              </button>
            </div>
            {rentRows.map((r, i) => (
              <div key={i} className="rounded-lg bg-white/[0.05] border border-white/10 p-2.5 mb-2">
                <div className="flex gap-2">
                  <input value={r.label} onChange={(e) => setRent(rentRows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="যেমন: অটো/টমটম রিজার্ভ (কলাতলী থেকে)" className="glass-input !text-[13.5px] flex-1 min-w-0" />
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button type="button" onClick={() => setRent(move(rentRows, i, -1))} disabled={i === 0} aria-label="উপরে" className="w-11 h-5 rounded grid place-items-center text-white/40 hover:text-sunset-gold disabled:opacity-20"><AIcon name="arrow-up" size={11} strokeWidth={2.4} /></button>
                    <button type="button" onClick={() => setRent(move(rentRows, i, 1))} disabled={i === rentRows.length - 1} aria-label="নিচে" className="w-11 h-5 rounded grid place-items-center text-white/40 hover:text-sunset-gold disabled:opacity-20"><AIcon name="arrow-up" size={11} strokeWidth={2.4} className="rotate-180" /></button>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <input value={r.value} onChange={(e) => setRent(rentRows.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} placeholder="মূল্য — যেমন ৳৬০০–৮০০" className="glass-input !text-[13.5px] min-w-0 flex-1" />
                  <input value={r.note || ''} onChange={(e) => setRent(rentRows.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} placeholder="নোট" className="glass-input !text-[13.5px] min-w-0 flex-1" />
                  <button type="button" onClick={() => setRent(rentRows.filter((_, j) => j !== i))} aria-label="মুছুন" className="w-11 h-11 rounded-lg grid place-items-center text-rose-300/70 hover:text-rose-300 hover:bg-rose-500/10 shrink-0"><AIcon name="trash" size={15} strokeWidth={2} /></button>
                </div>
              </div>
            ))}
          </div>

          {/* খাওয়া rows */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="field-label !mb-0">🍛 খাওয়া-দাওয়া তালিকা ({foodRows.length})</label>
              <button type="button" onClick={() => setFood([...foodRows, { name: '', price: '' }])} className="h-9 px-3 rounded-full bg-sunset-soft text-sunset-gold text-xs font-bold hover:bg-sunset-gold hover:text-white transition flex items-center gap-1">
                <AIcon name="plus" size={13} strokeWidth={2.4} /> রো
              </button>
            </div>
            {foodRows.map((r, i) => (
              <div key={i} className="rounded-lg bg-white/[0.05] border border-white/10 p-2.5 mb-2">
                <div className="flex gap-2">
                  <input value={r.name} onChange={(e) => setFood(foodRows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="যেমন: লইট্টা ফ্রাই (প্রতি প্লেট)" className="glass-input !text-[13.5px] flex-1 min-w-0" />
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button type="button" onClick={() => setFood(move(foodRows, i, -1))} disabled={i === 0} aria-label="উপরে" className="w-11 h-5 rounded grid place-items-center text-white/40 hover:text-sunset-gold disabled:opacity-20"><AIcon name="arrow-up" size={11} strokeWidth={2.4} /></button>
                    <button type="button" onClick={() => setFood(move(foodRows, i, 1))} disabled={i === foodRows.length - 1} aria-label="নিচে" className="w-11 h-5 rounded grid place-items-center text-white/40 hover:text-sunset-gold disabled:opacity-20"><AIcon name="arrow-up" size={11} strokeWidth={2.4} className="rotate-180" /></button>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <input value={r.price} onChange={(e) => setFood(foodRows.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} placeholder="দাম — যেমন ৳১২০–১৫০" className="glass-input !text-[13.5px] min-w-0 flex-1" />
                  <input value={r.recommended_spot || ''} onChange={(e) => setFood(foodRows.map((x, j) => (j === i ? { ...x, recommended_spot: e.target.value } : x)))} placeholder="রেস্টুরেন্ট" className="glass-input !text-[13.5px] min-w-0 flex-1" />
                  <button type="button" onClick={() => setFood(foodRows.filter((_, j) => j !== i))} aria-label="মুছুন" className="w-11 h-11 rounded-lg grid place-items-center text-rose-300/70 hover:text-rose-300 hover:bg-rose-500/10 shrink-0"><AIcon name="trash" size={15} strokeWidth={2} /></button>
                </div>
              </div>
            ))}
          </div>

          {/* ফটোগ্রাফি সময় + পয়েন্ট */}
          <div>
            <label className="field-label">📸 ফটোগ্রাফির সেরা সময়</label>
            <textarea
              value={td.time_note || ''}
              onChange={(e) => update({ time_note: e.target.value })}
              rows={2}
              placeholder="যেমন: ভোর ৫টা–৭টা সূর্যোদয়ের আলো সবচেয়ে সুন্দর; ভিড় এড়াতে সকালেই যান"
              className="glass-input resize-none !text-[14px]"
            />
            <label className="field-label mt-3">ফটো পয়েন্ট ({photoSpots.length})</label>
            <div className="relative">
              <input
                value={photoSpotText}
                onChange={(e) => setPhotoSpotText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    const t = photoSpotText.trim();
                    if (t && !photoSpots.includes(t)) update({ photo_spots: [...photoSpots, t] });
                    setPhotoSpotText('');
                  }
                }}
                placeholder="লিখে Enter চাপুন — যেমন: লাল কাঁকড়ার চর"
                className="glass-input !text-[14px]"
              />
              <button
                type="button"
                onClick={() => { const t = photoSpotText.trim(); if (t && !photoSpots.includes(t)) update({ photo_spots: [...photoSpots, t] }); setPhotoSpotText(''); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-3 rounded-lg bg-sunset-soft text-sunset-gold text-xs font-bold hover:bg-sunset-gold hover:text-white"
              >
                যোগ
              </button>
            </div>
            {photoSpots.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {photoSpots.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 h-8 pl-3 pr-1.5 rounded-full bg-white/[0.07] border border-white/12 text-[12.5px] text-white/85">
                    📍 {p}
                    <button type="button" onClick={() => update({ photo_spots: photoSpots.filter((_, j) => j !== i) })} aria-label="মুছুন" className="w-6 h-6 rounded-full grid place-items-center text-white/50 hover:text-rose-300 hover:bg-rose-500/15">
                      <AIcon name="xmark" size={11} strokeWidth={2.4} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* হোটেল ছবি */}
          <div>
            <label className="field-label">🏨 হোটেল/রিসোর্ট ছবি ({hotels.length})</label>
            <p className="text-[11.5px] text-white/40 mb-2">প্রতিটির নিচে ক্যাপশন ও ভাড়া-রেঞ্জ দিন</p>
            {photoGrid('hotel', hotels, (p) => update({ hotel_photos: p }), true)}
          </div>

          {/* গ্যালারি */}
          <div>
            <label className="field-label">🖼️ আর্টিকেল গ্যালারি ({gallery.length})</label>
            {photoGrid('gallery', gallery, (p) => update({ gallery: p }), false)}
          </div>

          {/* টিপস */}
          <div>
            <label className="field-label">💡 জরুরি টিপস ({tips.length})</label>
            <div className="relative">
              <input
                value={tipText}
                onChange={(e) => setTipText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    const t = tipText.trim();
                    if (t) update({ tips: [...tips, t] });
                    setTipText('');
                  }
                }}
                placeholder="টিপ লিখে Enter চাপুন"
                className="glass-input !text-[14px]"
              />
              <button
                type="button"
                onClick={() => { const t = tipText.trim(); if (t) update({ tips: [...tips, t] }); setTipText(''); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-3 rounded-lg bg-sunset-soft text-sunset-gold text-xs font-bold hover:bg-sunset-gold hover:text-white"
              >
                যোগ
              </button>
            </div>
            {tips.length > 0 && (
              <ul className="space-y-1.5 mt-2.5">
                {tips.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg bg-amber-400/[0.07] border border-amber-400/20 px-3 py-2 text-[13px] text-amber-100/90">
                    <span className="shrink-0 mt-0.5">💡</span>
                    <span className="flex-1 min-w-0">{t}</span>
                    <button type="button" onClick={() => update({ tips: tips.filter((_, j) => j !== i) })} aria-label="মুছুন" className="w-7 h-7 rounded-full grid place-items-center text-amber-200/60 hover:text-rose-300 shrink-0">
                      <AIcon name="xmark" size={12} strokeWidth={2.2} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
