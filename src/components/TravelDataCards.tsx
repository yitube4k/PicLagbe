import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TravelData } from '../lib/types';
import { cldUrl } from '../lib/cloudinary';
import { SPOT_BY_KEY } from '../lib/constants';

/**
 * V21 — ব্লগ পোস্টের স্ট্রাকচার্ড ট্রাভেল কার্ড (Argon spec):
 * TravelQuickFactsBento = cover/excerpt-এর ঠিক পরে 2×2 বেন্টো।
 * TravelDataCards = content-এর পরে: ফটোগ্রাফি কার্ড (CTA), ভাড়া তালিকা,
 * খাওয়া গ্রিড, হোটেল গ্যালারি (tap-viewer), টিপস কলআউট। travel_data null → কিছুই রেন্ডার না।
 */
export function TravelQuickFactsBento({ td }: { td: TravelData | null | undefined }) {
  const qf = td?.quick_facts;
  if (!qf) return null;
  const factTiles = [
    { icon: '🎟', label: 'এন্ট্রি ফি', v: qf.entry_fee },
    { icon: '📍', label: 'শহর থেকে দূরত্ব', v: qf.distance_from_town },
    { icon: '🌤', label: 'সেরা সময়', v: qf.best_season },
    { icon: '⚠️', label: 'জোয়ার / সতর্কতা', v: qf.safety_or_tide_note },
  ].filter((f) => f.v);
  if (factTiles.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2.5 mt-4">
      {factTiles.map((f) => (
        <div key={f.label} className="glass-strong rounded-xl2 p-3.5 border border-white/[0.12]">
          <span className="text-lg" aria-hidden="true">{f.icon}</span>
          <p className="text-[11px] font-bold text-white/45 uppercase tracking-wide mt-1">{f.label}</p>
          <p className="text-[14.5px] font-bold text-white mt-0.5 leading-snug break-words">{f.v}</p>
        </div>
      ))}
    </div>
  );
}

