import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cldUrl } from '../lib/cloudinary';
import { videoThumb } from './PackageEditDialog';
import { toBn } from '../lib/utils';

/* ═══════════════════════════════════════════════════════════════════
   GalleryViewer (V25) — ডেডিকেটেড ফুল-স্ক্রিন গ্যালারি ভিউয়ার
   ─ পুরো স্ক্রিন জুড়ে (portal, z-9999) — নববার/হেডার কখনো উপরে আসে না
   ─ prev/next বাটন + কাউন্টার + থাম্বনেইল স্ট্রিপ + সোয়াইপ + কীবোর্ড
   ফেসবুক থিয়েটার-স্টাইল: টাইলে ক্লিক করলেই পুরো গ্যালারি ফুল-স্ক্রিনে খোলে
   ═══════════════════════════════════════════════════════════════════ */

export type ViewerItem = {
  url: string;
  type: 'image' | 'video';
  title?: string;
  caption?: string | null;
};

export function GalleryViewer({
  items,
  startIndex,
  onClose,
}: {
  items: ViewerItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(() => Math.min(Math.max(startIndex, 0), Math.max(items.length - 1, 0)));
  const touchX = useRef<number | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const safeIndex = Math.min(index, items.length - 1);
  const current = items[safeIndex];
  const many = items.length > 1;

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => {
        const next = i + dir;
        if (next < 0 || next > items.length - 1) return i;
        return next;
      });
    },
    [items.length]
  );

  /* কীবোর্ড: ← → Esc */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  /* বডি স্ক্রল-লক */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /* খোলার সময় ফোকাস ক্লোজে (Esc কাজ করার নিশ্চয়তা + a11y) */
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  /* অ্যাকটিভ থাম্বনেইল ভিউতে আনুন */
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLElement>(`[data-thumb="${safeIndex}"]`);
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [safeIndex]);

  if (!current) return null;

  const label = current.caption || current.title || '';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/[0.97]"
      role="dialog"
      aria-modal="true"
      aria-label="ফটো গ্যালারি — ফুল স্ক্রিন"
    >
      {/* ── টপ বার: কাউন্টার + টাইটেল + ক্লোজ ── */}
      <div
        className="shrink-0 flex items-center gap-3 px-3 sm:px-5 text-white"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        {many && (
          <span className="shrink-0 rounded-full bg-white/10 ring-1 ring-white/20 px-3 py-1 text-[12.5px] font-extrabold tabular-nums">
            {toBn(safeIndex + 1)}/{toBn(items.length)}
          </span>
        )}
        <span className="flex-1 min-w-0 truncate text-sm font-bold">{label}</span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="বন্ধ করুন"
          className="shrink-0 w-11 h-11 grid place-items-center rounded-full bg-white/10 ring-1 ring-white/20 transition-colors hover:bg-white/20 active:scale-90 outline-none focus-visible:ring-2 focus-visible:ring-sunset-gold"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── মূল মিডিয়া এরিয়া (সোয়াইপ সাপোর্ট) ── */}
      <div
        className="flex-1 min-h-0 relative grid place-items-center p-3 sm:p-6"
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
        }}
      >
        {current.type === 'video' ? (
          <video
            key={current.url}
            src={current.url}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img
            key={current.url}
            src={cldUrl(current.url, { w: 1600, c: 'limit' })}
            alt={label || `ছবি ${toBn(safeIndex + 1)}`}
            draggable={false}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl select-none"
          />
        )}

        {/* prev / next — বড় গ্লাস বৃত্ত, সবসময় দৃশ্যমান */}
        {many && (
          <>
            <GalleryArrow dir="prev" enabled={safeIndex > 0} onClick={() => go(-1)} />
            <GalleryArrow dir="next" enabled={safeIndex < items.length - 1} onClick={() => go(1)} />
          </>
        )}
      </div>

      {/* ── থাম্বনেইল স্ট্রিপ ── */}
      {many && (
        <div
          ref={stripRef}
          className="shrink-0 flex gap-2 overflow-x-auto no-scrollbar px-3 pb-[max(0.75rem, env(safe-area-inset-bottom))] pt-2"
        >
          {items.map((it, i) => (
            <button
              key={`${it.url}-${i}`}
              data-thumb={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`ছবি ${toBn(i + 1)}`}
              className={`shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden ring-2 transition-all duration-150 ${
                i === safeIndex ? 'ring-sunset-gold opacity-100' : 'ring-white/15 opacity-50 hover:opacity-85'
              }`}
            >
              <img
                src={it.type === 'video' ? videoThumb(it.url) : cldUrl(it.url, { w: 200, h: 140, c: 'fill' })}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              {it.type === 'video' && (
                <span className="relative -mt-6 ml-1 grid w-4 h-4 place-items-center rounded-full bg-black/60 text-white">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

/* ── পাশের তীর বাটন (ডেস্কটপে পাশে, মোবাইলে নিচ-কোণায় ছোট) ── */
function GalleryArrow({ dir, enabled, onClick }: { dir: 'prev' | 'next'; enabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => enabled && onClick()}
      disabled={!enabled}
      aria-label={dir === 'prev' ? 'আগের ছবি' : 'পরের ছবি'}
      className={`absolute top-1/2 -translate-y-1/2 ${
        dir === 'prev' ? 'left-2 sm:left-5' : 'right-2 sm:right-5'
      } z-10 w-11 h-11 sm:w-12 sm:h-12 grid place-items-center rounded-full bg-white/10 ring-1 ring-white/25 backdrop-blur-md text-white shadow-glass-sm transition-all duration-200 ${
        enabled ? 'hover:bg-white/22 active:scale-90' : 'opacity-30 cursor-default'
      }`}
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dir === 'prev' ? (
          <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>
        ) : (
          <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>
        )}
      </svg>
    </button>
  );
}
