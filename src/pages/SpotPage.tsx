import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';
import { Photographer } from '../lib/types';
import { toBn, taka } from '../lib/utils';
import { COX_SPOTS, SPOT_BY_KEY, SPOT_KIND_BN } from '../lib/constants';
import { SPOT_PHOTOS } from '../lib/spotPhotos';
import { cldUrl } from '../lib/cloudinary';
import { distKm, openDirections } from './Finder';
import PhotographerCard from '../components/PhotographerCard';
import SpotGuideSection from '../components/SpotGuideSection';
import { useSiteSettings, isOn } from '../lib/settings';

const SPOT_KIND_EMOJI: Record<string, string> = {
  beach: '🏖️',
  point: '📍',
  island: '🏝️',
  landmark: '🏛️',
  park: '🌲',
  drive: '🛣️',
};

/**
 * স্পট পেজ (/spot/:key) — ম্যাপের ট্যুর পয়েন্টে ক্লিক করলে নতুন ট্যাবে এই পেজ খোলে:
 *  • ওই স্পটের available ফটোগ্রাফারদের সব প্রোফাইল
 *  • ইউজারের লোকেশন থেকে ওই পয়েন্টে গুগল ম্যাপ actual direction
 *  • স্পটের ছবি (Cloudinary f_auto) + দূরত্ব
 */
