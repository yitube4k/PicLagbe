import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Photographer } from '../lib/types';
import { toBn } from '../lib/utils';
import { COX_SPOTS } from '../lib/constants';
import Reveal from '../components/Reveal';
import PhotographerCard from '../components/PhotographerCard';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

const STATIC_CATEGORIES = [
  { slug: 'wedding', label: 'বিয়ের ফটোগ্রাফি' },
  { slug: 'pre-wedding', label: 'প্রি-ওয়েডিং' },
  { slug: 'birthday', label: 'জন্মদিন' },
  { slug: 'event', label: 'ইভেন্ট' },
  { slug: 'portrait', label: 'পোর্ট্রেট' },
  { slug: 'fashion', label: 'ফ্যাশন' },
  { slug: 'product', label: 'প্রোডাক্ট' },
  { slug: 'travel', label: 'ট্রাভেল' },
  { slug: 'corporate', label: 'কর্পোরেট' },
  { slug: 'videography', label: 'ভিডিওগ্রাফি' },
];

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter states
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [spot, setSpot] = useState(searchParams.get('spot') || '');
  const [cat, setCat] = useState(searchParams.get('cat') || '');
  const [minP, setMinP] = useState(searchParams.get('minP') || '');
  const [maxP, setMaxP] = useState(searchParams.get('maxP') || '');
  const [minR, setMinR] = useState(Number(searchParams.get('minR') || 0));
  const [sort, setSort] = useState(searchParams.get('sort') || 'rating');

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch categories from DB on mount
  useEffect(() => {
    let active = true;
    async function loadCategories() {
      const { data, error } = await supabase.from('categories').select('*');
      if (!active) return;
      if (!error && data) {
        setCategories(data as CategoryItem[]);
      }
    }
    loadCategories();
    return () => {
      active = false;
    };
  }, []);

  // Sync URL params whenever filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (spot) params.set('spot', spot);
    if (cat) params.set('cat', cat);
    if (minP) params.set('minP', minP);
    if (maxP) params.set('maxP', maxP);
    if (minR > 0) params.set('minR', String(minR));
    if (sort && sort !== 'rating') params.set('sort', sort);

    setSearchParams(params, { replace: true });
  }, [q, spot, cat, minP, maxP, minR, sort, setSearchParams]);

  // Fetch photographers with debounce and cancellation support
  useEffect(() => {
    let isCancelled = false;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('photographers')
          .select('*, photographer_categories(category_id, categories(name, slug, icon))')
          .eq('profile_status', 'approved');

        if (q.trim()) {
          query = query.or(`display_name.ilike.%${q.trim()}%,bio.ilike.%${q.trim()}%`);
        }

        if (spot) {
          query = query.eq('home_spot', spot);
        }

        if (minP) {
          const numMin = Number(minP);
          if (!isNaN(numMin)) query = query.gte('starting_price', numMin);
        }

        if (maxP) {
          const numMax = Number(maxP);
          if (!isNaN(numMax)) query = query.lte('starting_price', numMax);
        }

        if (minR > 0) {
          query = query.gte('rating_avg', minR);
        }

        // Sorting
        if (sort === 'rating') {
          query = query.order('rating_avg', { ascending: false, nullsFirst: false });
        } else if (sort === 'price_asc') {
          query = query.order('starting_price', { ascending: true, nullsFirst: false });
        } else if (sort === 'price_desc') {
          query = query.order('starting_price', { ascending: false, nullsFirst: false });
        } else if (sort === 'new') {
          query = query.order('created_at', { ascending: false });
        }

        query = query.limit(24);

        const { data, error } = await query;

        if (isCancelled) return;

        if (error) {
          console.error('Error fetching filtered photographers:', error);
          setPhotographers([]);
        } else {
          let results = (data as Photographer[]) || [];

          // Client-side category filtering if relational join filter isn't fully isolating via eq on embedded resource
          if (cat) {
            results = results.filter((p) =>
              p.photographer_categories?.some((pc) => pc.categories?.slug === cat)
            );
          }

          setPhotographers(results);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Search fetch error:', err);
          setPhotographers([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }, 400);

    return () => {
      isCancelled = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [q, spot, cat, minP, maxP, minR, sort]);

  const handleResetFilters = () => {
    setQ('');
    setSpot('');
    setCat('');
    setMinP('');
    setMaxP('');
    setMinR(0);
    setSort('rating');
  };

  const categoryListToUse: { slug: string; label: string }[] =
    categories.length > 0
      ? categories.map((c) => ({ slug: c.slug || c.id, label: c.name }))
      : STATIC_CATEGORIES;

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-6 pt-28 pb-20">
      {/* Page Header */}
      <div className="mb-10">
        <h2 className="section-head">ফটোগ্রাফার খুঁজুন</h2>
        <p className="section-sub mt-1">
          কক্সবাজারের ভেরিফায়েড প্রফেশনালদের ফিল্টার করুন
        </p>
        <p className="text-sm text-white/50 mt-3 font-medium">
          {toBn(photographers.length)} জন ফটোগ্রাফার পাওয়া গেছে
        </p>
      </div>

      {/* Main Layout */}
      <div className="lg:flex gap-8 items-start">
        {/* Filter Rail */}
        <aside className="lg:w-80 shrink-0 order-first mb-8 lg:mb-0 glass rounded-xl3 p-6 space-y-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">ফিল্টার</h3>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-sunset-gold hover:underline font-semibold"
            >
              সব মুছুন
            </button>
          </div>

          <hr className="divider-glow" />

          {/* 1) Search Input */}
          <div>
            <label className="field-label">সার্চ</label>
            <div className="relative">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45 pointer-events-none"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="নাম বা বিষয়…"
                className="glass-input !pl-10"
              />
            </div>
          </div>

          {/* 2) Spot Select */}
          <div>
            <label className="field-label">স্পট</label>
            <select
              value={spot}
              onChange={(e) => setSpot(e.target.value)}
              className="glass-select"
            >
              <option value="">সব স্পট</option>
              {COX_SPOTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.nameBn}
                </option>
              ))}
            </select>
          </div>

          {/* 3) Category Select */}
          <div>
            <label className="field-label">ক্যাটাগরি</label>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="glass-select"
            >
              <option value="">সব ক্যাটাগরি</option>
              {categoryListToUse.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4) Budget Range */}
          <div>
            <label className="field-label">সর্বোচ্চ বাজেট (৳)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={minP}
                onChange={(e) => setMinP(e.target.value)}
                placeholder="সর্বনিম্ন"
                className="glass-input"
              />
              <input
                type="number"
                value={maxP}
                onChange={(e) => setMaxP(e.target.value)}
                placeholder="সর্বোচ্চ"
                className="glass-input"
              />
            </div>
          </div>

          {/* 5) Rating Chips */}
          <div>
            <label className="field-label">রেটিং</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'সব', val: 0 },
                { label: '৩+', val: 3 },
                { label: '৪+', val: 4 },
                { label: '৪.৫+', val: 4.5 },
              ].map((r) => {
                const isActive = minR === r.val;
                return (
                  <button
                    key={r.val}
                    type="button"
                    onClick={() => setMinR(r.val)}
                    className={isActive ? 'chip-active' : 'chip'}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6) Sort Select */}
          <div>
            <label className="field-label">সাজান</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="glass-select"
            >
              <option value="rating">রেটিং বেশি আগে</option>
              <option value="price_asc">দাম: কম → বেশি</option>
              <option value="price_desc">দাম: বেশি → কম</option>
              <option value="new">নতুন</option>
            </select>
          </div>

          {/* 7) Reset Button */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn-ghost w-full justify-center"
          >
            ↺ ফিল্টার রিসেট
          </button>
        </aside>

        {/* Results Area */}
        <main className="flex-1 min-w-0">
          {loading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-96 rounded-xl3" />
              ))}
            </div>
          ) : photographers.length === 0 ? (
            <div className="glass-card p-12 text-center rounded-xl3">
              <div className="w-16 h-16 rounded-2xl glass mx-auto flex items-center justify-center mb-4 text-sunset-gold">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                কোনো ফটোগ্রাফার মেলেনি
              </h3>
              <p className="text-white/60 text-sm max-w-sm mx-auto mb-6">
                আপনার দেওয়া ফিল্টারের সাথে মিলে যায় এমন কোনো প্রফেশনাল পাওয়া যায়নি। ফিল্টার একটু বদলে দেখুন।
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-primary"
              >
                রিসেট করুন
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {photographers.map((p, i) => (
                <Reveal key={p.id} delay={i * 50}>
                  <PhotographerCard p={p} />
                </Reveal>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
