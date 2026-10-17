import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Spot } from "../lib/constants";
import { Photographer } from "../lib/types";
import { toBn } from "../lib/utils";
import { openApp } from "../lib/base";

interface SpotFullscreenProps {
  spot: Spot;
  spots: Spot[];
  photographers: Photographer[];
  userLoc: { lat: number; lng: number } | null;
  onClose: () => void;
  onSelectSpot: (s: Spot) => void;
}

function distKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const KIND_BN_MAP: Record<string, string> = {
  beach: "সৈকত",
  point: "পয়েন্ট",
  island: "দ্বীপ",
  landmark: "দর্শনীয় স্থান",
  park: "পার্ক ও বিনোদন",
  drive: "ড্রাইভ রোড",
};

const MARINE_DRIVE_POINTS: [number, number][] = [
  [21.4268, 92.0062],
  [21.3736, 92.0547],
  [21.18, 92.12],
  [21.06, 92.19],
  [20.9964, 92.2069],
];

export default function SpotFullscreen({
  spot,
  spots,
  photographers,
  userLoc,
  onClose,
  onSelectSpot,
}: SpotFullscreenProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const listSectionRef = useRef<HTMLDivElement | null>(null);

  const [baseLayer, setBaseLayer] = useState<"map" | "sat">("map");

  const spotPhotographers = useMemo(() => {
    return photographers.filter((p) => p.home_spot === spot.key);
  }, [photographers, spot.key]);

  const spotCounts = useMemo(() => {
    const map = new Map<string, number>();
    spots.forEach((s) => map.set(s.key, 0));
    photographers.forEach((p) => {
      if (p.home_spot) {
        map.set(p.home_spot, (map.get(p.home_spot) || 0) + 1);
      }
    });
    return map;
  }, [spots, photographers]);

  const spotDist = useMemo(() => {
    if (!userLoc) return null;
    return distKm(userLoc.lat, userLoc.lng, spot.lat, spot.lng);
  }, [userLoc, spot.lat, spot.lng]);

  const scrollToPhotographers = useCallback(() => {
    const container = document.querySelector(".spot-fs-container");
    const list = listSectionRef.current;
    if (container && list) {
      container.scrollTo({ top: list.offsetTop, behavior: "smooth" });
    } else if (list) {
      list.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  const openGoogleDirections = useCallback(() => {
    let url = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`;
    if (userLoc) {
      url += `&origin=${userLoc.lat},${userLoc.lng}`;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }, [spot.lat, spot.lng, userLoc]);

  // Body scroll lock & ESC key listener
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [spot.lat, spot.lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const tileLayerGroup = L.layerGroup().addTo(map);
    const markersLayerGroup = L.layerGroup().addTo(map);

    tileLayerGroupRef.current = tileLayerGroup;
    markersLayerGroupRef.current = markersLayerGroup;
    mapInstanceRef.current = map;

    // Marine drive polyline
    L.polyline(MARINE_DRIVE_POINTS, {
      color: "#FF7A59",
      weight: 2,
      opacity: 0.4,
      dashArray: "6 8",
    }).addTo(map);

    const t1 = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const t2 = setTimeout(() => {
      map.invalidateSize();
    }, 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerGroupRef.current = null;
      markersLayerGroupRef.current = null;
    };
  }, []);

  // Update Base Layers
  useEffect(() => {
    const group = tileLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (baseLayer === "map") {
      const darkBase = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Esri, HERE, Garmin, © OpenStreetMap contributors",
          maxZoom: 16,
        },
      );
      const darkRef = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Esri",
          maxZoom: 16,
        },
      );
      group.addLayer(darkBase);
      group.addLayer(darkRef);
    } else {
      const satBase = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Esri, Maxar, Earthstar Geographics",
          maxZoom: 18,
        },
      );
      const satRef = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Esri",
          maxZoom: 18,
        },
      );
      group.addLayer(satBase);
      group.addLayer(satRef);
    }
  }, [baseLayer]);

  // Center/Fly to spot
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([spot.lat, spot.lng], 13, { duration: 0.7 });
    }
  }, [spot.lat, spot.lng]);

  // Render Markers
  useEffect(() => {
    const group = markersLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    // 1. Spot markers
    spots.forEach((s) => {
      const isSelected = s.key === spot.key;
      const count = spotCounts.get(s.key) || 0;
      const countText = count > 0 ? toBn(count) : "•";

      const size = isSelected ? 40 : 34;
      const bg = isSelected ? "rgba(10,14,26,0.88)" : "rgba(10,14,26,0.82)";
      const border = isSelected
        ? "2.5px solid #FBBF24"
        : "1.5px solid rgba(251,191,36,0.65)";
      const glow = isSelected
        ? "0 0 22px rgba(251,191,36,0.95)"
        : "0 0 12px rgba(255,196,107,0.6)";

      const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: ${bg};
      border: ${border};
      box-shadow: ${glow};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FBBF24;
      font-weight: 700;
      font-size: ${isSelected ? "14px" : "12px"};
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.16,1,0.3,1);
      user-select: none;
    ">
      ${countText}
    </div>
  `;

      const icon = L.divIcon({
        className: "spot-fs-marker",
        html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([s.lat, s.lng], {
        icon,
        zIndexOffset: isSelected ? 1000 : 500,
      });

      marker.on("click", () => {
        onSelectSpot(s);
      });

      group.addLayer(marker);
    });

    // 2. Photographers grouped by spot
    const groupedPhotographers = new Map<string, Photographer[]>();
    photographers.forEach((p) => {
      if (p.home_spot) {
        const list = groupedPhotographers.get(p.home_spot) || [];
        list.push(p);
        groupedPhotographers.set(p.home_spot, list);
      }
    });

    spots.forEach((s, spotIndex) => {
      const phs = groupedPhotographers.get(s.key) || [];
      phs.forEach((p, i) => {
        const angle = (i * Math.PI) / 4 + (spotIndex * Math.PI) / 8;
        const dLat = 0.011 * Math.sin(angle);
        const cosLat = Math.cos((s.lat * Math.PI) / 180);
        const dLng = (0.011 / (cosLat || 1)) * Math.cos(angle);

        const phLat = s.lat + dLat;
        const phLng = s.lng + dLng;

        const phIconHtml = `
      <div style="
        width: 26px;
        height: 26px;
        background: linear-gradient(135deg, #fbbf24, #f97316);
        border: 1.5px solid rgba(255,255,255,0.85);
        box-shadow: 0 0 10px rgba(249,115,22,0.7);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        cursor: pointer;
        user-select: none;
      ">
        📷
      </div>
    `;

        const phIcon = L.divIcon({
          className: "spot-fs-ph-marker",
          html: phIconHtml,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        const phMarker = L.marker([phLat, phLng], {
          icon: phIcon,
          zIndexOffset: 1200,
        });

        const targetUrl = `/photographer/${p.id || p.slug}`;
        const ratingVal =
          typeof p.rating_avg === "number" ? p.rating_avg.toFixed(1) : "৫.০";
        const tooltipContent = `<b>${p.display_name}</b> <span style="color:#fbbf24">★${toBn(ratingVal)}</span>`;

        phMarker.bindTooltip(tooltipContent, {
          permanent: true,
          direction: "right",
          className: "ph-name-label",
          offset: [14, 0],
          interactive: true,
        });

        const handleNavigate = () => {
          openApp(targetUrl);
        };

        phMarker.on("click", handleNavigate);
        phMarker.on("tooltipopen", (ev) => {
          const tooltipEl = ev.tooltip.getElement();
          if (tooltipEl) {
            tooltipEl.style.cursor = "pointer";
            tooltipEl.onclick = handleNavigate;
          }
        });

        group.addLayer(phMarker);
      });
    });

    // 3. User location marker
    if (userLoc) {
      const userHtml = `
    <div style="
      width: 22px;
      height: 22px;
      background: #38bdf8;
      border: 2.5px solid #ffffff;
      box-shadow: 0 0 14px #38bdf8;
      border-radius: 50%;
      cursor: pointer;
    "></div>
  `;
      const userIcon = L.divIcon({
        className: "spot-fs-user-marker",
        html: userHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const userMarker = L.marker([userLoc.lat, userLoc.lng], {
        icon: userIcon,
        zIndexOffset: 1500,
      });
      userMarker.bindTooltip("আপনার লোকেশন", {
        permanent: false,
        direction: "top",
        offset: [0, -12],
      });
      group.addLayer(userMarker);
    }
  }, [spots, spot.key, spotCounts, photographers, userLoc, onSelectSpot]);

  return (
    <div className="spot-fs-container fixed inset-0 z-[2000] bg-[#05060c] overflow-y-auto flex flex-col">
      <style>{`@keyframes spotFsIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } } @keyframes pillBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } } .ph-name-label { background: rgba(10, 14, 26, 0.88) !important; border: 1px solid rgba(251, 191, 36, 0.4) !important; color: #ffffff !important; font-size: 11px !important; padding: 3px 8px !important; border-radius: 8px !important; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5) !important; pointer-events: auto !important; white-space: nowrap !important; } .ph-name-label::before { border-right-color: rgba(10, 14, 26, 0.88) !important; } .spot-fs-container { animation: spotFsIn 0.25s ease-out forwards; } .bounce-pill { animation: pillBounce 2.2s infinite ease-in-out; } .map-glass { background: rgba(10, 14, 26, 0.82); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.12); }`}</style>
      {/* Fullscreen Map Section */}
      <section className="relative w-full h-[100svh] flex-shrink-0">
        <div
          ref={mapContainerRef}
          className="absolute inset-0 w-full h-full z-0"
        />

        {/* Top-Left: Spot info and close button */}
        <div className="absolute top-4 left-4 z-[500] max-w-[calc(100vw-6rem)] sm:max-w-md pointer-events-auto">
          <div className="map-glass rounded-2xl p-3.5 sm:p-4 shadow-2xl flex items-start gap-3.5 border border-white/15">
            <button
              type="button"
              onClick={onClose}
              aria-label="বন্ধ করুন"
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/80 hover:text-white transition-all flex-shrink-0 border border-white/10"
            >
              <span className="text-xl leading-none">✕</span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide truncate">
                  {spot.nameBn}
                </h1>
                {spot.nameEn && (
                  <span className="text-xs text-white/60 tracking-wider truncate">
                    {spot.nameEn}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30">
                  {KIND_BN_MAP[spot.kind] || "স্পট"}
                </span>

                {spotDist !== null && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/85 border border-white/10">
                    ~{toBn(spotDist.toFixed(1))} কিমি
                  </span>
                )}

                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sunset-soft text-sunset-gold border border-sunset-gold/30">
                  {toBn(spotPhotographers.length)} জন ফটোগ্রাফার
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top-Right: Map / Sat toggle */}
        <div className="absolute top-4 right-4 z-[500] pointer-events-auto">
          <div className="map-glass p-1 rounded-xl flex items-center gap-1 border border-white/15 shadow-xl">
            <button
              type="button"
              onClick={() => setBaseLayer("map")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                baseLayer === "map"
                  ? "bg-sunset-gradient text-[#1A0E06] shadow-md"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              ম্যাপ
            </button>
            <button
              type="button"
              onClick={() => setBaseLayer("sat")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                baseLayer === "sat"
                  ? "bg-sunset-gradient text-[#1A0E06] shadow-md"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              স্যাটেলাইট
            </button>
          </div>
        </div>

        {/* Bottom-Center: Scroll-down indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] pointer-events-auto">
          <button
            type="button"
            onClick={scrollToPhotographers}
            className="bounce-pill map-glass px-4 sm:px-6 py-2.5 sm:py-3 rounded-full flex items-center gap-2 border border-sunset-gold/40 shadow-2xl text-xs sm:text-sm font-medium hover:border-sunset-gold transition-colors active:scale-95"
          >
            <span className="text-[#FBBF24]">⬇</span>
            <span className="text-white/95">
              স্ক্রল করুন —{" "}
              <strong className="text-[#FBBF24] font-bold">
                {toBn(spotPhotographers.length)}
              </strong>{" "}
              জন ফটোগ্রাফার নিচে
            </span>
          </button>
        </div>
      </section>

      {/* Photographers Section */}
      <section
        ref={listSectionRef}
        id="ph-list-section"
        className="relative z-10 w-full max-w-7xl mx-auto px-4 py-12 sm:py-16 flex-1 flex flex-col justify-between"
      >
        <div>
          <div className="mb-8">
            <div className="text-xs uppercase tracking-widest text-[#FBBF24] font-semibold mb-1">
              স্পটে উপলব্ধ
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
              এখানে উপলব্ধ ফটোগ্রাফার
            </h2>
            <p className="text-sm text-white/60 mt-1">
              {spot.nameBn}-এ বুকিং এর জন্য প্রস্তুত{" "}
              <span className="text-[#FBBF24] font-medium">
                {toBn(spotPhotographers.length)}
              </span>{" "}
              জন পেশাদার ফটোগ্রাফার
            </p>
          </div>

          {spotPhotographers.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 sm:p-14 text-center max-w-xl mx-auto border border-white/10 shadow-2xl my-8">
              <div className="text-5xl sm:text-6xl mb-4">📸</div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                এখানে এখনো কোনো ফটোগ্রাফার নেই
              </h3>
              <p className="text-sm text-white/60 mb-6 leading-relaxed">
                এই স্পটের সম্পূর্ণ গাইড দেখে নিন অথবা পার্শ্ববর্তী অন্য কোনো
                স্পট বেছে নিয়ে ফটোগ্রাফার খুঁজে নিন।
              </p>
              <button
                type="button"
                onClick={() => openApp(`/spot/${spot.key}`)}
                className="btn-sunset px-6 py-2.5 rounded-xl text-sm font-semibold text-[#1A0E06] shadow-lg hover:shadow-[#FBBF24]/20 transition-all active:scale-95"
              >
                স্পট গাইড দেখুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {spotPhotographers.map((p) => {
                const cardImg = p.cover_photo_url || p.profile_photo_url;
                const firstChar = p.display_name?.trim()?.charAt(0) || "ফ";
                const ratingAvg =
                  typeof p.rating_avg === "number"
                    ? p.rating_avg.toFixed(1)
                    : "৫.০";
                const ratingCount =
                  typeof p.rating_count === "number" ? p.rating_count : 0;
                const targetSlug = p.id || p.slug;

                return (
                  <div
                    key={p.id || p.slug}
                    onClick={() => openApp(`/photographer/${targetSlug}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        openApp(`/photographer/${targetSlug}`);
                      }
                    }}
                    className="group text-left glass-card rounded-2xl overflow-hidden border border-white/10 hover:border-[#FBBF24]/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#FBBF24]/10 flex flex-col cursor-pointer"
                  >
                    {/* Cover Photo / Fallback */}
                    <div className="relative aspect-[16/9] w-full bg-white/[0.04] overflow-hidden">
                      {cardImg ? (
                        <img
                          src={cardImg}
                          alt={p.display_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-sunset-gradient/20 flex items-center justify-center">
                          <span className="text-4xl font-bold text-[#FBBF24]/60 select-none">
                            {firstChar}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#05060c] via-transparent to-transparent opacity-80" />

                      {p.starting_price && (
                        <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-[#05060c]/80 backdrop-blur-md border border-white/10 text-xs font-semibold text-[#FBBF24]">
                          শুরু ৳{toBn(p.starting_price)}
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <h3 className="font-bold text-white text-base group-hover:text-[#FBBF24] transition-colors truncate">
                            {p.display_name}
                          </h3>
                          {p.verified && (
                            <span
                              className="text-emerald-400 text-sm font-bold flex-shrink-0"
                              title="ভেরিফাইড ফটোগ্রাফার"
                            >
                              ✓
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-white/70 mb-2">
                          <span className="flex items-center gap-1 text-[#FBBF24] font-semibold">
                            <span>★</span>
                            <span>{toBn(ratingAvg)}</span>
                          </span>
                          <span className="text-white/40">•</span>
                          <span>({toBn(ratingCount)} রিভিউ)</span>
                        </div>

                        {p.full_location && (
                          <p className="text-xs text-white/50 truncate flex items-center gap-1">
                            <span>📍</span>
                            <span>{p.full_location}</span>
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs font-medium">
                        <span className="text-white/50 group-hover:text-white/80 transition-colors">
                          প্রোফাইল দেখুন
                        </span>
                        <span className="text-[#FBBF24] transform group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Row */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => openApp(`/spot/${spot.key}`)}
            className="w-full sm:w-auto btn-sunset px-8 py-3.5 rounded-xl font-bold text-sm text-[#1A0E06] shadow-xl hover:shadow-[#FBBF24]/20 transition-all active:scale-95 text-center"
          >
            স্পট গাইড ও ফটোগ্রাফার
          </button>
          <button
            type="button"
            onClick={openGoogleDirections}
            className="w-full sm:w-auto glass px-7 py-3.5 rounded-xl font-medium text-sm text-white/90 hover:text-white hover:border-[#FBBF24]/50 transition-all active:scale-95 flex items-center justify-center gap-2 border border-white/15"
          >
            <span>🗺️</span>
            <span>গুগল ম্যাপে ডিরেকশন</span>
          </button>
        </div>
      </section>
    </div>
  );
}
