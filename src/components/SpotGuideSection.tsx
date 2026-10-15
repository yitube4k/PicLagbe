import React, { useState } from 'react';
import { SPOT_BY_KEY } from '../lib/constants';
import { SPOT_GALLERY } from '../lib/spotPhotos';
import { SPOT_GUIDES } from '../lib/spotGuides';
import { cldUrl } from '../lib/cloudinary';

/**
 * স্পটের সম্পূর্ণ গাইড সেকশন — গ্যালারি + ভাড়া + টিকিট + খাওয়া +
 * ঢাকা থেকে যাওয়ার রুট + ফটোগ্রাফি পয়েন্ট + সেরা সময়।
 * SpotPage-এ ব্যবহৃত।
 */
export default function SpotGuideSection({ spotKey }: { spotKey: string }) {
  const guide = SPOT_GUIDES[spotKey];
  const spot = SPOT_BY_KEY(spotKey);
  const gallery = SPOT_GALLERY[spotKey] || [];
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!guide || !spot) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 lg:px-6 mt-12">
      <h2 className="section-head">🧭 {spot.nameBn} — সম্পূর্ণ গাইড</h2>
      <p className="section-sub mt-1.5">ভাড়া, টিকিট, খাওয়া, ঢাকা থেকে রুট আর ফটোগ্রাফি পয়েন্ট — সব একসাথে</p>

      {/* Intro + Highlights */}
      <div className="glass-card rounded-xl3 p-5 sm:p-6 mt-6">
        <p className="text-white/80 leading-[1.9] text-[15px] sm:text-base">{guide.intro}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {guide.highlights.map((h, i) => (
            <span key={i} className="chip !text-[11px]">✦ {h}</span>
          ))}
          <span className="chip !text-[11px] !border-sunset-gold/40 !text-sunset-gold">⏰ সেরা সময়: {guide.bestTime}</span>
        </div>
      </div>

      {/* গ্যালারি */}
      {gallery.length > 0 && (
        <div className={`grid gap-3 mt-5 ${gallery.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
          {gallery.slice(0, 2).map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(cldUrl(img, { w: 1400 }))}
              className="relative rounded-[16px] overflow-hidden border border-white/10 bg-twilight-800 group focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset-gold/70"
              aria-label={`${spot.nameBn} ছবি ${i + 1} বড় করে দেখুন`}
            >
              <img
                src={cldUrl(img, { w: 800, c: 'fill' })}
                srcSet={[480, 800, 1200].map((w) => `${cldUrl(img, { w, c: 'fill' })} ${w}w`).join(', ')}
                sizes="(min-width: 640px) 50vw, 100vw"
                alt={`${spot.nameBn} — আসল ছবি ${i + 1}`}
                loading="lazy"
                className="w-full aspect-[16/10] object-cover"
              />
              <span className="absolute bottom-2 right-2 glass-strong rounded-full px-2.5 py-1 text-[10px] text-white/85">
                🔍 জুম
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ভাড়া + টিকিট + খাওয়া + ফটো পয়েন্ট — ২×২ কার্ড */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <InfoCard icon="🛺" title="ভাড়া (আনুমানিক)">
          {guide.vara.map((v, i) => (
            <Row key={i} label={v.label} value={v.price} />
          ))}
        </InfoCard>

        <InfoCard icon="🎟️" title="টিকিট ও ফি">
          {guide.ticket.map((t, i) => (
            <Row key={i} label={t.label} value={t.price} highlight={/ফ্রি/.test(t.price)} />
          ))}
        </InfoCard>

        <InfoCard icon="🍽️" title="খাওয়া — কী খাবেন">
          <ul className="space-y-1.5">
            {guide.food.map((f, i) => (
              <li key={i} className="text-[13px] text-white/70 leading-relaxed flex gap-1.5">
                <span aria-hidden="true" className="text-sunset-gold/80 shrink-0">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </InfoCard>

        <InfoCard icon="📸" title="ফটোগ্রাফি পয়েন্ট">
          <ul className="space-y-1.5">
            {guide.photoPoints.map((p, i) => (
              <li key={i} className="text-[13px] text-white/70 leading-relaxed flex gap-1.5">
                <span aria-hidden="true" className="text-sunset-gold/80 shrink-0">★</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </InfoCard>
      </div>

      {/* ঢাকা থেকে যাবেন যেভাবে */}
      <div className="glass-card rounded-xl3 p-5 sm:p-6 mt-4">
        <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
          🚌 ঢাকা থেকে {spot.nameBn} — যাবেন যেভাবে
        </h3>
        <div className="mt-4 space-y-3">
          {guide.dhaka.map((r, i) => (
            <div key={i} className="glass rounded-xl2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge bg-sunset-soft text-sunset-gold border-sunset-gold/30 font-bold text-xs">
                  {r.mode}
                </span>
                <span className="text-sm font-bold text-white">৳{r.fare.startsWith('৳') || r.fare.includes('৳') ? r.fare : r.fare}</span>
                <span className="text-[11px] text-white/50">⏱ {r.time}</span>
              </div>
              <p className="text-[13px] text-white/65 mt-1.5 leading-relaxed">{r.detail}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-white/40 mt-3">
          * ভাড়া ও ফি মোটামুটি আনুমানিক (২০২৫) — সিজন, দরদাম ও সময়ভেদে কম-বেশি হয়।
        </p>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ছবি বড় করে দেখুন"
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt={`${spot.nameBn} বড় ছবি`} className="max-w-full max-h-full rounded-lg object-contain" />
          <button
            type="button"
            className="absolute top-5 right-5 glass-strong rounded-full w-10 h-10 text-white text-lg"
            aria-label="বন্ধ করুন"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}

function InfoCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl3 p-5">
      <h3 className="font-bold text-white text-[15px] flex items-center gap-2 mb-3.5">
        <span aria-hidden="true">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-white/[0.05] last:border-0">
      <span className="text-[13px] text-white/70 leading-snug">{label}</span>
      <span className={`text-[13px] font-bold whitespace-nowrap ${highlight ? 'text-emerald-400' : 'text-sunset-gold'}`}>
        {value}
      </span>
    </div>
  );
}
