import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Photographer, Package } from '../lib/types';
import { toBn, taka } from '../lib/utils';
import { SPOT_BY_KEY } from '../lib/constants';
import Reveal from '../components/Reveal';
import BookingModal from '../components/BookingModal';
import MediaReviews from '../components/MediaReviews';

export default function PhotographerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, profile } = useAuth();

  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [chatStarting, setChatStarting] = useState(false);

  const viewCountedRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!id) return;
      setLoading(true);

      try {
        const [photoRes, pkgRes] = await Promise.all([
          supabase
            .from('photographers')
            .select('*, photographer_categories(category_id, categories(name, slug, icon))')
            .eq('id', id)
            .maybeSingle(),
          supabase
            .from('packages')
            .select('*')
            .eq('photographer_id', id)
            .order('price', { ascending: true }),
        ]);

        if (!active) return;

        if (photoRes.error || !photoRes.data) {
          console.error('Photographer profile fetch error:', photoRes.error);
          setPhotographer(null);
        } else {
          const pData = photoRes.data as Photographer;
          setPhotographer(pData);

          // Increment view count once per session/mount
          if (!viewCountedRef.current) {
            viewCountedRef.current = true;
            supabase
              .from('photographers')
              .update({ profile_views: (pData.profile_views || 0) + 1 })
              .eq('id', id)
              .then(({ error }) => {
                if (error) console.error('View increment error:', error);
              });
          }
        }

        if (pkgRes.error) {
          console.error('Packages fetch error:', pkgRes.error);
        } else {
          setPackages((pkgRes.data as Package[]) || []);
        }
      } catch (err) {
        if (active) {
          console.error('Profile load error:', err);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 pt-32 pb-20">
        <div className="skeleton h-96 rounded-xl3 w-full" />
      </div>
    );
  }

  if (!photographer) {
    return (
      <div className="max-w-5xl mx-auto px-6 pt-36 pb-20 text-center">
        <div className="glass-card p-12 rounded-xl3 max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-white mb-2">ফটোগ্রাফার পাওয়া যায়নি</h2>
          <p className="text-sm text-white/60 mb-6">
            এই প্রোফাইলটি মুছে ফেলা হয়েছে অথবা ভুল লিঙ্কে প্রবেশ করেছেন।
          </p>
          <button
            type="button"
            onClick={() => navigate('/photographers')}
            className="btn-primary"
          >
            সব ফটোগ্রাফার দেখুন
          </button>
        </div>
      </div>
    );
  }

  const avgRating = Number(photographer.rating_avg || 0).toFixed(1);
  const ratingCount = Number(photographer.rating_count || 0);
  const spotObj = SPOT_BY_KEY(photographer.home_spot || '');
  const spotNameBn = spotObj?.nameBn || photographer.full_location || 'কক্সবাজার';

  const isOwnProfile = profile?.role === 'photographer' && photographer.user_id === profile?.id;

  const handleStartChat = async () => {
    if (!session) {
      navigate('/auth?mode=login');
      return;
    }
    if (!photographer || chatStarting) return;
    setChatStarting(true);
    try {
      // find existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', session.user.id)
        .eq('photographer_id', photographer.id)
        .maybeSingle();
      if (existing) {
        navigate(`/chat?c=${existing.id}`);
        return;
      }
      // create new conversation
      const { data: created, error } = await supabase
        .from('conversations')
        .insert({ customer_id: session.user.id, photographer_id: photographer.id })
        .select('id')
        .single();
      if (error || !created) {
        alert('চ্যাট শুরু করতে সমস্যা হয়েছে।');
        return;
      }
      navigate(`/chat?c=${created.id}`);
    } finally {
      setChatStarting(false);
    }
  };

  // Budget range calculation
  const prices = packages.map((pkg) => Number(pkg.price));
  const minPrice = prices.length > 0 ? Math.min(...prices) : Number(photographer.starting_price || 0);
  const maxPrice = prices.length > 0 ? Math.max(...prices) : minPrice;

  // Average hourly rate calculation
  const avgHourly =
    packages.length > 0
      ? packages.reduce(
          (acc, pkg) => acc + Number(pkg.price) / Math.max(1, Number(pkg.duration_hours || 1)),
          0
        ) / packages.length
      : Number(photographer.starting_price || 0);

  const getInitials = (name?: string | null) => {
    if (!name || !name.trim()) return 'ফ';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      {/* 1) COVER SECTION */}
      <div className="relative h-[46vh] min-h-[340px] overflow-hidden bg-twilight-900">
        {photographer.cover_photo_url ? (
          <img
            src={photographer.cover_photo_url}
            alt={photographer.display_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-sunset-soft" />
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-twilight-950 via-twilight-950/40 to-transparent pointer-events-none" />

        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-24 left-6 glass-strong rounded-full px-4 py-2 flex items-center gap-2 text-white text-sm hover:border-sunset-gold/50 transition z-20"
        >
          <span>←</span>
          <span>ফিরে যান</span>
        </button>

        {/* Floating Identity Card */}
        <div className="absolute -bottom-1 inset-x-0 z-30">
          <div className="max-w-5xl mx-auto px-6">
            <div className="glass-strong rounded-xl3 p-6 flex flex-wrap items-center gap-5 shadow-glass-lg border border-white/[0.15]">
              {/* Avatar */}
              <div className="relative shrink-0">
                {photographer.profile_photo_url ? (
                  <img
                    src={photographer.profile_photo_url}
                    alt={photographer.display_name}
                    className="w-24 h-24 rounded-2xl ring-4 ring-sunset-gold/30 object-cover bg-twilight-800"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl ring-4 ring-sunset-gold/30 bg-sunset-gradient flex items-center justify-center text-2xl font-extrabold text-[#1A0E06]">
                    {getInitials(photographer.display_name)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-white truncate">
                    {photographer.display_name}
                  </h1>
                  {photographer.verified && (
                    <span className="badge badge-verified bg-emerald-500/20 border-emerald-400/45 text-emerald-300">
                      ✓ ভেরিফায়েড
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap text-sm text-white/60 mt-1">
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {photographer.full_location || 'কক্সবাজার'}
                  </span>
                  <span>·</span>
                  <span>💎 {toBn(photographer.experience_years || 1)}+ বছর অভিজ্ঞতা</span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-white">
                    <span className="text-sunset-gold">★</span> {toBn(avgRating)} ({toBn(ratingCount)})
                  </span>
                </div>

                {/* Categories */}
                {photographer.photographer_categories && photographer.photographer_categories.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {photographer.photographer_categories.map((c, i) => {
                      const catName = c?.categories?.name;
                      if (!catName) return null;
                      return (
                        <span key={c.category_id || i} className="chip !text-xs !py-1 !px-2.5">
                          {catName}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right CTA */}
              <div className="shrink-0 text-right ml-auto flex flex-col items-end gap-2">
                <div>
                  <span className="text-xs text-white/45 mr-1">শুরু প্যাকেজ</span>
                  <div className="price-tag text-2xl">{taka(photographer.starting_price || 0)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingOpen(true)}
                  className="btn-primary px-6 py-3 text-base"
                >
                  📅 বুক করুন
                </button>
                {!isOwnProfile && (
                  <button
                    type="button"
                    onClick={handleStartChat}
                    disabled={chatStarting}
                    className="btn-ghost px-5 py-3 text-sm"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1.5 -mt-0.5">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    {chatStarting ? 'খোলা হচ্ছে…' : 'চ্যাট করুন'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2) BODY CONTENT */}
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12 mt-4">
        {/* About + Quick Facts */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="glass-card p-6 lg:col-span-2 rounded-xl3 space-y-4">
            <h3 className="text-lg font-bold text-white">নিজের সম্পর্কে</h3>
            <p className="text-white/75 leading-relaxed text-base">
              {photographer.bio || 'কক্সবাজারের সমুদ্র সৈকত ও প্রকৃতিকে ফ্রেমে বন্দি করতে আমি ভালোবাস। প্রি-ওয়েডিং, বিয়ে কিংবা ট্রাভেল শুটের জন্য আমার সাথে যোগাযোগ করতে পারেন।'}
            </p>

            {photographer.languages && photographer.languages.length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-semibold text-white/50 block mb-2">ভাষাসমূহ</span>
                <div className="flex flex-wrap gap-2">
                  {photographer.languages.split(',').map((s) => s.trim()).filter(Boolean).map((lang, idx) => (
                    <span key={idx} className="chip !text-xs">
                      🗣 {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {photographer.equipment && photographer.equipment.length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-semibold text-white/50 block mb-2">যন্ত্রপাতি ও ক্যামেরা</span>
                <div className="flex flex-wrap gap-2">
                  {photographer.equipment.split(',').map((s) => s.trim()).filter(Boolean).map((eq, idx) => (
                    <span key={idx} className="chip !text-xs">
                      🎥 {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Facts Column */}
          <div className="space-y-4">
            <div className="glass-card p-4 rounded-xl2 flex justify-between items-center">
              <span className="text-sm text-white/60">সাড়ার হার</span>
              <span className="font-bold text-white text-base">৯৫%</span>
            </div>
            <div className="glass-card p-4 rounded-xl2 flex justify-between items-center">
              <span className="text-sm text-white/60">প্রোফাইল ভিউ</span>
              <span className="font-bold text-sunset-gold text-base">
                {toBn(photographer.profile_views || 0)}
              </span>
            </div>
            <div className="glass-card p-4 rounded-xl2 flex justify-between items-center">
              <span className="text-sm text-white/60">হোম স্পট</span>
              <span className="font-bold text-white text-sm truncate max-w-[160px]" title={spotNameBn}>
                {spotNameBn}
              </span>
            </div>
          </div>
        </div>

        {/* PACKAGES & BUDGET REVIEW */}
        <div>
          <div className="mb-6">
            <h3 className="section-head text-xl">প্যাকেজ ও বাজেট রিভিউ</h3>
            <p className="section-sub mt-1">স্বচ্ছ দাম — লুকানো চার্জ নেই</p>
          </div>

          {/* Budget Summary Strip */}
          <div className="glass rounded-xl3 p-5 mb-6 flex flex-wrap gap-6 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60">বাজেট রেঞ্জ:</span>
              <span className="price-tag">
                {taka(minPrice)} – {taka(maxPrice)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60">গড় প্রতি ঘণ্টা:</span>
              <span className="price-tag">{taka(Math.round(avgHourly))}</span>
            </div>
            <div>
              {Number(avgRating) >= 4.5 ? (
                <span className="bdg-accepted">💰 দুর্দান্ত ভ্যালু</span>
              ) : (
                <span className="badge">ভ্যালু ভালো</span>
              )}
              <span className="text-xs text-white/50 ml-2">রিভিউ-ভিত্তিক মূল্যায়ন</span>
            </div>
          </div>

          {packages.length === 0 ? (
            <div className="glass-card p-8 rounded-xl3 text-center text-white/70">
              কাস্টম প্যাকেজের জন্য সরাসরি বুক করুন
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {packages.map((pkg, idx) => {
                const isPopular = idx === 0;
                return (
                  <div
                    key={pkg.id}
                    className={`glass-card p-6 rounded-xl3 flex flex-col justify-between relative ${
                      isPopular ? 'border-sunset-gold/50 shadow-sunset-glow' : ''
                    }`}
                  >
                    {isPopular && (
                      <span className="badge bg-sunset-gradient text-[#1A0E06] font-extrabold absolute top-4 right-4">
                        জনপ্রিয়
                      </span>
                    )}

                    <div>
                      <h4 className="font-bold text-white text-lg mb-1">{pkg.name}</h4>
                      <p className="text-xs text-white/60 min-h-[40px] leading-relaxed">
                        {pkg.description || 'প্রফেশনাল শুটিং ও হাই রেজুলেশন এডিটেড ছবি।'}
                      </p>

                      <div className="mt-3 flex items-baseline justify-between">
                        <span className="price-tag text-2xl">{taka(pkg.price)}</span>
                        <span className="text-xs text-white/50">⏱ {toBn(pkg.duration_hours || 0)} ঘণ্টা</span>
                      </div>
                    </div>

                    <hr className="divider-glow my-4" />

                    {pkg.features && pkg.features.length > 0 && (
                      <ul className="space-y-2 flex-1 mb-6">
                        {pkg.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2 text-sm text-white/75">
                            <span className="text-sunset-gold font-bold shrink-0">✓</span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      type="button"
                      onClick={() => setBookingOpen(true)}
                      className={isPopular ? 'btn-primary w-full justify-center' : 'btn-ghost w-full justify-center'}
                    >
                      বুক করুন
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MEDIA & REVIEWS TABS */}
        <MediaReviews photographerId={photographer.id} />

        {/* SAFETY STRIP */}
        <div className="glass rounded-xl2 p-5 flex gap-4 items-center">
          <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center shrink-0 text-xl">
            🛡️
          </div>
          <div>
            <h4 className="font-bold text-white text-base">নিরাপদ বুকিং</h4>
            <p className="text-sm text-white/60 mt-0.5 leading-relaxed">
              অগ্রিম পেমেন্ট ছাড়াই বুক করুন। ফটোগ্রাফার রিকোয়েস্ট গ্রহণ করলে তবেই কনফার্ম। কোনো সমস্যা হলে অ্যাডমিন সাপোর্ট আছে।
            </p>
          </div>
        </div>
      </div>

      {/* FIXED MOBILE CTA (lg:hidden) */}
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden glass-strong border-t border-white/10 p-4 flex items-center justify-between gap-4">
        <div>
          <span className="text-[11px] text-white/45 block">শুরু প্যাকেজ</span>
          <span className="price-tag text-lg">{taka(photographer.starting_price || 0)}</span>
        </div>
        <div className="flex items-center gap-3 flex-1">
          <button
            type="button"
            onClick={handleStartChat}
            disabled={chatStarting}
            aria-label="ফটোগ্রাফারের সাথে চ্যাট করুন"
            className="btn-ghost justify-center py-3 px-4 shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setBookingOpen(true)}
            className="btn-primary flex-1 justify-center py-3 text-base"
          >
            📅 বুক করুন
          </button>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        p={photographer}
        packages={packages}
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
      />
    </div>
  );
}
