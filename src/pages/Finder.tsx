import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  const [baseLayer, setBaseLayer] = useState<'map' | 'sat'>('map');
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<'idle' | 'loading' | 'denied' | 'error'>('idle');

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

  // Filtered spots for left rail (distance-sorted when user location known)
  const filteredSpots = useMemo(() => {
    const q = spotSearch.toLowerCase();
    const list = COX_SPOTS.filter(
      (s) => s.nameBn.toLowerCase().includes(q) || s.nameEn.toLowerCase().includes(q)
    );
    if (userLoc) {
      return [...list].sort(
        (a, b) => distKm(userLoc.lat, userLoc.lng, a.lat, a.lng) - distKm(userLoc.lat, userLoc.lng, b.lat, b.lng)
      );
    }
    return list;
  }, [spotSearch, userLoc]);

  const selectedSpotObj = COX_SPOTS.find((s) => s.key === selectedSpotKey);

  // Distance (durutto) from user's location to a spot
  const userDistTo = useCallback(
    (lat: number, lng: number) => (userLoc ? distKm(userLoc.lat, userLoc.lng, lat, lng) : null),
    [userLoc]
  );

  const handleLocate = () => {
    if (!('geolocation' in navigator)) {
      setLocStatus('error');
      return;
    }
    setLocStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        setLocStatus('idle');
        const map = mapInstanceRef.current;
        if (map) {
          map.flyTo([loc.lat, loc.lng], Math.max(10, Math.min(14, 12)), { duration: 0.6 });
        }
      },
      (err) => {
        setLocStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

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

    // Base tile layers are managed by the baseLayer effect (map/satellite toggle)

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

  // Base layers: keyless free tiles — Esri Dark Gray Canvas (map) + Esri World Imagery (satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const dark = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Esri, HERE, Garmin, © OpenStreetMap contributors',
        maxZoom: 19,
      }
    );
    const darkRef = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    );
    const sat = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
      }
    );
    const satRef = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    );

    if (baseLayer === 'sat') {
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
      className: '',
      html: `<div style="width:22px;height:22px;border-radius:50%;background:#38bdf8;border:3px solid #ffffff;box-shadow:0 0 0 6px rgba(56,189,248,0.35), 0 2px 10px rgba(0,0,0,0.5);"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    const m = L.marker([userLoc.lat, userLoc.lng], { icon, zIndexOffset: 1000 })
      .addTo(map)
      .bindTooltip('আপনার লোকেশন', { direction: 'top', offset: [0, -14], className: 'spot-tip' });

    return () => {
      m.remove();
    };
  }, [userLoc]);

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

      // Hover tooltip: spot name + live photographer count + distance
      const d = userDistTo(s.lat, s.lng);
      marker.bindTooltip(
        `<b>${s.nameBn}</b> · ${count > 0 ? toBn(count) + ' জন ফটোগ্রাফার' : 'খালি'}${d !== null ? ` · ~${toBn(d.toFixed(1))} কিমি` : ''}`,
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
  }, [selectedSpotKey, panelOpen, spotCounts, photographersBySpot, navigate, userDistTo]);

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
          ১৯টি শুটিং পয়েন্ট — স্যাটেলাইট ভিউ, দূরত্ব ও ফটোগ্রাফার সার্চ (কোনো API key লাগে না)
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

          {/* Locate + distance bar */}
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleLocate}
              disabled={locStatus === 'loading'}
              className="chip !py-1.5 text-xs"
            >
              {locStatus === 'loading' ? '⏳ লোকেশন নেওয়া হচ্ছে…' : '📍 আমার লোকেশন নিন'}
            </button>
            {userLoc && (
              <button
                type="button"
                onClick={() => { setUserLoc(null); setLocStatus('idle'); }}
                className="chip chip-active !py-1.5 text-xs"
                title="দূরত্ব সাজানো বন্ধ করুন"
              >
                দূরত্ব অনুযায়ী সাজানো ✓
              </button>
            )}
          </div>
          {locStatus === 'denied' && (
            <p className="text-[11px] text-rose-300 mb-2 leading-relaxed">
              লোকেশন পারমিশন দেওয়া হয়নি — ব্রাউজার সেটিংস থেকে অনুমতি দিন।
            </p>
          )}
          {locStatus === 'error' && (
            <p className="text-[11px] text-amber-300 mb-2">লোকেশন পাওয়া যায়নি — আবার চেষ্টা করুন।</p>
          )}

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
                        {userLoc
                          ? `~${toBn(distKm(userLoc.lat, userLoc.lng, s.lat, s.lng).toFixed(1))} কিমি দূরে`
                          : s.nameEn}
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

          {/* Layer toggle: Map / Satellite (free, keyless) */}
          <div className="absolute top-4 right-4 z-[500] flex gap-1.5 map-glass !p-1.5">
            <button
              type="button"
              onClick={() => setBaseLayer('map')}
              aria-pressed={baseLayer === 'map'}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                baseLayer === 'map' ? 'bg-sunset-gradient text-[#1A0E06]' : 'text-white/75 hover:text-white'
              }`}
            >
              ম্যাপ
            </button>
            <button
              type="button"
              onClick={() => setBaseLayer('sat')}
              aria-pressed={baseLayer === 'sat'}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                baseLayer === 'sat' ? 'bg-sunset-gradient text-[#1A0E06]' : 'text-white/75 hover:text-white'
              }`}
            >
              🛰️ স্যাটেলাইট
            </button>
          </div>

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
                  {userLoc && selectedSpotObj && (
                    <span className="badge text-[10px] bg-sunset-soft text-sunset-gold border-sunset-gold/30">
                      📏 ~{toBn(distKm(userLoc.lat, userLoc.lng, selectedSpotObj.lat, selectedSpotObj.lng).toFixed(1))} কিমি দূরে
                    </span>
                  )}
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
