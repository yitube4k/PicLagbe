import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { COX_SPOTS } from '../lib/constants';
import { SEARCH_CATEGORIES, buildSearchPath } from '../lib/searchConfig';

interface SearchPanelProps {
  /** hero = হোমপেজের বড় ফর্ম; dropdown = নেভবারের কমপ্যাক্ট প্যানেল */
  variant?: 'hero' | 'dropdown';
  initial?: { q?: string; spot?: string; cat?: string };
  /** প্যানেল খোলার সাথে সাথে ইনপুটে ফোকাস */
  autoFocus?: boolean;
  onDone?: () => void;
}

const SearchIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const SlidersIcon = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
 * Google-স্টাইল সার্চ — একটাই গোল বার: সার্চ আইকন + ইনপুট + ফিল্টার টগল + খুঁজুন।
 * ফিল্টার (স্পট + ক্যাটাগরি) অপশন-মেনুর ভেতরে — সবসময় দৃশ্যমান নয়।
 */
export default function SearchPanel({ variant = 'hero', initial, autoFocus: autoFocusProp, onDone }: SearchPanelProps) {
  const navigate = useNavigate();
  const [q, setQ] = useState(initial?.q || '');
  const [spot, setSpot] = useState(initial?.spot || '');
  const [cat, setCat] = useState(initial?.cat || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  const isHero = variant === 'hero';

  // ফিল্টার মেনুর বাইরে ক্লিকে বন্ধ
  useEffect(() => {
    if (!filtersOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [filtersOpen]);

  const activeFilters = (spot ? 1 : 0) + (cat ? 1 : 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(buildSearchPath({ q, spot, cat }));
    onDone?.();
  };

  const clearFilters = () => {
    setSpot('');
    setCat('');
  };

  const barH = isHero ? 'min-h-[58px]' : 'min-h-[48px]';

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="ফটোগ্রাফার সার্চ"
      className={
        isHero
          ? 'sp-hero relative z-20 rounded-[22px] p-2 max-w-2xl mx-auto shadow-[0_24px_70px_-18px_rgba(0,0,0,0.75)]'
          : 'sp-hero relative z-20 rounded-[18px] p-1.5'
      }
    >
      <span aria-hidden="true" className="sp-hero-line" />

      {/* ── এক লাইনের গুগল-স্টাইল বার ── */}
      <div className="flex items-center gap-1.5">
        {/* সার্চ আইকন */}
        <span
          aria-hidden="true"
          className={`shrink-0 flex items-center justify-center text-white/45 ${isHero ? 'w-11' : 'w-9'}`}
        >
          <SearchIcon size={isHero ? 19 : 16} />
        </span>

        {/* ইনপুট */}
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isHero ? 'ফটোগ্রাফার, সার্ভিস বা স্পট লিখুন…' : 'কক্সবাজারে খুঁজুন…'}
          aria-label="ফটোগ্রাফার বা সার্ভিস খুঁজুন"
          autoFocus={autoFocusProp}
          className={`sp-input flex-1 min-w-0 !border-0 !bg-transparent !shadow-none px-1 ${barH} ${isHero ? 'text-[15px]' : 'text-sm'}`}
        />

        {/* ফিল্টার টগল (অপশন মেনু) */}
        <div ref={filterRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-label="ফিল্টার অপশন"
            title="ফিল্টার"
            className={`flex items-center justify-center ${isHero ? 'w-11 h-11' : 'w-9 h-9'} rounded-full border transition-colors ${
              filtersOpen || activeFilters > 0
                ? 'border-sunset-gold/55 bg-sunset-soft text-sunset-gold'
                : 'border-white/[0.12] bg-white/[0.05] text-white/60 hover:text-white hover:border-white/25'
            }`}
          >
            <SlidersIcon size={isHero ? 18 : 15} />
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sunset-coral text-white text-[9px] font-extrabold flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>

          {/* ── ফিল্টার অপশন মেনু ── */}
          {filtersOpen && (
            <div
              className={`absolute z-[60] glass-strong !rounded-[16px] shadow-glass-lg p-3.5 w-72 ${
                isHero ? 'right-0 top-[52px]' : variant === 'dropdown' ? 'left-0 top-[50px]' : 'right-0 top-[50px]'
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45 px-1 pb-2.5">
                ফিল্টার অপশন
              </p>

              <label className="field-label !text-[11px]">📍 স্পট</label>
              <select
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

              <label className="field-label !text-[11px]">📷 ক্যাটাগরি</label>
              <select
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

              <div className="flex items-center gap-2 pt-3.5 mt-1 border-t border-white/[0.08]">
                <button type="button" onClick={clearFilters} className="text-xs font-semibold text-white/55 hover:text-white flex-1 text-left">
                  {activeFilters > 0 ? '↺ ফিল্টার মুছুন' : 'ফিল্টার নেই'}
                </button>
                <button type="submit" className="btn-sunset !py-2 !px-5 !text-xs">
                  খুঁজুন
                </button>
              </div>
            </div>
          )}
        </div>

        {/* সাবমিট */}
        <button
          type="submit"
          aria-label="ফটোগ্রাফার সার্চ করুন"
          title="খুঁজুন"
          className={`btn-sunset shrink-0 flex items-center justify-center gap-2 ${isHero ? 'px-6 min-h-[44px] text-[14px]' : 'px-4 min-h-[38px] text-[13px]'}`}
        >
          <SearchIcon size={16} />
          <span className={isHero ? '' : 'hidden sm:inline'}>খুঁজুন</span>
        </button>
      </div>
    </form>
  );
}
