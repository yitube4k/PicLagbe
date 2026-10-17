import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Photographer } from "../lib/types";
import { toBn } from "../lib/utils";
import { useJsonLd } from "../lib/seo";
import { COX_SPOTS, SPOT_BY_KEY } from "../lib/constants";
import Reveal from "../components/Reveal";
import PhotographerCard from "../components/PhotographerCard";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

const STATIC_CATEGORIES = [
  { slug: "wedding", label: "বিয়ের ফটোগ্রাফি" },
  { slug: "pre-wedding", label: "প্রি-ওয়েডিং" },
  { slug: "birthday", label: "জন্মদিন" },
  { slug: "event", label: "ইভেন্ট" },
  { slug: "portrait", label: "পোর্ট্রেট" },
  { slug: "fashion", label: "ফ্যাশন" },
  { slug: "product", label: "প্রোডাক্ট" },
  { slug: "travel", label: "ট্রাভেল" },
  { slug: "corporate", label: "কর্পোরেট" },
  { slug: "videography", label: "ভিডিওগ্রাফি" },
];

const SlidersIcon = ({ size = 17 }: { size?: number }) => (
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

/* ── V30 — স্লাইড-টু-বাজেট দুই-আঙুল রেঞ্জ স্লাইডার ── */
const BUDGET_MIN = 0;
const BUDGET_MAX = 30000;
const BUDGET_STEP = 500;

function BudgetSlider({
  minP,
  maxP,
  onChange,
}: {
  minP: string;
  maxP: string;
  onChange: (min: string, max: string) => void;
}) {
  const lo = minP ? Math.min(Number(minP), BUDGET_MAX) : BUDGET_MIN;
  const hi = maxP ? Math.min(Number(maxP), BUDGET_MAX) : BUDGET_MAX;
  const pctLo = ((lo - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;
  const pctHi = ((hi - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[12.5px] font-bold text-white/85 tabular-nums">
          ৳{lo.toLocaleString("en-IN")}
        </span>
        <span className="text-[11.5px] text-white/45">
          আপনার বাজেট স্লাইড করুন
        </span>
        <span className="text-[12.5px] font-bold text-sunset-gold tabular-nums">
          {hi >= BUDGET_MAX ? "৳৩০,০০০+" : `৳${hi.toLocaleString("en-IN")}`}
        </span>
      </div>
      <div className="budget-range relative h-7 select-none">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/12 pointer-events-none" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-300 pointer-events-none"
          style={{ left: `${pctLo}%`, right: `${100 - pctHi}%` }}
        />
        <input
          type="range"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={BUDGET_STEP}
          value={lo}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), hi - BUDGET_STEP);
            onChange(v <= BUDGET_MIN ? "" : String(v), maxP);
          }}
          aria-label="সর্বনিম্ন বাজেট"
          className="budget-thumb"
        />
        <input
          type="range"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={BUDGET_STEP}
          value={hi}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), lo + BUDGET_STEP);
            onChange(minP, v >= BUDGET_MAX ? "" : String(v));
          }}
          aria-label="সর্বোচ্চ বাজেট"
          className="budget-thumb"
        />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {[
          { label: "≤ ২,৫০০", min: "", max: "2500" },
          { label: "≤ ৫,০০০", min: "", max: "5000" },
          { label: "৫–১০ হাজার", min: "5000", max: "10000" },
          { label: "১০ হাজার+", min: "10000", max: "" },
        ].map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => onChange(chip.min, chip.max)}
            className={`chip !py-1 !px-2.5 !text-[11.5px] ${minP === chip.min && maxP === chip.max ? "chip-active" : ""}`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter states
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [spot, setSpot] = useState(searchParams.get("spot") || "");
  const [cat, setCat] = useState(searchParams.get("cat") || "");
  const [minP, setMinP] = useState(searchParams.get("minP") || "");
  const [maxP, setMaxP] = useState(searchParams.get("maxP") || "");
  const [minR, setMinR] = useState(Number(searchParams.get("minR") || 0));
  const [sort, setSort] = useState(searchParams.get("sort") || "rating");

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  /* V36 — স্পট-ভিত্তিক ফটোগ্রাফার সংখ্যা (চিপ ব্যাজ) */
  const [spotCounts, setSpotCounts] = useState<Record<string, number>>({});

  /* V30 — ডিরেক্টরি ItemList JSON-LD: Google-এ "cox bazar photographer" সার্চে তালিকা বুঝতে পারে */
  useJsonLd(
    "photographers-directory",
    (() => {
      if (loading || photographers.length === 0) return null;
      return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "কক্সবাজারের ভেরিফায়েড ফটোগ্রাফার",
        numberOfItems: photographers.length,
        itemListElement: photographers.slice(0, 20).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.display_name,
          url: `https://photolagbe.pages.dev/photographer/${p.slug || p.id}`,
        })),
      };
    })(),
  );

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch categories from DB on mount
  useEffect(() => {
    let active = true;
    async function loadCategories() {
      const { data, error } = await supabase.from("categories").select("*");
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

  // V36 — স্পট ব্যাজের জন্য হালকা কাউন্ট কোয়েরি (আলাদা, ফিল্টার ছাড়া)
  useEffect(() => {
    let active = true;
    async function loadSpotCounts() {
      const { data, error } = await supabase
        .from("photographers")
        .select("id, home_spot")
        .eq("profile_status", "approved");
      if (!active) return;
      if (!error && data) {
        const counts: Record<string, number> = {};
        (data as { id: string; home_spot: string | null }[]).forEach((item) => {
          if (item.home_spot)
            counts[item.home_spot] = (counts[item.home_spot] || 0) + 1;
        });
        setSpotCounts(counts);
      }
    }
    loadSpotCounts();
    return () => {
      active = false;
    };
  }, []);

  // ফিল্টার মেনুর বাইরে ক্লিকে বন্ধ
  useEffect(() => {
    if (!filtersOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [filtersOpen]);

  // Sync URL params whenever filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (spot) params.set("spot", spot);
    if (cat) params.set("cat", cat);
    if (minP) params.set("minP", minP);
    if (maxP) params.set("maxP", maxP);
    if (minR > 0) params.set("minR", String(minR));
    if (sort && sort !== "rating") params.set("sort", sort);

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
          .from("photographers")
          .select(
            "*, photographer_categories(category_id, categories(name, slug, icon))",
          )
          .eq("profile_status", "approved");

        if (q.trim()) {
          query = query.or(
            `display_name.ilike.%${q.trim()}%,bio.ilike.%${q.trim()}%`,
          );
        }

        if (spot) {
          query = query.eq("home_spot", spot);
        }

        if (minP) {
          const numMin = Number(minP);
          if (!isNaN(numMin)) query = query.gte("starting_price", numMin);
        }

        if (maxP) {
          const numMax = Number(maxP);
          if (!isNaN(numMax)) query = query.lte("starting_price", numMax);
        }

        if (minR > 0) {
          query = query.gte("rating_avg", minR);
        }

        // Sorting
        if (sort === "rating") {
          query = query.order("rating_avg", {
            ascending: false,
            nullsFirst: false,
          });
        } else if (sort === "price_asc") {
          query = query.order("starting_price", {
            ascending: true,
            nullsFirst: false,
          });
        } else if (sort === "price_desc") {
          query = query.order("starting_price", {
            ascending: false,
            nullsFirst: false,
          });
        } else if (sort === "new") {
          query = query.order("created_at", { ascending: false });
        }

        query = query.limit(24);

        const { data, error } = await query;

        if (isCancelled) return;

        if (error) {
          console.error("Error fetching filtered photographers:", error);
          setPhotographers([]);
        } else {
          let results = (data as Photographer[]) || [];

          // Client-side category filtering if relational join filter isn't fully isolating via eq on embedded resource
          if (cat) {
            results = results.filter((p) =>
              p.photographer_categories?.some(
                (pc) => pc.categories?.slug === cat,
              ),
            );
          }

          setPhotographers(results);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Search fetch error:", err);
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
    setQ("");
    setSpot("");
    setCat("");
    setMinP("");
    setMaxP("");
    setMinR(0);
    setSort("rating");
  };

  const categoryListToUse: { slug: string; label: string }[] =
    categories.length > 0
      ? categories.map((c) => ({ slug: c.slug || c.id, label: c.name }))
      : STATIC_CATEGORIES;

  const activeFilterCount =
    (spot ? 1 : 0) +
    (cat ? 1 : 0) +
    (minP ? 1 : 0) +
    (maxP ? 1 : 0) +
    (minR > 0 ? 1 : 0) +
    (sort !== "rating" ? 1 : 0);

  const catLabel = (slug: string) =>
    categoryListToUse.find((c) => c.slug === slug)?.label || slug;

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-20">
      {/* ═══ হিরো ব্যান্ড (V36 — রেফারেন্স স্টাইল) ═══ */}
      <div className="relative rounded-[24px] overflow-hidden mb-6 border border-white/[0.09]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#221607] via-[#120f1c] to-[#06070d]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(251,191,36,0.16),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sunset-gold/70 to-transparent" />
        <div className="relative z-10 px-5 sm:px-8 py-7 sm:py-9">
          <p className="text-[12.5px] font-bold tracking-[0.22em] text-sunset-gold">
            কক্সবাজার
          </p>
          <h1 className="mt-1.5 text-[26px] sm:text-4xl font-extrabold text-white leading-tight">
            সেরা ফটোগ্রাফার খুঁজুন
          </h1>
          <p className="mt-2 text-[13.5px] sm:text-[15px] text-white/70">
            ভেরিফায়েড ফটোগ্রাফার · স্বচ্ছ প্যাকেজ · অগ্রিম ছাড়াই বুকিং
          </p>
        </div>
      </div>

      {/* ═══ Google-স্টাইল সার্চ বার + অপশন মেনু ═══ */}
      <div className="max-w-3xl mx-auto mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFiltersOpen(false);
          }}
          role="search"
          aria-label="ফটোগ্রাফার সার্চ"
          className="sp-hero relative z-20 rounded-[20px] p-2 shadow-[0_18px_50px_-16px_rgba(0,0,0,0.7)]"
        >
          <span aria-hidden="true" className="sp-hero-line" />
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="shrink-0 w-11 flex items-center justify-center text-white/45"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>

            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ফটোগ্রাফার, সার্ভিস বা স্পট লিখুন…"
              aria-label="ফটোগ্রাফার খুঁজুন"
              className="sp-input flex-1 min-w-0 !border-0 !bg-transparent !shadow-none px-1 min-h-[50px] text-[16.5px]"
            />

            {/* ফিল্টার টগল */}
            <div ref={filterRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                aria-label="ফিল্টার অপশন"
                className={`relative flex items-center justify-center w-11 h-11 rounded-full border transition-colors ${
                  filtersOpen || activeFilterCount > 0
                    ? "border-sunset-gold/55 bg-sunset-soft text-sunset-gold"
                    : "border-white/[0.12] bg-white/[0.05] text-white/60 hover:text-white hover:border-white/25"
                }`}
              >
                <SlidersIcon size={18} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sunset-coral text-white text-[10.5px] font-extrabold flex items-center justify-center">
                    {toBn(activeFilterCount)}
                  </span>
                )}
              </button>

              {/* অপশন মেনু — সব ফিল্টার এক জায়গায় */}
              {filtersOpen && (
                <div className="absolute right-0 top-[52px] z-[60] glass-strong !rounded-[18px] shadow-glass-lg p-4 w-[300px] max-h-[70vh] overflow-y-auto">
                  <p className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-white/45 px-1 pb-3">
                    ফিল্টার অপশন
                  </p>

                  <label className="field-label !text-[12.5px]">
                    💰 বাজেট (৳)
                  </label>
                  <BudgetSlider
                    minP={minP}
                    maxP={maxP}
                    onChange={(min, max) => {
                      setMinP(min);
                      setMaxP(max);
                    }}
                  />
                  <div className="h-3" />

                  <label className="field-label !text-[12.5px]">⭐ রেটিং</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { label: "সব", val: 0 },
                      { label: "৩+", val: 3 },
                      { label: "৪+", val: 4 },
                      { label: "৪.৫+", val: 4.5 },
                    ].map((r) => (
                      <button
                        key={r.val}
                        type="button"
                        onClick={() => setMinR(r.val)}
                        className={minR === r.val ? "chip-active" : "chip"}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  <label className="field-label !text-[12.5px]">↕️ সাজান</label>
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

                  <div className="flex items-center justify-between gap-2 pt-3.5 mt-1 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-xs font-semibold text-white/55 hover:text-white"
                    >
                      ↺ সব মুছুন
                    </button>
                    <button
                      type="submit"
                      className="btn-sunset !py-2 !px-6 !text-xs"
                    >
                      দেখাও
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              aria-label="সার্চ করুন"
              className="btn-sunset shrink-0 flex items-center justify-center gap-2 px-5 min-h-[42px] text-[15.5px]"
            >
              খুঁজুন
            </button>
          </div>
        </form>

        {/* ═══ V36 — স্পট চিপস (গোল্ড পিল + কাউন্ট ব্যাজ) ═══ */}
        <div
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 mt-4"
          role="radiogroup"
          aria-label="স্পট ফিল্টার"
        >
          <button
            type="button"
            aria-pressed={spot === ""}
            onClick={() => setSpot("")}
            className={
              spot === ""
                ? "shrink-0 inline-flex items-center rounded-full px-4 py-2 text-[13px] font-bold bg-sunset-gradient text-[#1A0E06] shadow-[0_4px_14px_rgba(249,115,22,0.35)]"
                : "chip shrink-0 !py-2 !px-4 !text-[13px]"
            }
          >
            সব স্পট
          </button>
          {COX_SPOTS.map((s) => {
            const active = spot === s.key;
            const count = spotCounts[s.key] || 0;
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={active}
                onClick={() => setSpot(active ? "" : s.key)}
                className={
                  active
                    ? "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold bg-sunset-gradient text-[#1A0E06] shadow-[0_4px_14px_rgba(249,115,22,0.35)]"
                    : "chip shrink-0 !py-2 !px-3.5 !text-[13px]"
                }
              >
                {s.nameBn}
                {count > 0 && (
                  <span
                    className={`min-w-[20px] h-[18px] px-1 rounded-full grid place-items-center text-[11px] font-extrabold ${active ? "bg-black/25 text-[#1A0E06]" : "bg-sunset-gradient text-[#1A0E06]"}`}
                  >
                    {toBn(count)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══ V36 — ক্যাটাগরি চিপস ═══ */}
        <div
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 mt-2"
          role="radiogroup"
          aria-label="ক্যাটাগরি ফিল্টার"
        >
          <button
            type="button"
            aria-pressed={cat === ""}
            onClick={() => setCat("")}
            className={
              cat === ""
                ? "chip-active shrink-0 !py-1.5 !text-[13px]"
                : "chip shrink-0 !py-1.5 !text-[13px] !text-white/70"
            }
          >
            সব ক্যাটাগরি
          </button>
          {categoryListToUse.map((c) => {
            const active = cat === c.slug;
            return (
              <button
                key={c.slug}
                type="button"
                aria-pressed={active}
                onClick={() => setCat(active ? "" : c.slug)}
                className={
                  active
                    ? "chip-active shrink-0 !py-1.5 !text-[13px]"
                    : "chip shrink-0 !py-1.5 !text-[13px] !text-white/70"
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <p className="text-sm text-white/55 mt-3.5 font-medium flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full bg-sunset-gold inline-block shrink-0"
            aria-hidden="true"
          />
          {toBn(photographers.length)} জন ফটোগ্রাফার পাওয়া গেছে
        </p>

        {/* সক্রিয় ফিল্টার চিপস */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3 justify-center">
            {spot && (
              <button
                type="button"
                onClick={() => setSpot("")}
                className="chip !py-1"
              >
                📍 {SPOT_BY_KEY(spot)?.nameBn || spot} ✕
              </button>
            )}
            {cat && (
              <button
                type="button"
                onClick={() => setCat("")}
                className="chip !py-1"
              >
                📷 {catLabel(cat)} ✕
              </button>
            )}
            {minP && (
              <button
                type="button"
                onClick={() => setMinP("")}
                className="chip !py-1"
              >
                ↓ ৳{toBn(minP)} থেকে ✕
              </button>
            )}
            {maxP && (
              <button
                type="button"
                onClick={() => setMaxP("")}
                className="chip !py-1"
              >
                ↑ ৳{toBn(maxP)} পর্যন্ত ✕
              </button>
            )}
            {minR > 0 && (
              <button
                type="button"
                onClick={() => setMinR(0)}
                className="chip !py-1"
              >
                ⭐ {toBn(minR)}+ ✕
              </button>
            )}
            {sort !== "rating" && (
              <button
                type="button"
                onClick={() => setSort("rating")}
                className="chip !py-1"
              >
                ↕️{" "}
                {sort === "price_asc"
                  ? "দাম কম→বেশি"
                  : sort === "price_desc"
                    ? "দাম বেশি→কম"
                    : "নতুন"}{" "}
                ✕
              </button>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-sunset-gold hover:underline"
            >
              সব মুছুন
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <main>
        {loading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-96 rounded-xl3" />
            ))}
          </div>
        ) : photographers.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-xl3 max-w-xl mx-auto">
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
              আপনার দেওয়া ফিল্টারের সাথে মিলে যায় এমন কোনো প্রফেশনাল পাওয়া
              যায়নি। ফিল্টার একটু বদলে দেখুন।
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
  );
}
