import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Booking, Review, Notification, Photographer, Package } from '../lib/types';
import { toBn, taka, bnDate } from '../lib/utils';
import { waLink } from '../lib/cloudinary';
import PhotographerCard from '../components/PhotographerCard';
import DashTabs, { TabIc } from '../components/DashTabs';
import { ProfileEditSection, MigrationSection, KycSection } from '../components/ProfileSections';

type DashTab = 'bookings' | 'favorites' | 'reviews' | 'notifications' | 'profile' | 'kyc';

type EnrichedBooking = Booking & {
  photographers?: {
    display_name?: string | null;
    profile_photo_url?: string | null;
    slug?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  } | null;
  packages?: {
    name?: string | null;
    price?: number | null;
  } | null;
};

type EnrichedReview = Review & {
  photographers?: {
    display_name?: string | null;
  } | null;
};

export default function CustomerDash() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState<DashTab>('bookings');
  const [loading, setLoading] = useState(true);

  // Data states
  const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
  const [favoritePhotographers, setFavoritePhotographers] = useState<Photographer[]>([]);
  const [myReviews, setMyReviews] = useState<EnrichedReview[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Booking action states (review form open per booking id)
  const [reviewingBookingId, setReviewingBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Success banner query check
  const showBookedBanner = searchParams.get('booked') === '1';

  useEffect(() => {
    if (!session) {
      navigate('/auth');
    }
  }, [session, navigate]);

  useEffect(() => {
    let active = true;

    async function loadDashData() {
      if (!profile?.id) return;
      setLoading(true);

      try {
        const [bookingsRes, favRes, reviewsRes, notifRes] = await Promise.all([
          supabase
            .from('bookings')
            .select('*, photographers(display_name, profile_photo_url, slug, phone, whatsapp), packages(name, price)')
            .eq('customer_id', profile.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('favorites')
            .select('photographer_id')
            .eq('user_id', profile.id),
          supabase
            .from('reviews')
            .select('*, photographers(display_name)')
            .eq('customer_id', profile.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('notifications')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false }),
        ]);

        if (!active) return;

        if (!bookingsRes.error) {
          setBookings((bookingsRes.data as EnrichedBooking[]) || []);
        }

        if (!favRes.error && favRes.data) {
          const favIds = (favRes.data as { photographer_id: string }[]).map((f) => f.photographer_id);
          if (favIds.length > 0) {
            const photRes = await supabase
              .from('photographers')
              .select('*, photographer_categories(category_id, categories(name, slug, icon))')
              .in('id', favIds);
            if (active && !photRes.error && photRes.data) {
              setFavoritePhotographers(photRes.data as Photographer[]);
            }
          } else {
            setFavoritePhotographers([]);
          }
        }

        if (!reviewsRes.error) {
          setMyReviews((reviewsRes.data as EnrichedReview[]) || []);
        }

        if (!notifRes.error) {
          setNotifications((notifRes.data as Notification[]) || []);
        }
      } catch (err) {
        if (active) {
          console.error('Customer dashboard data load error:', err);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashData();

    return () => {
      active = false;
    };
  }, [profile?.id]);

  // Auto-hide booked banner
  useEffect(() => {
    if (showBookedBanner) {
      const timer = setTimeout(() => {
        searchParams.delete('booked');
        setSearchParams(searchParams, { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showBookedBanner, searchParams, setSearchParams]);

  if (!profile) return null;

  // Stats calculation
  const totalBookings = bookings.length;
  const acceptedBookings = bookings.filter((b) => b.status === 'accepted' || b.status === 'completed').length;
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;
  const totalSpent = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + Number(b.packages?.price || 0), 0);

  const handleCancelBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (!error) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
      );
    }
  };

  const handleOpenReview = (bookingId: string) => {
    setReviewingBookingId(reviewingBookingId === bookingId ? null : bookingId);
    setReviewRating(5);
    setReviewComment('');
  };

  const handleSubmitReview = async (booking: EnrichedBooking) => {
    if (!booking.photographer_id || reviewSubmitting) return;
    setReviewSubmitting(true);

    try {
      const { error } = await supabase.from('reviews').insert({
        booking_id: booking.id,
        photographer_id: booking.photographer_id,
        customer_id: profile.id,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });

      if (!error) {
        setReviewingBookingId(null);
        // Refresh reviews
        const { data } = await supabase
          .from('reviews')
          .select('*, photographers(display_name)')
          .eq('customer_id', profile.id)
          .order('created_at', { ascending: false });
        if (data) setMyReviews(data as EnrichedReview[]);
      }
    } catch (err) {
      console.error('Review submit error:', err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleMarkAllRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile.id);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <span className="bdg-accepted">গৃহীত</span>;
      case 'completed':
        return <span className="bdg-completed">সম্পন্ন</span>;
      case 'rejected':
        return <span className="bdg-rejected">প্রত্যাখ্যাত</span>;
      case 'cancelled':
        return <span className="bdg-cancelled">বাতিল</span>;
      default:
        return <span className="bdg-pending">অপেক্ষমাণ</span>;
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name || !name.trim()) return 'ফ';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-6xl mx-auto px-6 pt-28 pb-24">
      {/* Photographer role prompt */}
      {profile.role === 'photographer' && (
        <div className="glass rounded-xl3 p-5 mb-8 flex items-center justify-between gap-4 border-sunset-gold/40">
          <div>
            <h4 className="font-bold text-white text-base">আপনি একজন ভেরিফায়েড ফটোগ্রাফার!</h4>
            <p className="text-sm text-white/60">আপনার স্টুডিও ম্যানেজমেন্ট ড্যাশবোর্ডে যেতে পারেন।</p>
          </div>
          <Link to="/studio" className="btn-primary text-sm shrink-0">
            মাই স্টুডিও →
          </Link>
        </div>
      )}

      {/* Booking Success Banner */}
      {showBookedBanner && (
        <div className="bdg-accepted p-4 rounded-xl2 mb-8 w-full justify-center text-sm shadow-glass-sm">
          ✅ বুকিং পাঠানো হয়েছে! ফটোগ্রাফার গ্রহণ করলে নোটিফিকেশন পাবেন।
        </div>
      )}

      {/* Header Greeting */}
      <div className="flex items-center gap-4 mb-8">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name || 'প্রোফাইল'}
            className="w-14 h-14 rounded-2xl ring-2 ring-sunset-gold/45 object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl ring-2 ring-sunset-gold/45 bg-sunset-gradient flex items-center justify-center text-lg font-bold text-[#1A0E06]">
            {getInitials(profile.full_name)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            স্বাগতম, {profile.full_name || 'গ্রাহক'}
          </h1>
          <p className="text-sm text-white/55 mt-0.5">
            আপনার বুকিং ও প্রিয় ফটোগ্রাফার এক জায়গায়
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-num">{toBn(totalBookings)}</div>
          <div className="stat-label">মোট বুকিং</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{toBn(acceptedBookings)}</div>
          <div className="stat-label">গৃহীত</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{toBn(completedBookings)}</div>
          <div className="stat-label">সম্পন্ন</div>
        </div>
        <div className="stat-card">
          <div className="stat-num text-lg sm:text-2xl">{taka(totalSpent)}</div>
          <div className="stat-label">মোট খরচ</div>
        </div>
      </div>

      {/* Tabs — ক্লিন আইকন ট্যাব (মোবাইলে এক লাইন স্ক্রল) */}
      <DashTabs<DashTab>
        tabs={[
          { key: 'bookings', label: 'বুকিং', icon: <TabIc.calendar />, count: bookings.length },
          { key: 'favorites', label: 'প্রিয়', icon: <TabIc.heart />, count: favoritePhotographers.length },
          { key: 'reviews', label: 'রিভিউ', icon: <TabIc.star />, count: myReviews.length },
          { key: 'notifications', label: 'নোটিফিকেশন', icon: <TabIc.bell />, count: notifications.filter((n) => !n.read).length },
          { key: 'profile', label: 'প্রোফাইল', icon: <TabIc.user /> },
          { key: 'kyc', label: 'KYC', icon: <TabIc.shield />, show: profile.role === 'photographer' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Tab Content */}
      <div className="mt-8">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-xl3 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* BOOKINGS TAB */}
            {tab === 'bookings' && (
              <div>
                {bookings.length === 0 ? (
                  <div className="glass-card p-12 text-center rounded-xl3 max-w-md mx-auto">
                    <p className="text-lg font-bold text-white mb-2">কোনো বুকিং নেই</p>
                    <p className="text-sm text-white/60 mb-6">
                      আপনার প্রথম ফটোশুট বুকিং করতে ফটোগ্রাফার ব্রাউজ করুন।
                    </p>
                    <Link to="/photographers" className="btn-primary">
                      ফটোগ্রাফার খুঁজুন
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((b) => {
                      const photographerName = b.photographers?.display_name || 'ফটোগ্রাফার';
                      const photographerPhoto = b.photographers?.profile_photo_url;
                      const photographerPhone = b.photographers?.whatsapp || b.photographers?.phone || null;
                      const waHref = waLink(photographerPhone, `আসসালামু আলাইকুম, আমার বুকিং (${bnDate(b.event_date)}) নিয়ে কথা বলতে চাই — PicLagbe`);
                      const packageName = b.packages?.name || 'কাস্টম প্যাকেজ';
                      const packagePrice = b.packages?.price || 0;
                      const isReviewOpen = reviewingBookingId === b.id;

                      return (
                        <div key={b.id} className="glass-card p-5 rounded-xl3 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              {photographerPhoto ? (
                                <img
                                  src={photographerPhoto}
                                  alt={photographerName}
                                  className="w-12 h-12 rounded-xl2 object-cover ring-1 ring-sunset-gold/30 shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl2 bg-sunset-gradient flex items-center justify-center font-bold text-[#1A0E06] shrink-0">
                                  {getInitials(photographerName)}
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-white text-base">
                                  {photographerName}
                                </h4>
                                <p className="text-xs text-white/55 mt-0.5">
                                  📦 {packageName} · 📅 {bnDate(b.event_date)} ({b.event_time})
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="price-tag">{taka(packagePrice)}</span>
                              {getStatusBadge(b.status)}
                            </div>
                          </div>

                          {/* Actions Row */}
                          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs">
                            <span className="text-white/45">স্পট: {b.event_location || 'কক্সবাজার'}</span>

                            <div className="flex items-center gap-2">
                              {photographerPhone && (
                                <>
                                  <a
                                    href={waHref || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary !py-1.5 !px-3 !text-xs !bg-emerald-500/90 hover:!bg-emerald-500"
                                    title={`WhatsApp — ${photographerName}`}
                                  >
                                    💬 WhatsApp
                                  </a>
                                  <a
                                    href={`tel:${photographerPhone.replace(/[^+\d]/g, '')}`}
                                    className="btn-ghost !py-1.5 !px-3 !text-xs"
                                    title={`কল — ${photographerPhone}`}
                                  >
                                    📞 কল
                                  </a>
                                </>
                              )}
                              {b.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelBooking(b.id)}
                                  className="btn-danger !py-1.5 !px-3 !text-xs"
                                >
                                  বাতিল করুন
                                </button>
                              )}
                              {b.status === 'completed' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReview(b.id)}
                                  className="btn-primary !py-1.5 !px-3 !text-xs"
                                >
                                  ⭐ রিভিউ দিন
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Inline Review Form */}
                          {isReviewOpen && (
                            <div className="glass rounded-xl2 p-4 mt-3 space-y-3">
                              <h5 className="font-bold text-white text-sm">আপনার অভিজ্ঞতা শেয়ার করুন</h5>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setReviewRating(star)}
                                    className="text-xl focus:outline-none"
                                  >
                                    {star <= reviewRating ? '★' : '☆'}
                                  </button>
                                ))}
                              </div>
                              <textarea
                                rows={2}
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                placeholder="ফটোগ্রাফার সম্পর্কে আপনার মতামত লিখুন…"
                                className="glass-input !text-xs resize-none"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setReviewingBookingId(null)}
                                  className="btn-ghost !py-1 !px-3 !text-xs"
                                >
                                  বাতিল
                                </button>
                                <button
                                  type="button"
                                  disabled={reviewSubmitting}
                                  onClick={() => handleSubmitReview(b)}
                                  className="btn-primary !py-1 !px-4 !text-xs"
                                >
                                  {reviewSubmitting ? 'পাঠানো হচ্ছে…' : 'রিভিউ জমা দিন'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* FAVORITES TAB */}
            {tab === 'favorites' && (
              <div>
                {favoritePhotographers.length === 0 ? (
                  <div className="glass-card p-12 text-center rounded-xl3 max-w-md mx-auto">
                    <p className="text-lg font-bold text-white mb-2">কোনো প্রিয় ফটোগ্রাফার নেই</p>
                    <p className="text-sm text-white/60 mb-6">
                      আপনার পছন্দের প্রফেশনালদের সেভ করে রাখুন।
                    </p>
                    <Link to="/photographers" className="btn-primary">
                      ফটোগ্রাফার ব্রাউজ করুন
                    </Link>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favoritePhotographers.map((p) => (
                      <PhotographerCard key={p.id} p={p} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REVIEWS TAB */}
            {tab === 'reviews' && (
              <div>
                {myReviews.length === 0 ? (
                  <div className="glass-card p-12 text-center rounded-xl3 max-w-md mx-auto">
                    <p className="text-lg font-bold text-white mb-2">কোনো রিভিউ দেওয়া হয়নি</p>
                    <p className="text-sm text-white/60">
                      সম্পন্ন হওয়া শুটগুলোর জন্য আপনার মূল্যবান রিভিউ দিন।
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myReviews.map((r) => (
                      <div key={r.id} className="glass-card p-5 rounded-xl3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-white text-sm">
                            {r.photographers?.display_name || 'ফটোগ্রাফার'}
                          </h4>
                          <span className="text-xs text-sunset-gold font-bold">
                            {toBn(r.rating)}★
                          </span>
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed">
                          {r.comment || 'কোনো মন্তব্য নেই'}
                        </p>
                        <span className="text-[12.5px] text-white/40 mt-3 block">
                          {bnDate(r.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {tab === 'notifications' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-white text-base">নোটিফিকেশনসমূহ</h3>
                  {notifications.some((n) => !n.read) && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="btn-ghost !py-1.5 !px-3 !text-xs"
                    >
                      সব পঠিত হিসেবে চিহ্নিত করুন
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="glass-card p-12 text-center rounded-xl3 max-w-md mx-auto">
                    <p className="text-lg font-bold text-white mb-1">কোনো নোটিফিকেশন নেই</p>
                    <p className="text-sm text-white/60">বুকিং আপডেট ও অফার এখানে দেখা যাবে।</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`glass-card p-4 rounded-xl2 flex gap-3 items-start ${
                          !n.read ? 'border-sunset-gold/40' : ''
                        }`}
                      >
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-sunset-gold shrink-0 mt-1.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/90 leading-relaxed">{n.message}</p>
                          <span className="text-[12.5px] text-white/45 mt-1 block">
                            {bnDate(n.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* PROFILE TAB — এডিট + (customer হলে) ফটোগ্রাফার মাইগ্রেশন */}
            {tab === 'profile' && (
              <div className="space-y-10">
                <ProfileEditSection />
                {profile.role === 'customer' && <MigrationSection />}
              </div>
            )}

            {/* KYC TAB — ফটোগ্রাফার রোল */}
            {tab === 'kyc' && profile.role === 'photographer' && <KycSection />}
          </>
        )}
      </div>
    </div>
  );
}
