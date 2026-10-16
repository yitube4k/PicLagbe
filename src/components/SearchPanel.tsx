import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { COX_SPOTS } from '../lib/constants';
import { SEARCH_CATEGORIES, buildSearchPath } from '../lib/searchConfig';

interface SearchPanelProps {
  initial?: { q?: string; spot?: string; cat?: string };
  /** প্যানেল খোলার সাথে সাথে ইনপুটে ফোকাস */
  autoFocus?: boolean;
  /** সার্চ সাবমিটের পর কল হয় (নেভবার ড্রপডাউন বন্ধ করতে) */
  onDone?: () => void;
}

/* ── আইকনগুলো (stroke = currentColor, সাইজ prop দিয়ে নিয়ন্ত্রিত) ── */

const SearchIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const SlidersIcon = ({ size = 15 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.1"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {/* ৩-লাইন স্লাইডার — ভার্টিক্যাল ট্র্যাক + হরাইজন্টাল নব */}
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

/**
 * Google-স্টাইল কমপ্যাক্ট সার্চ — নেভবার ড্রপডাউনের ভেতরে বসে (width-agnostic, w-full)।
 * একটাই গোল পিল বার: 🔍 আইকন + ইনপুট + ফিল্টার টগল + "খুঁজুন"।
 * ফিল্টার (স্পট + ক্যাটাগরি) বারের নিচে glass popover-এ খোলে।
 */
export default function SearchPanel({ initial, autoFocus: autoFocusProp, onDone }: SearchPanelProps) {
  const navigate = useNavigate();
  const [q, setQ] = useState(initial?.q || '');
  const [spot, setSpot] = useState(initial?.spot || '');
  const [cat, setCat] = useState(initial?.cat || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  // পুরো বারটাই আউটটসাইড-ক্লিক অ্যাঙ্কর — বারের ভেতরে ক্লিকে মেনু খোলা থাকে
  const barRef = useRef<HTMLFormElement | null>(null);

  const activeFilters = (spot ? 1 : 0) + (cat ? 1 : 0);

  // ফিল্টার মেনু খোলা থাকলে: বাইরের ক্লিক/টাচ বা Esc চাপলে বন্ধ
  useEffect(() => {
    if (!filtersOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(buildSearchPath({ q, spot, cat }));
    onDone?.();
  };

  const clearFilters = () => {
    setSpot('');
    setCat('');
  };

  return (
    <form
      ref={barRef}
      onSubmit={submit}
      role="search"
      aria-label="ফটোগ্রাফার সার্চ"
      className={[
        // এক টুকরো গোল পিল — sp-hero glass treatment + সোনালি গ্রেডিয়েন্ট বর্ডার লাইন
        'sp-hero relative z-20 w-full rounded-[16px] p-2',
        // কমপ্যাক্ট বারের জন্য আরেকটু সান্দর প্রিমিয়াম শ্যাডো
        'shadow-[0_18px_44px_-16px_rgba(0,0,0,0.72),inset_0_1px_0_0_rgba(255,255,255,0.14)]',
        // ফোকাসে সোনালি বর্ডার + সফট গোল্ড রিং (নতুন গ্লোবাল CSS ছাড়াই)
        'transition-[border-color,box-shadow] duration-200',
        'focus-within:border-sunset-gold/60',
        'focus-within:shadow-[0_0_0_3px_rgba(251,191,36,0.14),0_18px_44px_-16px_rgba(0,0,0,0.72),inset_0_1px_0_0_rgba(255,255,255,0.14)]',
      ].join(' ')}
    >
      {/* সোনালি-কমলা গ্রেডিয়েন্ট বর্ডার লাইন (index.css) */}
      <span aria-hidden="true" className="sp-hero-line" />

      {/* ── এক লাইনের বার ── */}
      <div className="flex items-center gap-1.5">
        {/* বাম দিকে স্ট্যাটিক ম্যাগনিফায়ার */}
        <span aria-hidden="true" className="flex w-9 shrink-0 items-center justify-center text-white/45">
          <SearchIcon size={17} />
        </span>

        {/* ইনপুট */}
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="কক্সবাজারে খুঁজুন…"
          aria-label="ফটোগ্রাফার বা সার্ভিস খুঁজুন"
          autoFocus={autoFocusProp}
          className="sp-input min-h-[46px] flex-1 min-w-0 px-1 text-sm !border-0 !bg-transparent !shadow-none focus:outline-none"
        />

        {/* ফিল্টার টগল */}
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          aria-controls="sp-filter-menu"
          aria-haspopup="true"
          aria-label="ফিল্টার অপশন"
          title="ফিল্টার"
          className={[
            'relative w-9 h-9 shrink-0 rounded-full border',
            'flex items-center justify-center',
            'transition-colors duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset-gold/50',
            filtersOpen || activeFilters > 0
              ? 'border-sunset-gold/55 bg-sunset-soft text-sunset-gold'
              : 'border-white/[0.12] bg-white/[0.05] text-white/60 hover:text-white hover:border-white/25',
          ].join(' ')}
        >
          <SlidersIcon size={15} />
          {activeFilters > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sunset-coral text-white text-[9px] font-extrabold flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>

        {/* সাবমিট */}
        <button
          type="submit"
          aria-label="ফটোগ্রাফার সার্চ করুন"
          title="খুঁজুন"
          className="btn-sunset shrink-0 px-4 min-h-[38px] text-[13px] font-bold flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset-gold/50"
        >
          <SearchIcon size={15} />
          <span className="hidden sm:inline">খুঁজুন</span>
        </button>
      </div>

      {/* ── ফিল্টার অপশন মেনু — বারের ঠিক নিচে, বারের পুরো প্রস্থে ── */}
      {filtersOpen && (
        <div
          id="sp-filter-menu"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-full glass-strong !rounded-[16px] shadow-glass-lg p-3.5"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45 px-1 pb-2.5">
            ফিল্টার অপশন
          </p>

          <label htmlFor="sp-filter-spot" className="field-label !text-[11px]">
            📍 স্পট
          </label>
          <select
            id="sp-filter-spot"
            value={spot}
            onChange={(e) => setSpot(e.target.value)}
            aria-label="শুটিং স্পট নির্বাচন করুন"
            className="sp-select w-full !min-h-[42px] !text-[13px] mb-3"
          >
            <option value="">সব স্পট</option>
            {COX_SPOTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.nameBn}
              </option>
            ))}
          </select>

          <label htmlFor="sp-filter-cat" className="field-label !text-[11px]">
            📷 ক্যাটাগরি
          </label>
          <select
            id="sp-filter-cat"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            aria-label="ক্যাটাগরি নির্বাচন করুন"
            className="sp-select w-full !min-h-[42px] !text-[13px]"
          >
            <option value="">সব ক্যাটাগরি</option>
            {SEARCH_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>

          {/* ফুটার: ক্লিয়ার + সাবমিট */}
          <div className="flex items-center gap-2 pt-3.5 mt-1 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={clearFilters}
              aria-label="সব ফিল্টার মুছে ফেলুন"
              className="text-xs font-semibold text-white/55 hover:text-white flex-1 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset-gold/50 rounded"
            >
              {activeFilters > 0 ? '↺ ফিল্টার মুছুন' : 'ফিল্টার নেই'}
            </button>
            <button
              type="submit"
              className="btn-sunset !py-2 !px-5 !text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset-gold/50"
            >
              খুঁজুন
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
