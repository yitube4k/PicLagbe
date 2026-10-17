import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Photographer } from "../lib/types";
import { toBn } from "../lib/utils";
import { useJsonLd } from "../lib/seo";
import { SPOT_BY_KEY } from "../lib/constants";
import Reveal from "../components/Reveal";
import PhotographerCard from "../components/PhotographerCard";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

/**
 * V38 — মিনিমাল রেজাল্ট পেজ:
 * মাঝখানের সার্চ বার নেই — সার্চ শুধু হেডারের Google-স্টাইল ওভারলেতে।
 * ফিল্টার সম্পূর্ণ URL-driven (?q=&spot=&cat=&minP=&maxP=&minR=&sort=) —
 * হেডার ওভারলে / ডিপ লিঙ্ক থেকে আসে, এই পেজে আলাদা কোনো কন্ট্রোল নেই।
 */
export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ফিল্টার = URL-deribed (state-sync বাগ নেই, হেডার নেভিগেশনে সাথে সাথে আপডেট হয়)
  const q = searchParams.get("q") || "";
  const spot = searchParams.get("spot") || "";
  const cat = searchParams.get("cat") || "";
  const minP = searchParams.get("minP") || "";
  const maxP = searchParams.get("maxP") || "";
  const minR = Number(searchParams.get("minR") || 0);
  const sort = searchParams.get("sort") || "rating";

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);

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

  // ক্যাটাগরি লেবেল (কাউন্ট লাইনের কনটেক্সটে বাংলা নাম দেখাতে)
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
    setSearchParams({}, { replace: true });
  };

  const catLabel = (slug: string) =>
    categories.find((c) => (c.slug || c.id) === slug)?.name || slug;

  // প্রয়োগ করা ফিল্টারের ছোট কনটেক্সট (চিপ নয় — শুধু টেক্সট, মিনিমাল)
  const ctxParts: string[] = [];
  if (q.trim()) ctxParts.push(`«${q.trim()}»`);
  if (spot) ctxParts.push(`📍 ${SPOT_BY_KEY(spot)?.nameBn || spot}`);
  if (cat) ctxParts.push(`📷 ${catLabel(cat)}`);

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-20">
      {/* SEO h1 — ভিজ্যুয়াল হিরো নেই, মিনিমাল রেজাল্ট পেজ */}
      <h1 className="sr-only">
        কক্সবাজারে সেরা ফটোগ্রাফার খুঁজুন — ভেরিফায়েড ফটোগ্রাফার · স্বচ্ছ
        প্যাকেজ · অগ্রিম ছাড়াই বুকিং
      </h1>

      {/* Results */}
      <main>
        {/* মিনিমাল কাউন্ট লাইন — কোনো সার্চ বার / চিপ নেই */}
        <p className="text-sm text-white/55 mb-6 flex items-center justify-center gap-2 text-center flex-wrap">
          <span
            className="w-1.5 h-1.5 rounded-full bg-sunset-gold inline-block shrink-0"
            aria-hidden="true"
          />
          {ctxParts.length > 0 && (
            <span className="text-white/85 font-semibold">{ctxParts.join(" · ")}</span>
          )}
          <span>
            {toBn(photographers.length)} জন ফটোগ্রাফার পাওয়া গেছে
          </span>
        </p>

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
              আপনার সার্চের সাথে মিলে যায় এমন কোনো প্রফেশনাল পাওয়া যায়নি।
              হেডারের সার্চ থেকে অন্য কিছু লিখে দেখুন।
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-primary"
            >
              সব ফটোগ্রাফার দেখুন
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
