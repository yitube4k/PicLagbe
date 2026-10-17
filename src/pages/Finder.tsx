import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "../lib/supabase";
import { Photographer } from "../lib/types";
import { toBn } from "../lib/utils";
import { COX_SPOTS, Spot } from "../lib/constants";
import { openApp } from "../lib/base";
import SpotFullscreen from "../components/SpotFullscreen";

const SPOT_KIND_EMOJI: Record<string, string> = {
  beach: "🏖️",
  point: "📍",
  island: "🏝️",
  landmark: "🏛️",
  park: "🌲",
  drive: "🛣️",
};

const SPOT_KIND_BN: Record<string, string> = {
  beach: "সৈকত",
  point: "পয়েন্ট",
  island: "দ্বীপ",
  landmark: "দর্শনীয় স্থান",
  park: "পার্ক ও প্রকৃতি",
  drive: "মেরিন ড্রাইভ",
};

// Great-circle distance in km between two {lat,lng} points
export function distKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** ইউজারের লোকেশন থেকে স্পটে গুগল ম্যাপ ডিরেকশন (নতুন ট্যাবে) */
export function openDirections(
  lat: number,
  lng: number,
  userLoc?: { lat: number; lng: number } | null,
) {
  const dest = `${lat},${lng}`;
  const origin = userLoc ? `&origin=${userLoc.lat},${userLoc.lng}` : "";
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${dest}${origin}&travelmode=driving`,
    "_blank",
    "noopener,noreferrer",
  );
}

export default function Finder() {
  const [selectedSpotKey, setSelectedSpotKey] = useState<string | null>(null);
  const [spotSearch, setSpotSearch] = useState("");
  const [baseLayer, setBaseLayer] = useState<"map" | "sat">("map");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [locStatus, setLocStatus] = useState<
    "idle" | "loading" | "denied" | "error"
  >("idle");
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenSpot, setFullscreenSpot] = useState<Spot | null>(null);

  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const phMarkersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    let active = true;
    async function loadPhotographers() {
      const { data, error } = await supabase
        .from("photographers")
        .select(
          "id, slug, display_name, full_location, starting_price, profile_photo_url, cover_photo_url, rating_avg, rating_count, home_spot, profile_status",
        )
        .eq("profile_status", "approved");

      if (!active) return;
      if (!error && data) {
        setPhotographers(data as Photographer[]);
      }
      setLoading(false);
    }
    loadPhotographers();
    return () => {
      active = false;
    };
  }, []);

  // Stable spot counts (recomputed only when photographer data changes)
  const spotCounts: Record<string, number> = useMemo(() => {
    const c: Record<string, number> = {};
    photographers.forEach((p) => {
      if (p.home_spot) {
        c[p.home_spot] = (c[p.home_spot] || 0) + 1;
      }
    });
    return c;
  }, [photographers]);

  // Photographers grouped by home spot (for map markers and panel)
  const photographersBySpot: Record<string, Photographer[]> = useMemo(() => {
    const g: Record<string, Photographer[]> = {};
    photographers.forEach((p) => {
      if (p.home_spot) {
        (g[p.home_spot] = g[p.home_spot] || []).push(p);
      }
    });
    return g;
  }, [photographers]);

  // Filtered spots for left rail (distance-sorted when user location known)
  const filteredSpots = useMemo(() => {
    const q = spotSearch.toLowerCase();
    const list = COX_SPOTS.filter(
      (s) =>
        s.nameBn.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q),
    );
    if (userLoc) {
      return [...list].sort(
        (a, b) =>
          distKm(userLoc.lat, userLoc.lng, a.lat, a.lng) -
          distKm(userLoc.lat, userLoc.lng, b.lat, b.lng),
      );
    }
    return list;
  }, [spotSearch, userLoc]);

  // চিপ ক্লাউডের ক্রম: ফটোগ্রাফার-আছে স্পট আগে (বেশি সংখ্যা আগে), খালি স্পট পরে;
  // ইউজার লোকেশন দিলে দূরত্ব-সাজানো ক্রমই থাকে
  const sortedSpots = useMemo(() => {
    if (userLoc) return filteredSpots;
    return [...filteredSpots].sort(
      (a, b) => (spotCounts[b.key] || 0) - (spotCounts[a.key] || 0),
    );
  }, [filteredSpots, spotCounts, userLoc]);

  // Select spot → fullscreen spot view + fly inline map
  const selectSpot = useCallback((s: (typeof COX_SPOTS)[number]) => {
    setSelectedSpotKey(s.key);
    setFullscreenSpot(s);
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([s.lat, s.lng], 13, { duration: 0.7 });
    }
  }, []);

  // ইউজারের লোকেশন থেকে দূরত্ব (durutto)
  const userDistTo = useCallback(
    (lat: number, lng: number) =>
      userLoc ? distKm(userLoc.lat, userLoc.lng, lat, lng) : null,
    [userLoc],
  );

  const handleLocate = () => {
    if (!("geolocation" in navigator)) {
      setLocStatus("error");
      return;
    }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        setLocStatus("idle");
        const map = mapInstanceRef.current;
        if (map) {
          map.flyTo([loc.lat, loc.lng], Math.max(10, Math.min(14, 12)), {
            duration: 0.6,
          });
        }
      },
      (err) => {
        setLocStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapElRef.current || mapInstanceRef.current) return;

    const map = L.map(mapElRef.current, {
      center: [21.28, 92.05],
      zoom: 11,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Marine Drive polyline
    L.polyline(
      [
        [21.4268, 92.0062],
        [21.3736, 92.0547],
        [21.18, 92.12],
        [21.06, 92.19],
        [20.9964, 92.2069],
      ],
      { color: "#FF7A59", weight: 2, opacity: 0.4, dashArray: "6 8" },
    ).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Base layers: keyless free tiles — Esri Dark Gray Canvas (map) + Esri World Imagery (satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const dark = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Esri, HERE, Garmin, © OpenStreetMap contributors",
        maxZoom: 19,
      },
    );
    const darkRef = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19 },
    );
    const sat = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Esri, Maxar, Earthstar Geographics",
        maxZoom: 19,
      },
    );
    const satRef = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19 },
    );

    if (baseLayer === "sat") {
      sat.addTo(map);
      satRef.addTo(map);
    } else {
      dark.addTo(map);
      darkRef.addTo(map);
    }

    return () => {
      map.removeLayer(dark);
      map.removeLayer(darkRef);
      map.removeLayer(sat);
      map.removeLayer(satRef);
    };
  }, [baseLayer]);

  // User location marker (re-drawn when userLoc changes)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (!userLoc) return;

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:22px;height:22px;border-radius:50%;background:#38bdf8;border:3px solid #ffffff;box-shadow:0 0 0 6px rgba(56,189,248,0.35), 0 2px 10px rgba(0,0,0,0.5);"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    const m = L.marker([userLoc.lat, userLoc.lng], { icon, zIndexOffset: 1000 })
      .addTo(map)
      .bindTooltip("আপনার লোকেশন", {
        direction: "top",
        offset: [0, -14],
        className: "spot-tip",
      });

    return () => {
      m.remove();
    };
  }, [userLoc]);

  // Update Markers when spots, photographer data, or selectedSpotKey changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};
    phMarkersRef.current.forEach((m) => m.remove());
    phMarkersRef.current = [];

    COX_SPOTS.forEach((s) => {
      const count = spotCounts[s.key] || 0;
      const isSelected = s.key === selectedSpotKey;

      const size = isSelected ? 40 : 34;
      const border = isSelected
        ? "2.5px solid #FBBF24"
        : "1.5px solid rgba(251, 191, 36, 0.65)";
      const shadow = isSelected
        ? "0 0 22px rgba(251, 191, 36, 0.95), 0 0 40px rgba(251, 191, 36, 0.5)"
        : "0 0 12px rgba(255, 196, 107, 0.6)";

      const htmlContent = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-weight: 700;
      font-size: ${isSelected ? 13 : 11}px;
      cursor: pointer;
      background: rgba(10, 14, 26, 0.88);
      color: #FFC46B;
      border: ${border};
      box-shadow: ${shadow};
      transition: all 0.2s ease-out;
    ">
      ${count > 0 ? toBn(count) : "•"}
    </div>
  `;

      const customIcon = L.divIcon({
        className: "",
        html: htmlContent,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([s.lat, s.lng], {
        icon: customIcon,
        zIndexOffset: isSelected ? 600 : 400,
      }).addTo(map);

      // Hover tooltip: spot name + live photographer count + distance + direction hint
      const d = userDistTo(s.lat, s.lng);
      marker.bindTooltip(
        `<b>${s.nameBn}</b> · ${count > 0 ? toBn(count) + " জন ফটোগ্রাফার" : "খালি"}${d !== null ? ` · ~${toBn(d.toFixed(1))} কিমি` : ""}<br/><span style="color:#8fd3ff">ক্লিক করুন → ফুল-স্ক্রিন স্পট ভিউ</span>`,
        {
          direction: "top",
          offset: [0, -16],
          opacity: 0.97,
          className: "spot-tip",
        },
      );

      marker.on("click", () => selectSpot(s));

      markersRef.current[s.key] = marker;
    });

    // Photographer markers — slight ring offset around their home spot
    // 📷 আইকনের পাশে ফটোগ্রাফারের নাম সবসময় দেখা যায় (permanent label)
    COX_SPOTS.forEach((s, sIdx) => {
      const group = photographersBySpot[s.key] || [];
      group.forEach((p, i) => {
        // প্রতিবেশী স্পটের রিং-এর সাথে ওভারল্যাপ এড়াতে প্রতি স্পটে বেস-অ্যাঙ্গেল আলাদা
        const angle = (i * Math.PI) / 4 + (sIdx * Math.PI) / 8;
        const dLat = 0.011 * Math.sin(angle);
        const dLng =
          (0.011 / Math.cos((s.lat * Math.PI) / 180)) * Math.cos(angle);
        const html = `
      <div style="
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 12px;
        cursor: pointer;
        background: linear-gradient(135deg, #fbbf24 0%, #f97316 100%);
        border: 1.5px solid rgba(255,255,255,0.85);
        box-shadow: 0 0 10px rgba(251,191,36,0.75);
      ">📷</div>
    `;
        const icon = L.divIcon({
          className: "",
          html,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        const m = L.marker([s.lat + dLat, s.lng + dLng], {
          icon,
          zIndexOffset: 1200,
        }).addTo(map);

        // নাম লেবেল — ক্যামেরা আইকনের পাশে সবসময় ভাসমান
        m.bindTooltip(
          `<b>${p.display_name || "ফটোগ্রাফার"}</b> <span style="color:#fbbf24">★${Number(p.rating_avg || 0).toFixed(1)}</span>`,
          {
            permanent: true,
            direction: "right",
            offset: [14, 0],
            className: "ph-name-label",
            opacity: 1,
          },
        );

        m.on("click", () => {
          const pid = p.id || p.slug;
          if (pid) openApp(`/photographer/${p.id || p.slug}`);
        });

        // নাম পিল নিজেই ক্লিকেবল — বড় ট্যাপ টার্গেট (ক্যামেরা ওভারল্যাপ হলেও প্রোফাইল খোলে)
        const tipEl = m.getTooltip()?.getElement?.() as HTMLElement | null;
        if (tipEl) {
          tipEl.style.cursor = "pointer";
          tipEl.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const pid = p.id || p.slug;
            if (pid) openApp(`/photographer/${p.id || p.slug}`);
          });
        }
        phMarkersRef.current.push(m);
      });
    });
  }, [
    spotCounts,
    photographersBySpot,
    selectSpot,
    userDistTo,
    selectedSpotKey,
  ]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 pt-24 pb-12">
      <style>{`@keyframes spotPanelIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* ══ সার্চ + লোকেট কন্ট্রোল ══ */}
      <div className="glass rounded-xl3 p-4 mb-5 flex flex-wrap items-center gap-2.5">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={spotSearch}
            onChange={(e) => setSpotSearch(e.target.value)}
            placeholder="স্পট খুঁজুন… (যেমন: ইনানী, লাবণী)"
            className="glass-input !py-2.5 !text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleLocate}
          disabled={locStatus === "loading"}
          className="chip !py-2.5 text-xs"
        >
          {locStatus === "loading"
            ? "⏳ লোকেশন নেওয়া হচ্ছে…"
            : "📍 আমার লোকেশন নিন"}
        </button>
        {userLoc && (
          <button
            type="button"
            onClick={() => {
              setUserLoc(null);
              setLocStatus("idle");
            }}
            className="chip chip-active !py-2.5 text-xs"
            title="দূরত্ব সাজানো বন্ধ করুন"
          >
            দূরত্ব অনুযায়ী সাজানো ✓
          </button>
        )}
      </div>
      {locStatus === "denied" && (
        <p className="text-[12.5px] text-rose-300 mb-4 leading-relaxed -mt-2">
          লোকেশন পারমিশন দেওয়া হয়নি — ব্রাউজার সেটিংস থেকে অনুমতি দিন।
        </p>
      )}
      {locStatus === "error" && (
        <p className="text-[12.5px] text-amber-300 mb-4 -mt-2">
          লোকেশন পাওয়া যায়নি — আবার চেষ্টা করুন।
        </p>
      )}

      {/* ══ স্পট চিপ ক্লাউড — কমপ্যাক্ট প্রিমিয়াম (১৯ লাইনের লম্বা লিস্ট নয়) ══ */}
      <div id="spots-grid" className="scroll-mt-24 mb-10">
        <div className="flex items-end justify-between gap-3 mb-3.5 flex-wrap">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              📍 স্পট বাছাই করুন
            </h3>
            <p className="text-xs sm:text-sm text-white/50 mt-1">
              সোনালি চিপে ফটোগ্রাফার আছে · ক্লিক করলে ম্যাপে স্পট ও ইন-ম্যাপ
              প্যানেল খুলবে
            </p>
          </div>
          {userLoc && (
            <span className="badge bg-sunset-soft text-sunset-gold border-sunset-gold/30">
              📏 কাছের স্পট আগে
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {sortedSpots.map((s) => {
            const count = spotCounts[s.key] || 0;
            const emoji = SPOT_KIND_EMOJI[s.kind] || "📍";
            const d = userDistTo(s.lat, s.lng);
            const isSelected = s.key === selectedSpotKey;

            return (
              <button
                key={s.key}
                type="button"
                onClick={() => selectSpot(s)}
                title={`${s.nameBn} (${s.nameEn}) — ${count > 0 ? `${toBn(count)} জন ফটোগ্রাফার` : "এখনো খালি"}`}
                className={`group inline-flex items-center gap-2 pl-2 pr-2.5 py-[7px] rounded-full border transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-sunset-gold/50 cursor-pointer ${
                  isSelected
                    ? "border-sunset-gold bg-sunset-soft"
                    : count > 0
                      ? "border-sunset-gold/30 bg-sunset-soft/50 hover:border-sunset-gold/70 hover:bg-sunset-soft"
                      : "border-white/[0.09] bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white/85"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`w-7 h-7 rounded-full grid place-items-center text-[15px] shrink-0 ${
                    count > 0 ? "bg-sunset-gradient/90" : "bg-white/[0.07]"
                  }`}
                >
                  {emoji}
                </span>
                <span
                  className={`font-semibold text-[15.5px] leading-none whitespace-nowrap ${count > 0 || isSelected ? "text-white" : ""}`}
                >
                  {isSelected && (
                    <span className="text-sunset-gold mr-1">✓</span>
                  )}
                  {s.nameBn}
                </span>
                {d !== null && (
                  <span className="text-[12.5px] text-bay-teal leading-none whitespace-nowrap">
                    ~{toBn(d.toFixed(1))} কিমি
                  </span>
                )}
                <span
                  className={`min-w-[24px] h-[22px] px-1.5 rounded-full grid place-items-center text-[13px] font-bold leading-none ${
                    count > 0
                      ? "bg-sunset-gradient text-[#1A0E06] shadow-[0_0_10px_rgba(251,191,36,0.35)]"
                      : "bg-white/[0.08] text-white/45"
                  }`}
                >
                  {toBn(count)}
                </span>
              </button>
            );
          })}
        </div>

        {filteredSpots.length === 0 && (
          <p className="text-sm text-white/45 mt-3">
            কোনো স্পট মেলেনি — অন্য নাম দিয়ে খুঁজুন।
          </p>
        )}
      </div>

      {/* ══ ম্যাপ — পেজের শেষে (নিচে) ══ */}
      <div id="map-section" className="scroll-mt-24">
        <div className="mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-white">
            🗺️ ম্যাপে সব স্পট ও ফটোগ্রাফার একসাথে
          </h3>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            গোল সংখ্যা = সেই স্পটের ফটোগ্রাফার · 📷 ক্যামেরায় ক্লিক = প্রোফাইল
            · স্পটে ক্লিক = বিস্তারিত ইন-ম্যাপ প্যানেল
          </p>
        </div>

        <div className="relative rounded-xl3 overflow-hidden glass p-1.5 shadow-glass-lg">
          {/* Leaflet Map Div */}
          <div
            ref={mapElRef}
            className="w-full h-[68vh] min-h-[440px] rounded-[14px] z-0"
          />

          {/* Layer toggle: Map / Satellite (free, keyless) */}
          <div className="absolute top-4 right-4 z-[500] flex gap-1.5 map-glass !p-1.5">
            <button
              type="button"
              onClick={() => setBaseLayer("map")}
              aria-pressed={baseLayer === "map"}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                baseLayer === "map"
                  ? "bg-sunset-gradient text-[#1A0E06]"
                  : "text-white/75 hover:text-white"
              }`}
            >
              ম্যাপ
            </button>
            <button
              type="button"
              onClick={() => setBaseLayer("sat")}
              aria-pressed={baseLayer === "sat"}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                baseLayer === "sat"
                  ? "bg-sunset-gradient text-[#1A0E06]"
                  : "text-white/75 hover:text-white"
              }`}
            >
              🛰️ স্যাটেলাইট
            </button>
          </div>

          {/* Top-Left Overlay */}
          <div className="absolute top-4 left-4 z-[500] map-glass pointer-events-none">
            <h4 className="text-sm font-bold text-white">
              ফটোলাগবে স্পট ম্যাপ
            </h4>
            <p className="text-xs text-white/60 mt-0.5">
              {toBn(COX_SPOTS.length)} পয়েন্ট ·{" "}
              {loading ? "…" : toBn(photographers.length)} রেজিস্টার্ড
              ফটোগ্রাফার
            </p>
          </div>
        </div>
      </div>

      {/* ══ ফুল-স্ক্রিন স্পট ভিউ — স্পট ক্লিকে খোলে ══ */}
      {fullscreenSpot && (
        <SpotFullscreen
          spot={fullscreenSpot}
          spots={COX_SPOTS}
          photographers={photographers}
          userLoc={userLoc}
          onClose={() => setFullscreenSpot(null)}
          onSelectSpot={(s) => {
            setSelectedSpotKey(s.key);
            setFullscreenSpot(s);
            const map = mapInstanceRef.current;
            if (map) {
              map.flyTo([s.lat, s.lng], 13, { duration: 0.7 });
            }
          }}
        />
      )}
    </div>
  );
}
