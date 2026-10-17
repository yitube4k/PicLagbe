import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Photographer } from "../lib/types";
import { COX_SPOTS, SPOT_BY_KEY, SPOT_KIND_BN } from "../lib/constants";
import { toBn, taka } from "../lib/utils";
import { SEARCH_CATEGORIES, buildSearchPath } from "../lib/searchConfig";

const SPOT_KIND_EMOJI: Record<string, string> = {
  beach: "🏖️",
  point: "📍",
  island: "🏝️",
  landmark: "🏛️",
  park: "🌲",
  drive: "🛣️",
};

export default function GlobalSearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState<string>("");
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQ("");
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    let alive = true;
    if (photographers.length === 0) {
      setLoading(true);
      supabase
        .from("photographers")
        .select(
          "id, slug, display_name, bio, city, profile_photo_url, cover_photo_url, starting_price, verified, rating_avg, rating_count, home_spot, details, photographer_categories(category_id, categories(name, slug, icon))",
        )
        .eq("profile_status", "approved")
        .then(({ data, error }) => {
          if (!alive) return;
          setLoading(false);
          if (!error && data) {
            setPhotographers(data as unknown as Photographer[]);
          }
        });
    }

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [open, photographers.length]);

  const photographerCountsBySpot = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const p of photographers) {
      const spots = new Set<string>();
      if (p.home_spot) {
        spots.add(p.home_spot);
      }
      if (p.details && Array.isArray(p.details.covered_spots)) {
        for (const sp of p.details.covered_spots) {
          if (typeof sp === "string" && sp) {
            spots.add(sp);
          }
        }
      }
      for (const spKey of spots) {
        counts[spKey] = (counts[spKey] || 0) + 1;
      }
    }
    return counts;
  }, [photographers]);

  const trimmedQuery = q.trim();
  const needleWords = useMemo<string[]>(() => {
    if (!trimmedQuery) return [];
    return trimmedQuery.toLowerCase().split(/\s+/).filter(Boolean);
  }, [trimmedQuery]);

  const filteredPhotographers = useMemo<Photographer[]>(() => {
    if (needleWords.length === 0) return [];
    return photographers
      .filter((p) => {
        let text =
          (p.display_name || "") + " " + (p.bio || "") + " " + (p.city || "");
        if (
          p.photographer_categories &&
          Array.isArray(p.photographer_categories)
        ) {
          for (const pc of p.photographer_categories) {
            if (pc.categories?.name) {
              text += " " + pc.categories.name;
            }
          }
        }
        if (p.home_spot) {
          const sp = SPOT_BY_KEY(p.home_spot);
          if (sp) {
            text += " " + sp.nameBn + " " + sp.nameEn;
          }
        }
        if (p.details && Array.isArray(p.details.covered_spots)) {
          for (const spKey of p.details.covered_spots) {
            const sp = SPOT_BY_KEY(spKey);
            if (sp) {
              text += " " + sp.nameBn + " " + sp.nameEn;
            }
          }
        }
        const haystack = text.toLowerCase();
        return needleWords.every((word) => haystack.includes(word));
      })
      .slice(0, 6);
  }, [needleWords, photographers]);

  const filteredSpots = useMemo(() => {
    if (needleWords.length === 0) return [];
    return COX_SPOTS.filter((spot) => {
      const haystack = (
        spot.nameBn +
        " " +
        spot.nameEn +
        " " +
        spot.descBn +
        " " +
        spot.kind
      ).toLowerCase();
      return needleWords.every((word) => haystack.includes(word));
    }).slice(0, 5);
  }, [needleWords]);

  const filteredCategories = useMemo(() => {
    if (needleWords.length === 0) return [];
    return SEARCH_CATEGORIES.filter((cat) => {
      const haystack = (cat.label + " " + cat.slug).toLowerCase();
      return needleWords.every((word) => haystack.includes(word));
    }).slice(0, 4);
  }, [needleWords]);

  if (!open) return null;

  const handleSelect = (url: string) => {
    navigate(url);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmedQuery) {
      handleSelect(buildSearchPath({ q: trimmedQuery, spot: "", cat: "" }));
    }
  };

  const hasSearchMatches =
    filteredPhotographers.length > 0 ||
    filteredSpots.length > 0 ||
    filteredCategories.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="সাইট সার্চ"
      className="fixed inset-0 z-[120]"
    >
      <div
        className="absolute inset-0 bg-[#06070d]/95 backdrop-blur-xl"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-[680px] mx-auto px-4 pt-[9vh] sm:pt-[14vh]">
        <form
          role="search"
          onSubmit={handleSubmit}
          className="sp-hero relative rounded-[24px] p-2.5"
        >
          <span aria-hidden="true" className="sp-hero-line" />
          <div className="flex items-center gap-3 w-full">
            <svg
              className="text-sunset-gold ml-2 flex-shrink-0"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="কক্সবাজারে যা খুঁজছেন লিখুন…"
              aria-label="কক্সবাজারে সার্চ"
              className="sp-input flex-1 min-w-0 min-h-[52px] text-[16.5px] !border-0 !bg-transparent !shadow-none focus:outline-none text-white placeholder-white/40"
            />

            <div className="flex items-center gap-2 flex-shrink-0 pr-1">
              {q !== "" && (
                <button
                  type="button"
                  aria-label="মুছুন"
                  onClick={() => {
                    setQ("");
                    inputRef.current?.focus();
                  }}
                  className="w-10 h-10 rounded-full border border-white/[0.12] bg-white/[0.05] text-white/70 hover:text-white hover:border-white/25 transition-colors flex items-center justify-center"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}

              <button
                type="button"
                aria-label="সার্চ বন্ধ করুন"
                onClick={onClose}
                className="w-10 h-10 rounded-full border border-white/[0.12] bg-white/[0.05] text-white/70 hover:text-white hover:border-white/25 transition-colors flex items-center justify-center"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4 rounded-[20px] glass-strong overflow-hidden max-h-[60vh] overflow-y-auto">
          {loading && trimmedQuery !== "" && (
            <div className="py-8 text-center text-sm text-white/50">
              লোড হচ্ছে…
            </div>
          )}

          {trimmedQuery === "" ? (
            <div>
              <div className="px-4 pt-3.5 pb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-sunset-gold/80">
                জনপ্রিয় স্পট
              </div>
              <div className="divide-y divide-white/[0.04]">
                {COX_SPOTS.slice(0, 6).map((spot) => {
                  const count = photographerCountsBySpot[spot.key] || 0;
                  return (
                    <button
                      key={spot.key}
                      type="button"
                      onClick={() => handleSelect("/spot/" + spot.key)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.06] focus-visible:bg-white/[0.08] transition-colors"
                    >
                      <div className="w-11 h-11 rounded-[14px] bg-white/[0.06] border border-white/[0.1] grid place-items-center text-lg flex-shrink-0">
                        {SPOT_KIND_EMOJI[spot.kind] || "📍"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-bold text-white truncate">
                          {spot.nameBn}
                        </div>
                        <div className="text-[12.5px] text-white/55 truncate">
                          {spot.nameEn} · {SPOT_KIND_BN[spot.kind] || spot.kind}
                        </div>
                      </div>
                      {count > 0 && (
                        <div className="text-[11.5px] text-sunset-gold font-bold whitespace-nowrap flex-shrink-0">
                          {toBn(count)} জন ফটোগ্রাফার
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="px-4 pt-4 pb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-sunset-gold/80">
                ক্যাটাগরি
              </div>
              <div className="px-4 py-2.5 flex flex-wrap gap-2">
                {SEARCH_CATEGORIES.map((cat) => (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() =>
                      handleSelect("/photographers?cat=" + cat.slug)
                    }
                    className="px-3.5 py-2 text-[13px] rounded-full border border-white/[0.12] bg-white/[0.05] text-white/80 hover:border-sunset-gold/50 hover:text-white transition-colors"
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleSelect("/photographers")}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-[14px] font-bold text-sunset-gold hover:bg-white/[0.06] border-t border-white/[0.08] transition-colors mt-2"
              >
                সব ফটোগ্রাফার দেখুন →
              </button>
            </div>
          ) : (
            <div>
              {filteredPhotographers.length > 0 && (
                <div>
                  <div className="px-4 pt-3.5 pb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-sunset-gold/80">
                    ফটোগ্রাফার
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {filteredPhotographers.map((p) => {
                      const firstCat =
                        p.photographer_categories?.[0]?.categories?.name;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            handleSelect("/photographer/" + (p.slug || p.id))
                          }
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.06] focus-visible:bg-white/[0.08] transition-colors"
                        >
                          {p.profile_photo_url ? (
                            <img
                              src={p.profile_photo_url}
                              alt={p.display_name}
                              className="w-11 h-11 rounded-full object-cover border border-white/15 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-sunset-gradient grid place-items-center font-extrabold text-[#1A0E06] flex-shrink-0 text-base">
                              {p.display_name ? p.display_name.charAt(0) : "P"}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[15px] font-bold text-white truncate">
                                {p.display_name}
                              </span>
                              {p.verified && (
                                <span
                                  className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400/45 text-emerald-300 inline-flex items-center justify-center flex-shrink-0"
                                  title="ভেরিফাইড"
                                >
                                  <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </span>
                              )}
                            </div>

                            <div className="text-[12.5px] text-white/55 truncate">
                              {p.rating_avg != null && (
                                <>
                                  ★ {toBn(Number(p.rating_avg).toFixed(1))}
                                  {p.rating_count && p.rating_count > 0 ? (
                                    <> ({toBn(p.rating_count)})</>
                                  ) : null}
                                  {" · "}
                                </>
                              )}
                              {p.starting_price != null && (
                                <>
                                  {taka(p.starting_price)}
                                  {firstCat ? " · " : ""}
                                </>
                              )}
                              {firstCat && <span>{firstCat}</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredSpots.length > 0 && (
                <div>
                  <div className="px-4 pt-3.5 pb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-sunset-gold/80">
                    স্পট
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {filteredSpots.map((spot) => {
                      const count = photographerCountsBySpot[spot.key] || 0;
                      return (
                        <button
                          key={spot.key}
                          type="button"
                          onClick={() => handleSelect("/spot/" + spot.key)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.06] focus-visible:bg-white/[0.08] transition-colors"
                        >
                          <div className="w-11 h-11 rounded-[14px] bg-white/[0.06] border border-white/[0.1] grid place-items-center text-lg flex-shrink-0">
                            {SPOT_KIND_EMOJI[spot.kind] || "📍"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[15px] font-bold text-white truncate">
                              {spot.nameBn}
                            </div>
                            <div className="text-[12.5px] text-white/55 truncate">
                              {spot.nameEn} ·{" "}
                              {SPOT_KIND_BN[spot.kind] || spot.kind}
                            </div>
                          </div>
                          {count > 0 && (
                            <div className="text-[11.5px] text-sunset-gold font-bold whitespace-nowrap flex-shrink-0">
                              {toBn(count)} জন ফটোগ্রাফার
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredCategories.length > 0 && (
                <div>
                  <div className="px-4 pt-3.5 pb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-sunset-gold/80">
                    ক্যাটাগরি
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() =>
                          handleSelect("/photographers?cat=" + cat.slug)
                        }
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.06] focus-visible:bg-white/[0.08] transition-colors"
                      >
                        <div className="w-11 h-11 rounded-[14px] bg-sunset-soft grid place-items-center text-lg flex-shrink-0">
                          📷
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-bold text-white truncate">
                            {cat.label}
                          </div>
                        </div>
                        <span className="text-white/30 text-base flex-shrink-0">
                          ↗
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!loading && !hasSearchMatches && (
                <div className="px-6 py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto mb-3 text-xl text-white/40">
                    🔍
                  </div>
                  <div className="text-[15px] font-bold text-white mb-1">
                    কিছু পাওয়া যায়নি
                  </div>
                  <div className="text-[13px] text-white/50 max-w-[300px] mx-auto">
                    বানান বদলে আবার চেষ্টা করুন বা সব ফটোগ্রাফার দেখুন।
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  handleSelect(
                    buildSearchPath({ q: trimmedQuery, spot: "", cat: "" }),
                  )
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-[14px] font-bold text-sunset-gold hover:bg-white/[0.06] border-t border-white/[0.08] transition-colors"
              >
                খুঁজুন: &quot;{trimmedQuery}&quot; — সব ফলাফল
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