export default function TravelDataCards({ td }: { td: TravelData | null | undefined }) {
  const [viewer, setViewer] = useState<{ url: string; caption?: string } | null>(null);
  if (!td) return null;

  const rentRows = td.rent_rows || [];
  const foodRows = td.food_rows || [];
  const photoSpots = td.photo_spots || [];
  const hotels = td.hotel_photos || [];
  const gallery = td.gallery || [];
  const tips = td.tips || [];
  const spot = td.spot_key ? SPOT_BY_KEY(td.spot_key) : null;

  const hasAny =
    rentRows.length > 0 || foodRows.length > 0 ||
    td.time_note || photoSpots.length > 0 || hotels.length > 0 ||
    gallery.length > 0 || tips.length > 0;
  if (!hasAny) return null;

  return (
    <>
      {/* কুইক ফ্যাক্টস বেন্টো TravelQuickFactsBento-তে (কনটেন্টের আগে) রেন্ডার হয় */}

      {/* ফটোগ্রাফি সেরা সময় ও পয়েন্ট */}
      {(td.time_note || photoSpots.length > 0) && (
        <section className="glass rounded-xl3 border border-white/[0.1] p-5 mt-10">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <span aria-hidden="true">📸</span> ফটোগ্রাফির সেরা সময় ও পয়েন্ট
          </h2>
          {td.time_note && (
            <p className="text-[15.5px] text-white/75 leading-relaxed mt-2.5 break-words">{td.time_note}</p>
          )}
          {photoSpots.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3.5">
              {photoSpots.map((p, i) => (
                <span key={i} className="chip !text-[13px] !py-1.5 !px-3 text-white/85">📍 {p}</span>
              ))}
            </div>
          )}
          {spot && (
            <Link
              to="/photographers"
              className="btn-primary mt-4 !py-2.5 !px-5 !text-[13.5px] inline-flex items-center gap-2"
            >
              এই স্পটের ফটোগ্রাফার দেখুন →
            </Link>
          )}
        </section>
      )}

      {/* ভাড়া তালিকা */}
      {rentRows.length > 0 && (
        <section className="glass rounded-xl3 border border-white/[0.1] p-5 mt-5">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <span aria-hidden="true">🛺</span> যাতায়াত ও ভাড়া তালিকা
          </h2>
          <div className="mt-2">
            {rentRows.map((r, i) => (
              <div key={i} className={`flex items-start justify-between gap-3 py-3 ${i < rentRows.length - 1 ? 'border-b border-white/10' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-white/90 break-words">{r.label}</p>
                  {r.note && <p className="text-[12px] text-white/45 mt-0.5 break-words">{r.note}</p>}
                </div>
                <span className="shrink-0 font-bold text-[13.5px] text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-md break-words max-w-[45%] text-right">
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* খাওয়া-দাওয়া */}
      {foodRows.length > 0 && (
        <section className="glass rounded-xl3 border border-white/[0.1] p-5 mt-5">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <span aria-hidden="true">🍛</span> খাওয়া-দাওয়া ও সম্ভাব্য খরচ
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
            {foodRows.map((r, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 flex items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-white/90 break-words">{r.name}</p>
                  {r.recommended_spot && <p className="text-[12px] text-white/45 mt-0.5">🍽 {r.recommended_spot}</p>}
                </div>
                <span className="shrink-0 font-bold text-[13.5px] text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-md whitespace-nowrap">
                  {r.price}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* হোটেল ও রিসোর্ট */}
      {hotels.length > 0 && (
        <section className="glass rounded-xl3 border border-white/[0.1] p-5 mt-5">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <span aria-hidden="true">🏨</span> আশেপাশের হোটেল ও রিসোর্ট
          </h2>
          <div className="grid grid-cols-2 gap-2.5 mt-3.5">
            {hotels.map((h, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setViewer({ url: h.url, caption: h.caption })}
                className="relative rounded-xl overflow-hidden border border-white/12 group/tile text-left"
              >
                <img
                  src={cldUrl(h.url, { w: 480, c: 'fill' })}
                  alt={h.caption || 'হোটেল'}
                  loading="lazy"
                  className="w-full aspect-[4/3] object-cover transition-transform duration-300 group-hover/tile:scale-[1.03]"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-2.5 pt-6">
                  {h.caption && <span className="block text-[12.5px] font-bold text-white leading-tight break-words">{h.caption}</span>}
                  {h.price_range && <span className="block text-[11.5px] font-bold text-emerald-300 mt-0.5">{h.price_range}</span>}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* গ্যালারি */}
      {gallery.length > 0 && (
        <section className="glass rounded-xl3 border border-white/[0.1] p-5 mt-5">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <span aria-hidden="true">🖼️</span> আর্টিকেল গ্যালারি
          </h2>
          <div className="grid grid-cols-2 gap-2.5 mt-3.5">
            {gallery.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setViewer({ url: g.url, caption: g.caption })}
                className="relative rounded-xl overflow-hidden border border-white/12 group/tile text-left"
              >
                <img
                  src={cldUrl(g.url, { w: 480, c: 'fill' })}
                  alt={g.caption || ''}
                  loading="lazy"
                  className="w-full aspect-[4/3] object-cover transition-transform duration-300 group-hover/tile:scale-[1.03]"
                />
                {g.caption && (
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-2.5 pt-6 text-[12.5px] font-bold text-white break-words">
                    {g.caption}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* জরুরি টিপস */}
      {tips.length > 0 && (
        <section className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.08] p-5 mt-5">
          <h2 className="text-lg font-extrabold text-amber-100 flex items-center gap-2">
            <span aria-hidden="true">💡</span> জরুরি টিপস
          </h2>
          <ul className="space-y-2.5 mt-3">
            {tips.map((t, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14.5px] text-amber-50/90 leading-relaxed">
                <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-amber-300" aria-hidden="true" />
                <span className="break-words">{t}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* full-screen viewer */}
      {viewer && (
        <div className="fixed inset-0 z-[95] bg-black/92 flex flex-col" role="dialog" aria-modal="true" onClick={() => setViewer(null)}>
          <div className="shrink-0 h-14 px-3 flex items-center justify-end text-white">
            <button type="button" aria-label="বন্ধ করুন" className="w-11 h-11 rounded-full grid place-items-center hover:bg-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 min-h-0 grid place-items-center p-4" onClick={(e) => e.stopPropagation()}>
            <img src={viewer.url} alt={viewer.caption || ''} className="max-w-full max-h-full rounded-xl object-contain" />
          </div>
          {viewer.caption && (
            <p className="shrink-0 text-center text-sm text-white/75 pb-6 px-6">{viewer.caption}</p>
          )}
          <div className="shrink-0 h-[max(0.5rem,env(safe-area-inset-bottom))]" />
        </div>
      )}
    </>
  );
}
