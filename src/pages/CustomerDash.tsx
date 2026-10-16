import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Booking, Review, Notification, Photographer, Package } from '../lib/types';
import { toBn, taka, bnDate } from '../lib/utils';
import { waLink, uploadToCloudinary } from '../lib/cloudinary';
import PhotographerCard from '../components/PhotographerCard';
import { ProfileEditSection, MigrationSection, KycSection } from '../components/ProfileSections';
import {
  CIc,
  CircleItem,
  CircleMenuGrid,
  CircleStatGrid,
  CircleSectionTitle,
  CircleAvatar,
  DetailShell,
  getInitials,
} from '../components/CircularMenu';

/* হোম = বৃত্তাকার স্ট্যাট + মেনু; বাকি সব = DetailShell-এ খোলা ডিটেইল */
type DashView = 'home' | 'bookings' | 'favorites' | 'reviews' | 'notifications' | 'profile' | 'kyc';

const VIEW_TITLE: Record<Exclude<DashView, 'home'>, string> = {
  bookings: 'আমার বুকিং',
  favorites: 'প্রিয় ফটোগ্রাফার',
  reviews: 'আমার রিভিউ',
  notifications: 'নোটিফিকেশন',
  profile: 'প্রোফাইল সেটিংস',
  kyc: 'KYC ভেরিফিকেশন',
};

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
  const { session, profile, refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState<DashView>('home');
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

  // Avatar + cover quick upload
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

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

  // ভিউ বদলালে উপরে স্ক্রল (হোম ↔ ডিটেইল)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  if (!profile) return null;

  // Stats calculation
  const totalBookings = bookings.length;
  const acceptedBookings = bookings.filter((b) => b.status === 'accepted' || b.status === 'completed').length;
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;
  const totalSpent = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + Number(b.packages?.price || 0), 0);
  const unreadNotifs = notifications.filter((n) => !n.read).length;

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

  /* বৃত্তাকার অ্যাভাটার কুইক-আপলোড → Cloudinary → profiles.avatar_url */
  const handleAvatarFile = async (file: File) => {
    if (avatarBusy) return;
    setAvatarBusy(true);
    try {
      const res = await uploadToCloudinary(file, 'piclagbe/avatars');
      if (res?.url) {
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: res.url })
          .eq('id', profile.id);
        if (!error) await refresh();
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
    } finally {
      setAvatarBusy(false);
    }
  };

  /* V25 — ফেসবুক-স্টাইল কভার ফটো আপলোড → Cloudinary → profiles.cover_url */
  const handleCoverFile = async (file: File) => {
    if (coverBusy) return;
    setCoverBusy(true);
    try {
      const res = await uploadToCloudinary(file, 'piclagbe/covers');
      if (res?.url) {
        const { error } = await supabase
          .from('profiles')
          .update({ cover_url: res.url })
          .eq('id', profile.id);
        if (!error) await refresh();
      }
    } catch (err) {
      console.error('Cover upload error:', err);
    } finally {
      setCoverBusy(false);
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

  /* ═══════════ সেকশন কনটেন্ট (আগের সব ফিচার অক্ষত) ═══════════ */

  const bookingsContent = (
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
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-sunset-gold/30 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-sunset-gradient flex items-center justify-center font-bold text-[#1A0E06] shrink-0">
                        {getInitials(photographerName, 'ফ')}
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
  );

  const favoritesContent = (
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
  );

  const reviewsContent = (
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
  );

  const notificationsContent = (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-white text-base">নোটিফিকেশনসমূহ</h3>
        {notifications.some((n) => !n.read) && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="btn-ghost !py-1.5 !px-3 !text-xs"
          >
            সব পঠিত করুন
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
  );

  /* ═══════════ স্ট্যাট + মেনু বৃত্ত ═══════════ */

  const statItems: CircleItem[] = [
    { key: 'st-bookings', label: 'বুকিং', icon: CIc.calendar(24), tint: 'gold', stat: toBn(totalBookings), onClick: () => setView('bookings') },
    { key: 'st-accepted', label: 'গৃহীত', icon: CIc.checkCircle(24), tint: 'teal', stat: toBn(acceptedBookings), onClick: () => setView('bookings') },
    { key: 'st-done', label: 'সম্পন্ন', icon: CIc.check(24), tint: 'emerald', stat: toBn(completedBookings), onClick: () => setView('bookings') },
    { key: 'st-spent', label: 'মোট খরচ', icon: CIc.wallet(24), tint: 'coral', stat: taka(totalSpent), onClick: () => setView('bookings') },
  ];

  const menuItems: CircleItem[] = [
    { key: 'bookings', label: 'আমার বুকিং', icon: CIc.calendar(), tint: 'gold', badge: bookings.length, onClick: () => setView('bookings') },
    { key: 'favorites', label: 'প্রিয়', icon: CIc.heart(), tint: 'crimson', badge: favoritePhotographers.length, onClick: () => setView('favorites') },
    { key: 'reviews', label: 'রিভিউ', icon: CIc.star(), tint: 'berry', badge: myReviews.length, onClick: () => setView('reviews') },
    { key: 'notifications', label: 'নোটিফিকেশন', icon: CIc.bell(), tint: 'teal', badge: unreadNotifs, onClick: () => setView('notifications') },
    { key: 'profile', label: 'প্রোফাইল এডিট', icon: CIc.user(), tint: 'coral', onClick: () => setView('profile') },
    ...(profile.role === 'customer'
      ? [{ key: 'migration', label: 'ফটোগ্রাফার হোন', icon: CIc.migration(), tint: 'gold' as const, onClick: () => setView('profile') }]
      : []),
    ...(profile.role === 'photographer'
      ? [
          { key: 'studio', label: 'মাই স্টুডিও', icon: CIc.studio(), tint: 'teal' as const, onClick: () => navigate('/studio') },
          { key: 'kyc', label: 'KYC', icon: CIc.shield(), tint: 'crimson' as const, onClick: () => setView('kyc') },
        ]
      : []),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-24">
      {view === 'home' ? (
        <>
          {/* ── V25 হেডার: ফেসবুক-স্টাইল কভার ফটো + উপরে বৃত্তাকার ছবি + শুভেচ্ছা (ব্ল্যাক গ্লাস কার্ড) ── */}
          <header className="glass-card overflow-hidden mb-10">
            {/* কভার ব্যানার */}
            <div className="relative h-36 sm:h-52 w-full bg-gradient-to-br from-sunset-gold/35 via-sunset-coral/30 to-sunset-crimson/35">
              {profile.cover_url ? (
                <img src={profile.cover_url} alt="কভার ফটো" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    background:
                      'radial-gradient(420px 200px at 82% 0%, rgba(251,191,36,0.32), transparent 65%), radial-gradient(380px 220px at 12% 100%, rgba(249,115,22,0.28), transparent 60%), linear-gradient(135deg, rgba(58,30,16,0.92), rgba(40,20,12,0.88))',
                  }}
                />
              )}
              {/* নিচের দিকে হালকা শেড (অ্যাভাটার সংযোগ মসৃণ করতে) */}
              <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />

              {/* কভার বদলানোর ক্যামেরা বাটন */}
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverBusy}
                aria-label="কভার ফটো আপলোড করুন"
                className="cover-cam-btn absolute bottom-3 right-3 flex items-center gap-2 rounded-full px-3.5 h-9 text-[12.5px] font-bold text-white transition-transform outline-none focus-visible:ring-2 focus-visible:ring-sunset-gold disabled:opacity-60"
              >
                {coverBusy ? (
                  <span className="block size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  <>
                    {CIc.cameraBadge(15)}
                    <span className="hidden xs:inline sm:inline">{profile.cover_url ? 'বদলান' : 'যোগ করুন'}</span>
                  </>
                )}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCoverFile(f);
                  e.target.value = '';
                }}
              />
            </div>

            {/* অ্যাভাটার কভারের উপর ওভারল্যাপ + পরিচিতি */}
            <div className="flex flex-col items-center text-center px-4 pb-6 -mt-12 relative">
              <CircleAvatar
                url={profile.avatar_url}
                initials={getInitials(profile.full_name)}
                onFile={handleAvatarFile}
                busy={avatarBusy}
                size={104}
              />
              <h1 className="mt-3 text-2xl font-extrabold text-white">
                {profile.full_name || 'গ্রাহক'}
              </h1>
              <p className="text-sm text-white/55 mt-1">
                {profile.email}
              </p>
              <span className="mt-2 rounded-full bg-sunset-gold/15 px-3 py-1 text-xs font-bold text-sunset-gold ring-1 ring-sunset-gold/30">
                {profile.role === 'photographer' ? 'ফটোগ্রাফার' : 'সাধারণ সদস্য'}
              </span>
            </div>
          </header>

          {/* Booking Success Banner */}
          {showBookedBanner && (
            <div className="bdg-accepted p-4 rounded-xl2 mb-8 w-full justify-center text-sm shadow-glass-sm">
              ✅ বুকিং পাঠানো হয়েছে! ফটোগ্রাফার গ্রহণ করলে নোটিফিকেশন পাবেন।
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              <div className="skeleton h-28 rounded-xl3 w-full" />
              <div className="skeleton h-40 rounded-xl3 w-full" />
            </div>
          ) : (
            <>
              {/* ── স্ট্যাটিস বৃত্ত ── */}
              <section aria-label="স্ট্যাটিস">
                <CircleSectionTitle>স্ট্যাটিস</CircleSectionTitle>
                <CircleStatGrid items={statItems} />
              </section>

              {/* ── মেনু বৃত্ত ── */}
              <section className="mt-9" aria-label="মেনু">
                <CircleSectionTitle>মেনু</CircleSectionTitle>
                <CircleMenuGrid items={menuItems} />
              </section>
            </>
          )}
        </>
      ) : (
        <DetailShell
          title={VIEW_TITLE[view]}
          subtitle={profile.full_name || undefined}
          onBack={() => setView('home')}
        >
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-xl3 w-full" />
              ))}
            </div>
          ) : (
            <>
              {view === 'bookings' && bookingsContent}
              {view === 'favorites' && favoritesContent}
              {view === 'reviews' && reviewsContent}
              {view === 'notifications' && notificationsContent}
              {view === 'profile' && (
                <div className="space-y-10">
                  <ProfileEditSection />
                  {profile.role === 'customer' && <MigrationSection />}
                </div>
              )}
              {view === 'kyc' && profile.role === 'photographer' && <KycSection />}
            </>
          )}
        </DetailShell>
      )}
    </div>
  );
}
