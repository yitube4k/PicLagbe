import React, { useState } from 'react';
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

/**
 * প্রিমিয়াম সার্চ ফর্ম — query + স্পট + ক্যাটাগরি, এক লাইনে (hero) বা স্ট্যাকড (dropdown)।
 * সব সার্চ /photographers পেজে যায় (slug-based ফিল্টার)।
 */
export default function SearchPanel({ variant = 'hero', initial, autoFocus: autoFocusProp, onDone }: SearchPanelProps) {
  const navigate = useNavigate();
  const [q, setQ] = useState(initial?.q || '');
  const [spot, setSpot] = useState(initial?.spot || '');
  const [cat, setCat] = useState(initial?.cat || '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(buildSearchPath({ q, spot, cat }));
    onDone?.();
  };

  const isHero = variant === 'hero';

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="ফটোগ্রাফার সার্চ"
      className={
        isHero
          ? 'sp-hero relative rounded-[20px] p-2.5 flex flex-col lg:flex-row gap-2.5 max-w-3xl mx-auto shadow-[0_24px_70px_-18px_rgba(0,0,0,0.75)]'
          : 'sp-hero relative rounded-[16px] p-2 flex flex-col gap-2'
      }
    >
      {/* চকচকে বর্ডার লাইন */}
      <span aria-hidden="true" className="sp-hero-line" />

      {/* Query input */}
      <div className="relative flex-1 min-w-0">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" aria-hidden="true">
          <SearchIcon size={isHero ? 18 : 16} />
        </span>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ফটোগ্রাফার বা সার্ভিস লিখুন…"
          aria-label="ফটোগ্রাফার বা সার্ভিস খুঁজুন"
          autoFocus={autoFocusProp}
          className={`sp-input w-full ${isHero ? 'min-h-[52px] pl-11 pr-4 text-[15px]' : 'min-h-[46px] pl-10 pr-3 text-sm'}`}
        />
      </div>

      {/* Selects */}
      <div className={isHero ? 'flex flex-col lg:flex-row gap-2.5 lg:w-[400px]' : 'flex gap-2'}>
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] pointer-events-none" aria-hidden="true">📍</span>
          <select
            value={spot}
            onChange={(e) => setSpot(e.target.value)}
            aria-label="শুটিং স্পট নির্বাচন করুন"
            className={`sp-select w-full ${isHero ? 'min-h-[52px] pl-9 pr-7 text-[14px]' : 'min-h-[46px] pl-8 pr-6 text-[13px]'}`}
          >
            <option value="">সব স্পট</option>
            {COX_SPOTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.nameBn}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] pointer-events-none" aria-hidden="true">📷</span>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            aria-label="ক্যাটাগরি নির্বাচন করুন"
            className={`sp-select w-full ${isHero ? 'min-h-[52px] pl-9 pr-7 text-[14px]' : 'min-h-[46px] pl-8 pr-6 text-[13px]'}`}
          >
            <option value="">সব ক্যাটাগরি</option>
            {SEARCH_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        aria-label="ফটোগ্রাফার সার্চ করুন"
        className={`btn-sunset shrink-0 ${isHero ? 'px-8 min-h-[52px] w-full lg:w-auto text-[15px]' : 'min-h-[46px] w-full justify-center text-sm'}`}
      >
        <SearchIcon size={17} />
        খুঁজুন
      </button>
    </form>
  );
}
