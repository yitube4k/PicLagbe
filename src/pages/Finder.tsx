import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';
import { Photographer } from '../lib/types';
import { toBn, taka } from '../lib/utils';
import { COX_SPOTS, SPOT_KIND_BN } from '../lib/constants';

const SPOT_KIND_EMOJI: Record<string, string> = {
  beach: '🏖️',
  point: '📍',
  island: '🏝️',
  landmark: '🏛️',
  park: '🌲',
  drive: '🛣️',
};

// Great-circle distance in km between two {lat,lng} points
function distKm(aLat: number, aLng: number, bLat: number, bLng: number) {
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

export default function Finder() {
  const [selectedSpotKey, setSelectedSpotKey] = useState<string>('laboni');
  const [panelOpen, setPanelOpen] = useState(false);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [spotSearch, setSpotSearch] = useState('');

  const navigate = useNavigate();
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const phMarkersRef = useRef<L.Marker[]>([]);
  const firstRenderRef = useRef(true);

  useEffect(() => {
    let active = true;
    async function loadPhotographers() {
      const { data, error } = await supabase
        .from('photographers')
        .select('id, slug, display_name, full_location, starting_price, profile_photo_url, cover_photo_url, rating_avg, rating_count, home_spot, profile_status')
        .eq('profile_status', 'approved');

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

  // Photographers grouped by home spot (for map markers + panel)
  const photographersBySpot: Record<string, Photographer[]> = useMemo(() => {
    const g: Record<string, Photographer[]> = {};
    photographers.forEach((p) => {
      if (p.home_spot) {
        (g[p.home_spot] = g[p.home_spot] || []).push(p);
      }
    });
    return g;
  }, [photographers]);

  // Filtered spots for left rail
  const filteredSpots = COX_SPOTS.filter(
    (s) =>
      s.nameBn.toLowerCase().includes(spotSearch.toLowerCase()) ||
      s.nameEn.toLowerCase().includes(spotSearch.toLowerCase())
  );

  const selectedSpotObj = COX_SPOTS.find((s) => s.key === selectedSpotKey);

  const photographersForSelectedSpot = selectedSpotKey
    ? photographersBySpot[selectedSpotKey] || []
    : [];

  // Nearby fallback: nearest spots that DO have approved photographers
  const nearbySuggestions = useMemo(() => {
    if (!selectedSpotObj || photographersForSelectedSpot.length > 0) return [];
    return COX_SPOTS.filter((s) => s.key !== selectedSpotObj.key && (spotCounts[s.key] || 0) > 0)
      .map((s) => ({
        spot: s,
        d: distKm(selectedSpotObj.lat, selectedSpotObj.lng, s.lat, s.lng),
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
  }, [selectedSpotObj, photographersForSelectedSpot.length, spotCounts]);

  const openSpot = (key: string) => {
    setSelectedSpotKey(key);
    setPanelOpen(true);
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapElRef.current || mapInstanceRef.current) return;

    const map = L.map(mapElRef.current, {
      center: [21.28, 92.05],
      zoom: 10,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 18,
    }).addTo(map);

    // Marine Drive polyline
    L.polyline(
      [
        [21.4268, 92.0062],
        [21.3736, 92.0547],
        [21.18, 92.12],
        [21.06, 92.19],
        [20.9964, 92.2069],
      ],
      { color: '#FF7A59', weight: 2, opacity: 0.4, dashArray: '6 8' }
    ).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when spots, selection or photographer data change
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
      const isSelected = panelOpen && s.key === selectedSpotKey;

      const htmlContent = `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-weight: 700;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.3s ease;
          background: ${isSelected ? 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)' : 'rgba(10, 14, 26, 0.88)'};
          color: ${isSelected ? '#1A0E06' : '#FFC46B'};
          border: 1.5px solid ${isSelected ? '#ffffff' : 'rgba(251, 191, 36, 0.65)'};
          box-shadow: 0 0 ${isSelected ? '18px' : '12px'} rgba(${isSelected ? '249, 115, 22' : '255, 196, 107'}, 0.6);
        ">
          ${count > 0 ? toBn(count) : '•'}
        </div>
      `;

      const customIcon = L.divIcon({
        className: '',
        html: htmlContent,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([s.lat, s.lng], { icon: customIcon, zIndexOffset: 500 }).addTo(map);

      // Hover tooltip: spot name + live photographer count
      marker.bindTooltip(
        `<b>${s.nameBn}</b> · ${count > 0 ? toBn(count) + ' জন ফটোগ্রাফার' : 'খালি'}`,
        { direction: 'top', offset: [0, -14], opacity: 0.95, className: 'spot-tip' }
      );

      marker.on('click', () => {
        openSpot(s.key);
        map.flyTo([s.lat, s.lng], 13, { duration: 0.8 });
      });

      markersRef.current[s.key] = marker;
    });

    // Photographer markers — slight ring offset around their home spot
    COX_SPOTS.forEach((s) => {
      const group = photographersBySpot[s.key] || [];
      group.forEach((p, i) => {
        const angle = (i * Math.PI) / 4;
        const dLat = 0.004 * Math.sin(angle);
        const dLng = (0.004 / Math.cos((s.lat * Math.PI) / 180)) * Math.cos(angle);
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
        const icon = L.divIcon({ className: '', html, iconSize: [26, 26], iconAnchor: [13, 13] });
        const m = L.marker([s.lat + dLat, s.lng + dLng], { icon, zIndexOffset: 800 }).addTo(map);
        m.bindTooltip(
          `<b>${p.display_name || 'ফটোগ্রাফার'}</b> · ★ ${Number(p.rating_avg || 0).toFixed(1)}`,
          { direction: 'top', offset: [0, -12], opacity: 0.95, className: 'spot-tip' }
        );
        m.on('click', () => {
          if (p.id) navigate(`/photographer/${p.id}`);
        });
        phMarkersRef.current.push(m);
      });
    });
  }, [selectedSpotKey, panelOpen, spotCounts, photographersBySpot, navigate]);

  // FlyTo when selectedSpotKey changes via left rail / marker click
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    const map = mapInstanceRef.current;
    if (!map) return;
    const spot = COX_SPOTS.find((s) => s.key === selectedSpotKey);
    if (spot && panelOpen) {
      map.flyTo([spot.lat, spot.lng], 13, { duration: 0.8 });
    }
  }, [selectedSpotKey, panelOpen]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 pt-24 pb-12">
      {/* Header */}
      <div className="mb-8">
        <h2 className="section-head">🗺️ কক্সবাজার ম্যাপ ফাইন্ডার</h2>
        <p className="section-sub mt-1">
          ১৯টি শুটিং পয়েন্ট — স্পট বা ফটোগ্রাফার পয়েন্টে ক্লিক করুন
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid lg:grid-cols-[380px_1fr] gap-5 items-start">
        {/* Left Rail */}
        <aside className="glass rounded-xl3 p-4 flex flex-col max-h-[calc(100vh-190px)] order-last lg:order-first">
          {/* Search Mini Input */}
          <div className="mb-3">
            <input
              type="text"
              value={spotSearch}
              onChange={(e) => setSpotSearch(e.target.value)}
              placeholder="স্পট খুঁজুন…"
              className="glass-input !py-2.5 !text-sm"
            />
          </div>

          {/* Scrollable Spot List */}
          <div className="no-scrollbar overflow-y-auto space-y-2 pr-1 flex-1">
            {filteredSpots.map((s) => {
              const count = spotCounts[s.key] || 0;
              const isSelected = panelOpen && s.key === selectedSpotKey;
              const emoji = SPOT_KIND_EMOJI[s.kind] || '📍';

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => openSpot(s.key)}
                  className={`w-full text-left p-3.5 rounded-xl2 transition-all duration-200 border flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-sunset-gold/60 bg-sunset-soft shadow-sunset-glow'
                      : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-[38px] h-[38px] glass rounded-xl2 grid place-items-center text-lg shrink-0">
                      {emoji}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-white truncate">
                        {s.nameBn}
                      </h4>
                      <span className="text-[11px] text-white/45 truncate block">
                        {s.nameEn}
                      </span>
                    </div>
                  </div>

                  <span
                    className={
                      count > 0
                        ? 'badge bg-sunset-soft text-sunset-gold border-sunset-gold/30 shrink-0'
                        : 'badge text-white/40 shrink-0'
                    }
                  >
                    {count > 0 ? `${toBn(count)} জন` : '০'}
                  </span>
                </button>
              );
            })}
          </div>

          <hr className="divider-glow my-3" />
          <p className="text-[11px] text-white/40 leading-relaxed">
            💡 টিপ: মেরিন ড্রাইভে সানসেটের আগে পৌঁছান — গোল্ডেন আওয়ারের আলো সবচেয়ে সুন্দর
          </p>
        </aside>

        {/* Right Map Container */}
        <div className="relative rounded-xl3 overflow-hidden glass p-1.5 shadow-glass-lg">
          {/* Leaflet Map Div */}
          <div
            ref={mapElRef}
            className="w-full h-[calc(100vh-220px)] min-h-[460px] rounded-[14px] z-0"
          />

          {/* Top-Left Overlay */}
          <div className="absolute top-4 left-4 z-[500] map-glass pointer-events-none">
            <h4 className="text-sm font-bold text-white">ফটোলাগবে স্পট ম্যাপ</h4>
            <p className="text-xs text-white/60 mt-0.5">
              {toBn(19)} পয়েন্ট · {toBn(photographers.length)} ফটোগ্রাফার
            </p>
          </div>

          {/* Bottom Info Panel */}
          {panelOpen && selectedSpotObj && (
            <div className="absolute bottom-4 inset-x-4 z-[500] map-glass max-h-[46vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-white text-base">
                    {selectedSpotObj.nameBn}
                  </h4>
                  <span className="badge text-[10px] bg-sunset-soft text-sunset-gold border-sunset-gold/30">
                    {SPOT_KIND_BN[selectedSpotObj.kind] || selectedSpotObj.kind}
                  </span>
                  <span className="badge text-[10px] text-white/70">
                    {photographersForSelectedSpot.length > 0
                      ? `✅ ${toBn(photographersForSelectedSpot.length)} জন অ্যাভেইলেবল`
                      : '⚠️ কেউ নেই'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  aria-label="প্যানেল বন্ধ করুন"
                  className="glass rounded-full w-7 h-7 flex items-center justify-center text-white/70 hover:text-white shrink-0"
                >
                  ✕
                </button>
              </div>

              <p className="text-sm text-white/70 mb-3">
                {selectedSpotObj.descBn}
              </p>

              <hr className="divider-glow my-2" />

              {photographersForSelectedSpot.length === 0 ? (
                <div className="py-2">
                  <p className="text-sm text-white/55">
                    এই স্পটে এখনো ফটোগ্রাফার নেই — নিকটবর্তী স্পটে পাওয়া যাচ্ছে:
                  </p>
                  {nearbySuggestions.map(({ spot, d }) => (
                    <div key={spot.key} className="mt-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <button
                          type="button"
                          onClick={() => openSpot(spot.key)}
                          className="text-sm font-semibold text-sunset-gold hover:underline"
                        >
                          {SPOT_KIND_EMOJI[spot.kind] || '📍'} {spot.nameBn}
                        </button>
                        <span className="text-[11px] text-white/45">
                          ~{toBn(Math.round(d))} কিমি · {toBn(spotCounts[spot.key] || 0)} জন
                        </span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                        {(photographersBySpot[spot.key] || []).slice(0, 4).map((p) => (
                          <Link
                            key={p.id}
                            to={`/photographer/${p.id}`}
                            className="min-w-[200px] glass rounded-xl2 p-2.5 flex gap-2.5 items-center hover:border-sunset-gold/50 transition shrink-0"
                          >
                            {p.profile_photo_url ? (
                              <img
                                src={p.profile_photo_url}
                                alt={p.display_name}
                                className="w-9 h-9 rounded-full object-cover ring-1 ring-sunset-gold/40 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-sunset-gradient flex items-center justify-center text-xs font-bold text-[#1A0E06] shrink-0">
                                {(p.display_name || 'ফ').slice(0, 1)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white truncate">
                                {p.display_name}
                              </div>
                              <div className="text-[11px] text-white/55 truncate">
                                ★ {toBn(Number(p.rating_avg || 0).toFixed(1))} · {taka(p.starting_price || 0)}+
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {photographersForSelectedSpot.map((p) => (
                    <Link
                      key={p.id}
                      to={`/photographer/${p.id}`}
                      className="min-w-[220px] glass rounded-xl2 p-2.5 flex gap-2.5 items-center hover:border-sunset-gold/50 transition shrink-0"
                    >
                      {p.profile_photo_url ? (
                        <img
                          src={p.profile_photo_url}
                          alt={p.display_name}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-sunset-gold/40 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-sunset-gradient flex items-center justify-center text-xs font-bold text-[#1A0E06] shrink-0">
                          {(p.display_name || 'ফ').slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {p.display_name}
                        </div>
                        <div className="text-[11px] text-white/55 truncate">
                          ★ {toBn(Number(p.rating_avg || 0).toFixed(1))} · {taka(p.starting_price || 0)}+
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