export default function SpotPage() {
  const { key } = useParams<{ key: string }>();
  const spot = SPOT_BY_KEY(key || '');

  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<'idle' | 'loading' | 'denied' | 'error'>('idle');

  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // admin সেটিং: ডিরেকশনের নিচের মিনি ম্যাপ (ডিফল্ট লুকানো)
  const { settings } = useSiteSettings();
  const showMiniMap = isOn(settings['spot_minimap'], 'off');

  // ফটোগ্রাফার লোড
  useEffect(() => {
    window.scrollTo(0, 0);
    let active = true;
    setLoading(true);

    async function load() {
      const { data, error } = await supabase
        .from('photographers')
        .select('*, photographer_categories(category_id, categories(name, slug, icon))')
        .eq('profile_status', 'approved');

      if (!active) return;
      if (error) {
        console.error('Spot photographers fetch error:', error);
        setPhotographers([]);
      } else {
        setPhotographers((data as Photographer[]) || []);
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [key]);

  // মিনি ম্যাপ
  useEffect(() => {
    if (!spot || !mapElRef.current || mapInstanceRef.current) return;

    const map = L.map(mapElRef.current, {
      center: [spot.lat, spot.lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Esri, Maxar, Earthstar Geographics', maxZoom: 19 }
    ).addTo(map);

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-size:17px;background:linear-gradient(135deg,#fbbf24,#f97316);border:2px solid #fff;box-shadow:0 0 16px rgba(251,191,36,0.8);">📷</div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
    L.marker([spot.lat, spot.lng], { icon, zIndexOffset: 900 })
      .addTo(map)
      .bindTooltip(`<b>${spot.nameBn}</b>`, { direction: 'top', offset: [0, -18], className: 'spot-tip' });

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [spot, showMiniMap]);

  const handleGetDirections = () => {
    if (!spot) return;
    if (userLoc) {
      openDirections(spot.lat, spot.lng, userLoc);
      return;
    }
    if (!('geolocation' in navigator)) {
      openDirections(spot.lat, spot.lng, null);
      return;
    }
    setLocStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        setLocStatus('idle');
        openDirections(spot.lat, spot.lng, loc);
      },
      () => {
        // পারমিশন না দিলেও ডেস্টিনেশন দিয়েই ম্যাপ খুলবে (Google নিজেই current location ধরবে)
        setLocStatus('idle');
        openDirections(spot.lat, spot.lng, null);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  };

  const spotPhotographers = useMemo(
    () => photographers.filter((p) => p.home_spot === key),
    [photographers, key]
  );

  const nearby = useMemo(() => {
    if (!spot || spotPhotographers.length > 0) return [];
    return COX_SPOTS.filter((s) => s.key !== spot.key)
      .map((s) => ({ spot: s, d: distKm(spot.lat, spot.lng, s.lat, s.lng) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
  }, [spot, spotPhotographers.length]);

  if (!spot) {
    return (
      <div className="max-w-md mx-auto px-6 pt-40 pb-24 text-center">
        <div className="glass-card p-10 rounded-xl3 space-y-4">
          <h2 className="text-2xl font-extrabold grad-text">স্পট পাওয়া যায়নি</h2>
          <p className="text-sm text-white/60">এই লিঙ্কটি ভুল অথবা স্পটটি আর নেই।</p>
          <Link to="/finder" className="btn-primary">
            ম্যাপ ফাইন্ডারে ফিরুন
          </Link>
        </div>
      </div>
    );
  }

  const emoji = SPOT_KIND_EMOJI[spot.kind] || '📍';
  const distanceKm = userLoc ? distKm(userLoc.lat, userLoc.lng, spot.lat, spot.lng) : null;

  return (
    <div className="pb-20">
      {/* ═══ HERO: স্পটের তথ্য (স্যাটেলাইট স্ন্যাপশট ব্যাকড্রপ — keyless) ═══ */}
      <section className="relative h-[38vh] min-h-[280px] overflow-hidden bg-twilight-900">
        {SPOT_PHOTOS[key || ''] ? (
          <img
            src={cldUrl(SPOT_PHOTOS[key || ''], { w: 1400, c: 'fill' })}
            alt={`${spot.nameBn} — কক্সবাজার`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <img
            src={`https://staticmap.openstreetmap.de/staticmap.php?center=${spot.lat},${spot.lng}&zoom=13&size=1200x400&maptype=mapnik`}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-25"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-twilight-950/60 via-twilight-950/55 to-[#06070d] pointer-events-none" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <span className="chip mb-4 inline-flex">
            {emoji} {SPOT_KIND_BN[spot.kind] || spot.kind}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            {spot.nameBn}
          </h1>
          <p className="text-white/60 text-sm mt-1.5">{spot.nameEn} · কক্সবাজার</p>
          {distanceKm !== null && (
            <span className="badge bg-sunset-soft text-sunset-gold border-sunset-gold/30 mt-3">
              📏 আপনার থেকে ~{toBn(distanceKm.toFixed(1))} কিমি
            </span>
          )}
        </div>

        <Link
          to="/finder"
          className="absolute top-24 left-6 glass-strong rounded-full px-4 py-2 flex items-center gap-2 text-white text-sm hover:border-sunset-gold/50 transition-colors z-20"
        >
          <span aria-hidden="true">←</span>
          <span>ম্যাপ</span>
        </Link>
      </section>

      {/* ═══ ডিরেকশন বার ═══ */}
      <div className="max-w-6xl mx-auto px-4 lg:px-6 -mt-8 relative z-10">
        <div className="glass-strong rounded-xl3 p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-bold text-white">📍 {spot.descBn}</h2>
            <p className="text-xs text-white/55 mt-0.5">
              গুগল ম্যাপে ক্লিক করলেই আপনার লোকেশন থেকে এখানকার আসল রাস্তা-নির্দেশনা খুলবে
            </p>
          </div>
          <button
            type="button"
            onClick={handleGetDirections}
            disabled={locStatus === 'loading'}
            className="btn-sunset shrink-0 px-6 min-h-[48px] justify-center whitespace-nowrap"
          >
            {locStatus === 'loading' ? '⏳ লোকেশন নেওয়া হচ্ছে…' : '🧭 গুগল ম্যাপে ডিরেকশন'}
          </button>
        </div>
      </div>

      {/* ═══ মিনি স্যাটেলাইট ম্যাপ — admin সেটিংস থেকে চালু/বন্ধ (ডিফল্ট লুকানো) ═══ */}
      {showMiniMap && (
        <div className="max-w-6xl mx-auto px-4 lg:px-6 mt-6">
          <div className="glass rounded-xl3 p-1.5">
            <div ref={mapElRef} className="w-full h-[240px] rounded-[14px] z-0" />
          </div>
        </div>
      )}

      {/* ═══ সম্পূর্ণ গাইড — ভাড়া+টিকিট+খাওয়া+ঢাকা রুট+ফটো পয়েন্ট ═══ */}
      <SpotGuideSection spotKey={key || ''} />

      {/* ═══ AVAILABLE ফটোগ্রাফার ═══ */}
      <section className="max-w-6xl mx-auto px-4 lg:px-6 mt-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="section-head !mb-0">
              {emoji} এই স্পটের ফটোগ্রাফার
            </h2>
            <p className="section-sub mt-1.5">
              {loading
                ? 'লোড হচ্ছে…'
                : spotPhotographers.length > 0
                ? `✅ ${toBn(spotPhotographers.length)} জন অ্যাভেইলেবল — প্রোফাইলে গিয়ে সরাসরি বুক করুন`
                : 'এই স্পটে এখনো কেউ নেই'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-80 rounded-xl3" />
            ))}
          </div>
        ) : spotPhotographers.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {spotPhotographers.map((p) => (
              <PhotographerCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 rounded-xl3">
            <p className="text-white/70 font-semibold mb-5">
              কাছের স্পটগুলোতে পাওয়া যাচ্ছে:
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {nearby.map(({ spot: s, d }) => {
                const cnt = photographers.filter((pp) => pp.home_spot === s.key).length;
                return (
                  <Link
                    key={s.key}
                    to={`/spot/${s.key}`}
                    className="glass rounded-xl2 p-4 hover:border-sunset-gold/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{SPOT_KIND_EMOJI[s.kind] || '📍'}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate">{s.nameBn}</div>
                        <div className="text-[12.5px] text-white/50">
                          ~{toBn(Math.round(d))} কিমি · {cnt > 0 ? `${toBn(cnt)} জন` : 'খালি'}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* দামের হিন্ট */}
      {spotPhotographers.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 lg:px-6 mt-8">
          <div className="glass rounded-xl3 p-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/70">
              💰 এই স্পটের ফটোগ্রাফারদের শুরু প্যাকেজ:{' '}
              <b className="text-sunset-gold">
                {taka(Math.min(...spotPhotographers.map((p) => Number(p.starting_price || 0))))}+
              </b>
            </p>
            <Link to="/photographers" className="chip">
              সব ফটোগ্রাফার দেখুন →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
