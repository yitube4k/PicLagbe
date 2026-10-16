import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Photographer, Booking, Package, PortfolioImage, Review, Post } from '../lib/types';
import { toBn, taka, bnDate } from '../lib/utils';
import { COX_SPOTS } from '../lib/constants';
import CldUploadField from '../components/CldUploadField';
import ScheduleTab from '../components/ScheduleTab';
import PostCard from '../components/PostCard';
import PostComposer from '../components/PostComposer';
import { waLink } from '../lib/cloudinary';
import DashTabs, { TabIc } from '../components/DashTabs';

type StudioTab = 'overview' | 'bookings' | 'schedule' | 'posts' | 'packages' | 'portfolio' | 'profile' | 'verification';

type StudioBooking = Booking & {
  profiles?: {
    full_name?: string | null;
    avatar_url?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  } | null;
  packages?: {
    name?: string | null;
    price?: number | null;
  } | null;
};

interface KycSubmission {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  nid_front_url: string;
  nid_back_url: string | null;
  selfie_url: string;
  phone: string;
  note: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export default function StudioDash() {
  const { session, profile } = useAuth();
  const useNavigateInstance = useNavigate();

  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [tab, setTab] = useState<StudioTab>('overview');
  const [loading, setLoading] = useState(true);

  // Tab data states
  const [bookings, setBookings] = useState<StudioBooking[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioImage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Posts tab state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Package edit/add form state
  const [pkgEditingId, setPkgEditingId] = useState<string | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgPrice, setPkgPrice] = useState('');
  const [pkgDuration, setPkgDuration] = useState('');
  const [pkgFeatures, setPkgFeatures] = useState('');
  const [isAddingPkg, setIsAddingPkg] = useState(false);

  // Portfolio add form state
  const [portUrl, setPortUrl] = useState('');
  const [portCaption, setPortCaption] = useState('');
  const [portType, setPortType] = useState<'photo' | 'video' | 'demo'>('photo');

  // Profile edit form state
  const [profName, setProfName] = useState('');
  const [profBio, setProfBio] = useState('');
  const [profLocation, setProfLocation] = useState('');
  const [profSpot, setProfSpot] = useState('');
  const [profExp, setProfExp] = useState(1);
  const [profPrice, setProfPrice] = useState(1000);
  const [profAvatar, setProfAvatar] = useState('');
  const [profCover, setProfCover] = useState('');
  const [profPhone, setProfPhone] = useState('');
  const [profAreas, setProfAreas] = useState('');
  const [profSaving, setProfSaving] = useState(false);

  // KYC verification form state
  const [kycSub, setKycSub] = useState<KycSubmission | null>(null);
  const [kycNidFront, setKycNidFront] = useState('');
  const [kycNidBack, setKycNidBack] = useState('');
  const [kycSelfie, setKycSelfie] = useState('');
  const [kycPhone, setKycPhone] = useState('');
  const [kycNote, setKycNote] = useState('');
  const [kycSubmitting, setKycSubmitting] = useState(false);

  useEffect(() => {
    if (!session) {
      useNavigateInstance('/auth');
      return;
    }

    let active = true;

    async function loadStudioData() {
      setLoading(true);
      try {
        const { data: photoData, error: photoError } = await supabase
          .from('photographers')
          .select('*')
          .eq('user_id', session!.user.id)
          .maybeSingle();

        if (!active) return;

        if (photoError || !photoData) {
          setPhotographer(null);
          setLoading(false);
          return;
        }

        const p = photoData as Photographer;
        setPhotographer(p);

        // Populate profile form states
        setProfName(p.display_name || '');
        setProfBio(p.bio || '');
        setProfLocation(p.full_location || '');
        setProfSpot(p.home_spot || 'laboni');
        setProfExp(p.experience_years || 1);
        setProfPrice(p.starting_price || 1000);
        setProfAvatar(p.profile_photo_url || '');
        setProfCover(p.cover_photo_url || '');
        setProfPhone(p.phone || '');
        setProfAreas(p.service_areas || '');

        // Fetch bookings, packages, portfolio, reviews, kyc in parallel
        const [bRes, pkgRes, portRes, revRes, kycRes] = await Promise.all([
          supabase
            .from('bookings')
            .select('*, profiles!bookings_customer_id_fkey(full_name, avatar_url, phone, whatsapp), packages(name, price)')
            .eq('photographer_id', p.id)
            .order('created_at', { ascending: false }),
          supabase.from('packages').select('*').eq('photographer_id', p.id).order('price'),
          supabase.from('portfolio_images').select('*').eq('photographer_id', p.id).order('sort_order'),
          supabase.from('reviews').select('*').eq('photographer_id', p.id).order('created_at', { ascending: false }),
          supabase.from('kyc_submissions').select('*').eq('photographer_id', p.id).maybeSingle(),
        ]);

        if (!active) return;

        if (!bRes.error) setBookings((bRes.data as StudioBooking[]) || []);
        if (!pkgRes.error) setPackages((pkgRes.data as Package[]) || []);
        if (!portRes.error) setPortfolio((portRes.data as PortfolioImage[]) || []);
        if (!revRes.error) setReviews((revRes.data as Review[]) || []);
        if (!kycRes.error && kycRes.data) {
          const k = kycRes.data as KycSubmission;
          setKycSub(k);
          setKycNidFront(k.nid_front_url || '');
          setKycNidBack(k.nid_back_url || '');
          setKycSelfie(k.selfie_url || '');
          setKycPhone(k.phone || '');
          setKycNote(k.note || '');
        }
      } catch (err) {
        if (active) console.error('Studio load error:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadStudioData();

    return () => {
      active = false;
    };
  }, [session, useNavigateInstance]);

  /* ── Posts: নিজের সব পোস্ট (সব স্টেটাস) ── */
  const loadPosts = async (phId: string) => {
    setPostsLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('photographer_id', phId)
      .order('created_at', { ascending: false });
    if (data) setPosts(data as Post[]);
    setPostsLoading(false);
  };

  useEffect(() => {
    if (photographer?.id) loadPosts(photographer.id);
    else setPostsLoading(false);
  }, [photographer?.id]);

  const handleDeletePost = async (p: Post) => {
    if (!window.confirm(`"${p.title}" পোস্টটি মুছে ফেলবেন?`)) return;
    const { error } = await supabase.from('posts').delete().eq('id', p.id);
    if (!error && photographer?.id) loadPosts(photographer.id);
  };

  const handleRefreshStudio = async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from('photographers')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (data) {
      setPhotographer(data as Photographer);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 pt-32 pb-20">
        <div className="skeleton h-96 rounded-xl3 w-full" />
      </div>
    );
  }

  // Onboarding / Studio not created yet
  if (!photographer) {
    return (
      <div className="max-w-xl mx-auto px-6 pt-36 pb-20 text-center">
        <div className="glass-card p-12 rounded-xl3 space-y-4">
          <h2 className="text-2xl font-bold text-white">🎬 আপনার স্টুডিও এখনো খোলা হয়নি</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            আপনার অ্যাকাউন্টটি ফটোগ্রাফার হিসেবে নিবন্ধিত নয় অথবা অ্যাডমিন অ্যাপ্রুভালের অপেক্ষায় রয়েছে।
          </p>
          <button type="button" onClick={handleRefreshStudio} className="btn-primary">
            রিফ্রেশ করুন
          </button>
        </div>
      </div>
    );
  }

  // Pending approval banner
  const isPending = photographer.profile_status === 'pending';

  // Stats calculation
  const totalBookings = bookings.length;
  const acceptedBookings = bookings.filter((b) => b.status === 'accepted' || b.status === 'completed').length;
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;
  const totalEarnings = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + Number(b.packages?.price || photographer.starting_price || 0), 0);

  // Booking status update handler
  const handleUpdateBookingStatus = async (bookingId: string, newStatus: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed') => {
    if (newStatus === 'rejected' || newStatus === 'cancelled') {
      if (!window.confirm('আপনি কি নিশ্চিত যে রিকোয়েস্টটি বাতিল/প্রত্যাখ্যান করতে চান?')) return;
    }

    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (!error) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
    }
  };

  // Package handlers
  const handleStartEditPkg = (pkg: Package) => {
    setPkgEditingId(pkg.id);
    setPkgName(pkg.name);
    setPkgDesc(pkg.description || '');
    setPkgPrice(String(pkg.price));
    setPkgDuration(String(pkg.duration_hours || 2));
    setPkgFeatures(pkg.features ? pkg.features.join(', ') : '');
    setIsAddingPkg(false);
  };

  const handleStartAddPkg = () => {
    setPkgEditingId(null);
    setPkgName('');
    setPkgDesc('');
    setPkgPrice('');
    setPkgDuration('2');
    setPkgFeatures('');
    setIsAddingPkg(true);
  };

  const handleSavePkg = async (e: React.FormEvent) => {
    e.preventDefault();
    const featuresArr = pkgFeatures
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    const payload = {
      photographer_id: photographer.id,
      name: pkgName.trim(),
      description: pkgDesc.trim() || null,
      price: Number(pkgPrice) || 0,
      duration_hours: Number(pkgDuration) || 2,
      features: featuresArr,
    };

    if (isAddingPkg) {
      const { data, error } = await supabase
        .from('packages')
        .insert(payload)
        .select()
        .single();
      if (!error && data) {
        setPackages((prev) => [...prev, data as Package]);
        setIsAddingPkg(false);
      }
    } else if (pkgEditingId) {
      const { error } = await supabase
        .from('packages')
        .update(payload)
        .eq('id', pkgEditingId);
      if (!error) {
        setPackages((prev) =>
          prev.map((p) => (p.id === pkgEditingId ? { ...p, ...payload } : p))
        );
        setPkgEditingId(null);
      }
    }
  };

  const handleDeletePkg = async (pkgId: string) => {
    if (!window.confirm('এই প্যাকেজটি ডিলিট করতে চান?')) return;
    const { error } = await supabase.from('packages').delete().eq('id', pkgId);
    if (!error) {
      setPackages((prev) => prev.filter((p) => p.id !== pkgId));
    }
  };

  // Portfolio handlers
  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portUrl.trim()) return;

    let finalCaption = portCaption.trim();
    if (portType === 'video') {
      finalCaption = `video: ${finalCaption}`;
    } else if (portType === 'demo') {
      finalCaption = `demo: ${finalCaption}`;
    }

    const nextOrder = portfolio.length + 1;

    const { data, error } = await supabase
      .from('portfolio_images')
      .insert({
        photographer_id: photographer.id,
        url: portUrl.trim(),
        caption: finalCaption || null,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (!error && data) {
      setPortfolio((prev) => [...prev, data as PortfolioImage]);
      setPortUrl('');
      setPortCaption('');
      setPortType('photo');
    }
  };

  const handleDeletePortfolio = async (imgId: string) => {
    if (!window.confirm('এই ছবিটি ডিলিট করতে চান?')) return;
    const { error } = await supabase.from('portfolio_images').delete().eq('id', imgId);
    if (!error) {
      setPortfolio((prev) => prev.filter((item) => item.id !== imgId));
    }
  };

  // Profile save handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfSaving(true);

    const payload = {
      display_name: profName.trim(),
      bio: profBio.trim() || null,
      full_location: profLocation.trim() || null,
      home_spot: profSpot || null,
      experience_years: Number(profExp) || 1,
      starting_price: Number(profPrice) || 1000,
      profile_photo_url: profAvatar.trim() || null,
      cover_photo_url: profCover.trim() || null,
      phone: profPhone.trim() || null,
      service_areas: profAreas.trim() || null,
    };

    const { error } = await supabase
      .from('photographers')
      .update(payload)
      .eq('id', photographer.id);

    if (!error) {
      setPhotographer((prev) => (prev ? { ...prev, ...payload } : prev));
      alert('প্রোফাইল সফলভাবে আপডেট করা হয়েছে!');
    } else {
      alert('আপডেট করতে সমস্যা হয়েছে।');
    }
    setProfSaving(false);
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycNidFront.trim() || !kycSelfie.trim() || !kycPhone.trim()) {
      alert('দয়া করে এনআইডি ফ্রন্ট, সেলফি এবং ফোন নম্বর দিন।');
      return;
    }
    if (!photographer) return;
    setKycSubmitting(true);

    try {
      const payload = {
        photographer_id: photographer.id,
        status: 'pending' as const,
        nid_front_url: kycNidFront.trim(),
        nid_back_url: kycNidBack.trim() || null,
        selfie_url: kycSelfie.trim(),
        phone: kycPhone.trim(),
        note: kycNote.trim() || null,
      };

      const { data, error } = await supabase
        .from('kyc_submissions')
        .upsert(payload, { onConflict: 'photographer_id' })
        .select()
        .single();

      if (error) {
        alert('KYC সাবমিশন জমা দিতে সমস্যা হয়েছে।');
      } else if (data) {
        setKycSub(data as KycSubmission);
        alert('KYC সফলভাবে জমা দেওয়া হয়েছে! অ্যাডমিন যাচাই করার পর ভেরিফায়েড ব্যাজ পাবেন।');
      }
    } catch (err) {
      console.error('KYC submit error:', err);
      alert('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন।');
    } finally {
      setKycSubmitting(false);
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
    <div className="max-w-6xl mx-auto px-6 pt-28 pb-24 space-y-8">
      {/* Pending Approval Banner */}
      {isPending && (
        <div className="bdg-pending p-4 rounded-xl2 w-full justify-center text-sm shadow-glass-sm">
          ⏳ প্রোফাইল অ্যাপ্রুভালের অপেক্ষায় — অ্যাডমিন যাচাই করছেন
        </div>
      )}

      {/* Header Cover & Profile Bar */}
      <div className="glass rounded-xl3 overflow-hidden shadow-glass-lg border border-white/[0.12]">
        <div className="relative h-32 sm:h-40 w-full bg-twilight-800">
          {photographer.cover_photo_url ? (
            <img src={photographer.cover_photo_url} alt="কভার" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-sunset-soft" />
          )}
        </div>

        <div className="p-6 pt-0 relative flex flex-wrap items-end justify-between gap-4 -mt-10">
          <div className="flex items-end gap-4">
            {photographer.profile_photo_url ? (
              <img
                src={photographer.profile_photo_url}
                alt={photographer.display_name}
                className="w-20 h-20 rounded-2xl ring-4 ring-twilight-900 object-cover bg-twilight-800 shadow-glass-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl ring-4 ring-twilight-900 bg-sunset-gradient flex items-center justify-center text-xl font-extrabold text-[#1A0E06] shadow-glass-md">
                {getInitials(photographer.display_name)}
              </div>
            )}
            <div className="mb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  {photographer.display_name}
                </h1>
                {photographer.verified && (
                  <span className="badge badge-verified bg-emerald-500/20 text-emerald-300">
                    ✓ ভেরিফায়েড
                  </span>
                )}
              </div>
              <p className="text-xs text-white/55 mt-0.5">
                স্টুডিও ড্যাশবোর্ড · {photographer.full_location || 'কক্সবাজার'}
              </p>
            </div>
          </div>

          <div>{getStatusBadge(photographer.profile_status || 'pending')}</div>
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
          <div className="stat-num text-lg sm:text-2xl price-tag">{taka(totalEarnings)}</div>
          <div className="stat-label">মোট আয়</div>
        </div>
      </div>

      {/* Extra Info Row */}
      <div className="flex flex-wrap gap-4 text-xs text-white/60 px-2">
        <span>⭐ গড় রেটিং: <strong className="text-white">{toBn(Number(photographer.rating_avg || 0).toFixed(1))}</strong></span>
        <span>·</span>
        <span>👁️ প্রোফাইল ভিউ: <strong className="text-white">{toBn(photographer.profile_views || 0)}</strong></span>
        <span>·</span>
        <span>💬 রিভিউ সংখ্যা: <strong className="text-white">{toBn(photographer.rating_count || 0)}</strong></span>
      </div>

      {/* Tabs — ক্লিন আইকন ট্যাব (মোবাইলে এক লাইন স্ক্রল) */}
      <DashTabs<StudioTab>
        tabs={[
          { key: 'overview', label: 'ওভারভিউ', icon: <TabIc.grid /> },
          { key: 'bookings', label: 'বুকিং', icon: <TabIc.calendar />, count: bookings.length },
          { key: 'schedule', label: 'সময়সূচি', icon: <TabIc.clock /> },
          { key: 'posts', label: 'পোস্ট', icon: <TabIc.image />, count: posts.length },
          { key: 'packages', label: 'প্যাকেজ', icon: <TabIc.tag />, count: packages.length },
          { key: 'portfolio', label: 'পোর্টফোলিও', icon: <TabIc.camera />, count: portfolio.length },
          { key: 'profile', label: 'প্রোফাইল', icon: <TabIc.user /> },
          kycSub?.status === 'approved'
            ? { key: 'verification', label: 'ভেরিফায়েড', icon: <TabIc.check />, tone: 'gold' as const }
            : { key: 'verification', label: 'ভেরিফিকেশন', icon: <TabIc.shield /> },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Tab Content */}
      <div>
        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-8">
            {/* Tips Card */}
            <div className="glass rounded-xl2 p-5 flex gap-4 items-center">
              <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center text-xl shrink-0 text-sunset-gold">
                💡
              </div>
              <div>
                <h4 className="font-bold text-white text-base">স্টুডিও টিপস</h4>
                <p className="text-sm text-white/65 mt-0.5 leading-relaxed">
                  কক্সবাজারে সক্রিয় থাকুন — প্রতিদিন সকাল ৯টা-১১টা সবচেয়ে বেশি সার্চ হয়। রিকোয়েস্ট দ্রুত গ্রহণ করুন।
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Bookings */}
              <div className="glass-card p-6 rounded-xl3 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">সাম্প্রতিক বুকিং</h3>
                  <button
                    type="button"
                    onClick={() => setTab('bookings')}
                    className="text-xs text-sunset-gold hover:underline"
                  >
                    সব দেখুন →
                  </button>
                </div>

                {bookings.length === 0 ? (
                  <p className="text-sm text-white/50 py-4 text-center">কোনো বুকিং নেই</p>
                ) : (
                  <div className="space-y-3">
                    {bookings.slice(0, 5).map((b) => (
                      <div key={b.id} className="glass p-3 rounded-xl2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-semibold text-white text-sm truncate block">
                            {b.profiles?.full_name || 'গ্রাহক'}
                          </span>
                          <span className="text-xs text-white/50 truncate block">
                            {b.packages?.name || 'কাস্টম'} · {bnDate(b.event_date)}
                          </span>
                        </div>
                        {getStatusBadge(b.status)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Latest Reviews */}
              <div className="glass-card p-6 rounded-xl3 space-y-4">
                <h3 className="font-bold text-white text-base">সর্বশেষ রিভিউ</h3>
                {reviews.length === 0 ? (
                  <p className="text-sm text-white/50 py-4 text-center">কোনো রিভিউ নেই</p>
                ) : (
                  <div className="space-y-3">
                    {reviews.slice(0, 3).map((r) => (
                      <div key={r.id} className="glass p-3 rounded-xl2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-white">গ্রাহক</span>
                          <span className="text-sunset-gold font-bold">{toBn(r.rating)}★</span>
                        </div>
                        <p className="text-xs text-white/70 line-clamp-2">{r.comment || 'মৌখিক ভালো রিভিউ'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SCHEDULE TAB — ক্যালেন্ডার + টাইম-স্লট + নোট */}
        {tab === 'schedule' && (
          <ScheduleTab photographerId={photographer.id} bookings={bookings} />
        )}

        {/* POSTS TAB — কাজের পোস্ট (ছবি/ভিডিও + বিবরণ + দাম), অ্যাডমিন অনুমোদিত হলে প্রোফাইলে দেখা যাবে */}
        {tab === 'posts' && (
          <div className="space-y-6">
            {composerOpen ? (
              <PostComposer
                photographerId={photographer.id}
                editing={editingPost}
                onDone={(kind) => {
                  setComposerOpen(false);
                  setEditingPost(null);
                  if (photographer?.id) loadPosts(photographer.id);
                  // eslint-disable-next-line no-console
                  console.info(kind === 'created' ? 'পোস্ট তৈরি হয়েছে' : 'পোস্ট আপডেট হয়েছে');
                }}
                onCancel={() => {
                  setComposerOpen(false);
                  setEditingPost(null);
                }}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white text-lg">আমার কাজের পোস্ট</h3>
                    <p className="text-xs text-white/55 mt-0.5">
                      ছবি/ভিডিও দিয়ে কাজের বিবরণ ও দাম পোস্ট করুন — অ্যাডমিন অনুমোদনের পর প্রোফাইলে প্রকাশ হবে।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setEditingPost(null); setComposerOpen(true); }}
                    className="btn-primary text-sm"
                  >
                    ＋ নতুন পোস্ট
                  </button>
                </div>

                {postsLoading ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="skeleton h-72 rounded-xl3" />
                    ))}
                  </div>
                ) : posts.length === 0 ? (
                  <div className="glass-card rounded-xl3 p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl glass mx-auto flex items-center justify-center mb-4 text-2xl">🖼</div>
                    <p className="font-semibold text-white/85">এখনও কোনো পোস্ট নেই</p>
                    <p className="text-sm text-white/55 mt-1 mb-6">
                      আপনার সেরা কাজের ছবি/ভিডিও দিয়ে প্রথম পোস্টটি করুন।
                    </p>
                    <button
                      type="button"
                      onClick={() => { setEditingPost(null); setComposerOpen(true); }}
                      className="btn-primary text-sm"
                    >
                      ＋ প্রথম পোস্ট করুন
                    </button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {posts.map((p) => (
                      <PostCard
                        key={p.id}
                        post={p}
                        showStatus
                        onEdit={
                          p.status === 'pending' || p.status === 'rejected'
                            ? (pp) => { setEditingPost(pp); setComposerOpen(true); }
                            : undefined
                        }
                        onDelete={handleDeletePost}
                      />
                    ))}
                  </div>
                )}

                {/* নোট: অ্যাপ্রুভড পোস্ট এডিট করা যায় না */}
                {posts.some((p) => p.status === 'approved') && (
                  <p className="text-[12.5px] text-white/45 px-1">
                    ℹ️ অনুমোদিত পোস্ট এডিট করা যায় না — বদলাতে চাইলে ডিলিট করে নতুন পোস্ট দিন।
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* BOOKINGS TAB */}
        {tab === 'bookings' && (
          <div className="space-y-4">
            <h3 className="font-bold text-white text-lg mb-2">সকল বুকিং রিকোয়েস্ট</h3>
            {bookings.length === 0 ? (
              <div className="glass-card p-12 text-center rounded-xl3">
                <p className="text-white/60">কোনো বুকিং রিকোয়েস্ট পাওয়া যায়নি।</p>
              </div>
            ) : (
              bookings.map((b) => {
                const customerName = b.profiles?.full_name || 'গ্রাহক';
                const customerAvatar = b.profiles?.avatar_url;
                const pkgName = b.packages?.name || 'কাস্টম প্যাকেজ';
                const pkgPrice = b.packages?.price || 0;

                return (
                  <div key={b.id} className="glass-card p-5 rounded-xl3 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        {customerAvatar ? (
                          <img
                            src={customerAvatar}
                            alt={customerName}
                            className="w-12 h-12 rounded-xl2 object-cover ring-1 ring-sunset-gold/30 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl2 bg-sunset-gradient flex items-center justify-center font-bold text-[#1A0E06] shrink-0">
                            {getInitials(customerName)}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-white text-base">{customerName}</h4>
                          <p className="text-xs text-white/55 mt-0.5">
                            📦 {pkgName} · 📅 {bnDate(b.event_date)} ({b.event_time}) · 📍 {b.event_location || 'লাবণী পয়েন্ট'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="price-tag">{taka(pkgPrice)}</span>
                        {getStatusBadge(b.status)}
                      </div>
                    </div>

                    {b.notes && (
                      <p className="text-sm italic text-white/65 bg-white/[0.03] p-3 rounded-xl2">
                        “{b.notes}”
                      </p>
                    )}

                    {/* Customer contact — ডিল কোঅর্ডিনেশন */}
                    {(b.profiles?.whatsapp || b.profiles?.phone) && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-white/50">📱 গ্রাহক:</span>
                        <span className="text-white/85 font-semibold tabular-nums" dir="ltr">
                          {b.profiles?.whatsapp || b.profiles?.phone}
                        </span>
                        <a
                          href={waLink(b.profiles?.whatsapp || b.profiles?.phone, `আসসালামু আলাইকুম, আপনার বুকিং (${bnDate(b.event_date)}) নিয়ে কথা বলছি — PicLagbe`) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary !py-1.5 !px-3 !text-xs !bg-emerald-500/90 hover:!bg-emerald-500"
                        >
                          💬 WhatsApp
                        </a>
                        <a
                          href={`tel:${(b.profiles?.whatsapp || b.profiles?.phone || '').replace(/[^+\d]/g, '')}`}
                          className="btn-ghost !py-1.5 !px-3 !text-xs"
                        >
                          📞 কল
                        </a>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                      {b.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateBookingStatus(b.id, 'rejected')}
                            className="btn-danger !py-1.5 !px-3 !text-xs"
                          >
                            প্রত্যাখ্যান
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateBookingStatus(b.id, 'accepted')}
                            className="btn-primary !py-1.5 !px-4 !text-xs"
                          >
                            গ্রহণ করুন
                          </button>
                        </>
                      )}
                      {b.status === 'accepted' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateBookingStatus(b.id, 'cancelled')}
                            className="btn-ghost !py-1.5 !px-3 !text-xs"
                          >
                            বাতিল
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateBookingStatus(b.id, 'completed')}
                            className="btn-primary !py-1.5 !px-4 !text-xs"
                          >
                            সম্পন্ন করুন
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* PACKAGES TAB */}
        {tab === 'packages' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-lg">আপনার প্যাকেজসমূহ</h3>
              <button type="button" onClick={handleStartAddPkg} className="btn-primary text-sm">
                + নতুন প্যাকেজ যোগ করুন
              </button>
            </div>

            {/* Add/Edit Form Modal or Inline Box */}
            {(isAddingPkg || pkgEditingId) && (
              <form onSubmit={handleSavePkg} className="glass-card p-6 rounded-xl3 space-y-4 border-sunset-gold/50">
                <h4 className="font-bold text-white text-base">
                  {isAddingPkg ? 'নতুন প্যাকেজ তৈরি' : 'প্যাকেজ এডিট করুন'}
                </h4>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">প্যাকেজের নাম</label>
                    <input
                      type="text"
                      required
                      value={pkgName}
                      onChange={(e) => setPkgName(e.target.value)}
                      placeholder="যেমন: গোল্ডেন আওয়ার শ্যুট"
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">মূল্য (৳)</label>
                    <input
                      type="number"
                      required
                      value={pkgPrice}
                      onChange={(e) => setPkgPrice(e.target.value)}
                      placeholder="যেমন: ৩০০০"
                      className="glass-input"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">সময়কাল (ঘণ্টা)</label>
                    <input
                      type="number"
                      value={pkgDuration}
                      onChange={(e) => setPkgDuration(e.target.value)}
                      placeholder="যেমন: ২"
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">বৈশিষ্ট্যসমূহ (কমা দিয়ে আলাদা করুন)</label>
                    <input
                      type="text"
                      value={pkgFeatures}
                      onChange={(e) => setPkgFeatures(e.target.value)}
                      placeholder="৫০+ এডিটেড ছবি, ড্রোন শ্যুট"
                      className="glass-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">বিবরণ</label>
                  <textarea
                    rows={2}
                    value={pkgDesc}
                    onChange={(e) => setPkgDesc(e.target.value)}
                    placeholder="প্যাকেজের সংক্ষিপ্ত বিবরণ..."
                    className="glass-input resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingPkg(false);
                      setPkgEditingId(null);
                    }}
                    className="btn-ghost !py-2 !px-4 !text-xs"
                  >
                    বাতিল
                  </button>
                  <button type="submit" className="btn-primary !py-2 !px-5 !text-xs">
                    সংরক্ষণ করুন
                  </button>
                </div>
              </form>
            )}

            {/* Packages List */}
            <div className="grid md:grid-cols-2 gap-5">
              {packages.map((pkg) => (
                <div key={pkg.id} className="glass-card p-6 rounded-xl3 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h4 className="font-bold text-white text-base">{pkg.name}</h4>
                      <span className="price-tag text-xl">{taka(pkg.price)}</span>
                    </div>
                    <p className="text-xs text-white/60 mb-3">{pkg.description || 'বিবরণ নেই'}</p>
                    <span className="text-[12.5px] text-white/50 block mb-3">
                      ⏱ {toBn(pkg.duration_hours || 2)} ঘণ্টা
                    </span>
                    {pkg.features && pkg.features.length > 0 && (
                      <ul className="space-y-1 mb-4 text-xs text-white/75">
                        {pkg.features.map((f, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-sunset-gold">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => handleDeletePkg(pkg.id)}
                      className="btn-danger !py-1 !px-3 !text-xs"
                    >
                      ডিলিট
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEditPkg(pkg)}
                      className="btn-ghost !py-1 !px-3 !text-xs"
                    >
                      এডিট
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PORTFOLIO TAB */}
        {tab === 'portfolio' && (
          <div className="space-y-6">
            <h3 className="font-bold text-white text-lg">পোর্টফোলিও ম্যানেজমেন্ট</h3>

            {/* Add Portfolio Form — Cloudinary hosting (f_auto → WebP) */}
            <form onSubmit={handleAddPortfolio} className="glass-card p-5 rounded-xl3 space-y-4">
              <h4 className="font-bold text-white text-sm">নতুন কাজ বা ছবি যোগ করুন</h4>
              <p className="text-[12.5px] text-white/50 -mt-2">
                ফাইল আপলোড করলে Cloudinary-তে হোস্ট হবে — স্বয়ংক্রিয়ভাবে WebP-তে কনভার্ট হয়ে মোবাইলে দ্রুত লোড হবে।
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <CldUploadField
                  label="ছবি / ভিডিও (Cloudinary আপলোড বা লিংক)"
                  value={portUrl}
                  onChange={setPortUrl}
                  accept="both"
                  folder="piclagbe/portfolio"
                  placeholder="https://… (Cloudinary / Imgur / যেকোনো লিংক)"
                  onUploaded={(rt) => {
                    if (rt === 'video' && portType === 'photo') setPortType('video');
                  }}
                />
                <div className="space-y-3">
                  <div>
                    <label className="field-label">ধরন</label>
                    <select
                      value={portType}
                      onChange={(e) => setPortType(e.target.value as 'photo' | 'video' | 'demo')}
                      className="glass-select"
                    >
                      <option value="photo">ছবি (Photo)</option>
                      <option value="video">ভিডিও (Video)</option>
                      <option value="demo">ডেমো শুট (Demo)</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">ক্যাপশন</label>
                    <input
                      type="text"
                      value={portCaption}
                      onChange={(e) => setPortCaption(e.target.value)}
                      placeholder="যেমন: লাবণী পয়েন্ট সানসেট"
                      className="glass-input"
                    />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={!portUrl.trim()} className="btn-primary w-full justify-center sm:w-auto">
                যোগ করুন
              </button>
            </form>

            {/* Portfolio Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {portfolio.map((item) => {
                const cap = item.caption || '';
                let typeBadge = 'ছবি';
                if (cap.toLowerCase().startsWith('video:')) typeBadge = 'ভিডিও';
                else if (cap.toLowerCase().startsWith('demo:')) typeBadge = 'ডেমো';

                return (
                  <div key={item.id} className="glass-card overflow-hidden rounded-xl3 relative group">
                    <button
                      type="button"
                      onClick={() => handleDeletePortfolio(item.id)}
                      aria-label="ছবি ডিলিট করুন"
                      className="absolute top-3 right-3 z-10 glass rounded-full w-7 h-7 flex items-center justify-center text-white/80 hover:text-rose-400"
                    >
                      ✕
                    </button>

                    <div className="h-40 w-full bg-twilight-800 overflow-hidden relative">
                      <img
                        src={item.url}
                        alt="পোর্টফোলিও"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    <div className="p-3 flex items-center justify-between text-xs">
                      <span className="text-white/80 truncate">{cap.replace(/^(video|demo):\s*/i, '') || 'কক্সবাজার শ্যুট'}</span>
                      <span className="badge bg-sunset-soft text-sunset-gold border-sunset-gold/30 shrink-0">
                        {typeBadge}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {tab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="glass-card p-6 sm:p-8 rounded-xl3 space-y-5 max-w-3xl mx-auto">
            <h3 className="font-bold text-white text-xl">প্রোফাইল সেটিংস</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">ডিসপ্লে নাম</label>
                <input
                  type="text"
                  required
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="field-label">শুরু প্যাকেজ মূল্য (৳)</label>
                <input
                  type="number"
                  required
                  value={profPrice}
                  onChange={(e) => setProfPrice(Number(e.target.value))}
                  className="glass-input"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">হোম স্পট</label>
                <select
                  value={profSpot}
                  onChange={(e) => setProfSpot(e.target.value)}
                  className="glass-select"
                >
                  {COX_SPOTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.nameBn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">অভিজ্ঞতা (বছর)</label>
                <input
                  type="number"
                  value={profExp}
                  onChange={(e) => setProfExp(Number(e.target.value))}
                  className="glass-input"
                />
              </div>
            </div>

            <div>
              <label className="field-label">লোকেশন বিবরণ</label>
              <input
                type="text"
                value={profLocation}
                onChange={(e) => setProfLocation(e.target.value)}
                placeholder="যেমন: কলাতলী বিচ, কক্সবাজার"
                className="glass-input"
              />
            </div>

            <div>
              <label className="field-label">বায়ো / নিজের সম্পর্কে</label>
              <textarea
                rows={3}
                value={profBio}
                onChange={(e) => setProfBio(e.target.value)}
                className="glass-input resize-none"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <CldUploadField
                label="প্রোফাইল ছবি (Cloudinary আপলোড বা লিংক)"
                value={profAvatar}
                onChange={setProfAvatar}
                accept="image"
                folder="piclagbe/avatars"
              />
              <CldUploadField
                label="কভার ছবি (Cloudinary আপলোড বা লিংক)"
                value={profCover}
                onChange={setProfCover}
                accept="image"
                folder="piclagbe/covers"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">ফোন নম্বর (WhatsApp কন্টাক্টের জন্য)</label>
                <input
                  type="tel"
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="glass-input"
                />
                <p className="text-[12.5px] text-white/45 mt-1">দিলে প্রোফাইলে WhatsApp-এ মেসেজ বাটন দেখা যাবে।</p>
              </div>
              <div>
                <label className="field-label">সার্ভিস এরিয়া (কমা দিয়ে আলাদা করুন)</label>
                <input
                  type="text"
                  value={profAreas}
                  onChange={(e) => setProfAreas(e.target.value)}
                  placeholder="লাবণী পয়েন্ট, হিমছড়ি, ইনানী বিচ"
                  className="glass-input"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={profSaving}
                className="btn-primary px-8 py-3 text-base"
              >
                {profSaving ? 'সংরক্ষণ হচ্ছে…' : 'পরিবর্তন সংরক্ষণ করুন'}
              </button>
            </div>
          </form>
        )}

        {/* VERIFICATION (KYC) TAB */}
        {tab === 'verification' && (
          <div className="max-w-3xl mx-auto glass-card p-8 rounded-xl3 space-y-6">
            <div>
              <h3 className="font-bold text-white text-xl">ভেরিফিকেশন ও KYC তথ্য</h3>
              <p className="text-sm text-white/60 mt-1">
                ভেরিফায়েড ব্যাজ পেতে (ঐচ্ছিক) আপনার সঠিক এনআইডি এবং সেলফি জমা দিন। তথ্য শুধুমাত্র অ্যাডমিন যাচাইয়ের জন্য ব্যবহৃত হবে।
              </p>
            </div>

            {kycSub && (
              <div className="glass p-4 rounded-xl2 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <span className="text-xs text-white/50 block">বর্তমান স্ট্যাটাস</span>
                  <span
                    className={`font-bold text-sm ${
                      kycSub.status === 'approved'
                        ? 'text-emerald-400'
                        : kycSub.status === 'rejected'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {kycSub.status === 'approved'
                      ? '✓ অ্যাপ্রুভড — আপনি ভেরিফায়েড'
                      : kycSub.status === 'rejected'
                      ? '✕ প্রত্যাখ্যাত — সংশোধন করে আবার জমা দিন'
                      : '⏳ পেন্ডিং রিভিউ'}
                  </span>
                </div>
                <span className="text-xs text-white/45">{bnDate(kycSub.created_at)}</span>
              </div>
            )}

            {kycSub?.status === 'rejected' && kycSub.review_note && (
              <div className="bdg-rejected p-4 rounded-xl2 text-sm">
                <strong>অ্যাডমিনের নোট:</strong> {kycSub.review_note}
              </div>
            )}

            {kycSub?.status === 'approved' ? (
              <div className="glass p-6 rounded-xl2 text-center space-y-2">
                <div className="text-3xl">✓</div>
                <p className="font-bold text-emerald-400">আপনার প্রোফাইল ভেরিফায়েড</p>
                <p className="text-sm text-white/55">
                  আপনার প্রোফাইলে ভেরিফায়েড ব্যাজ দেখানো হচ্ছে। ধন্যবাদ!
                </p>
              </div>
            ) : (
              <form onSubmit={handleKycSubmit} className="space-y-4">
                <div>
                  <label className="field-label">ফোন নম্বর (যাচাইকৃত)</label>
                  <input
                    type="tel"
                    required
                    value={kycPhone}
                    onChange={(e) => setKycPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="glass-input"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <CldUploadField
                    label="NID ফ্রন্ট (আপলোড বা লিংক)"
                    value={kycNidFront}
                    onChange={setKycNidFront}
                    accept="image"
                    folder="piclagbe/kyc"
                    required
                  />
                  <CldUploadField
                    label="NID ব্যাক (ঐচ্ছিক)"
                    value={kycNidBack}
                    onChange={setKycNidBack}
                    accept="image"
                    folder="piclagbe/kyc"
                  />
                </div>
                <CldUploadField
                  label="আপনার লাইভ সেলফি (আপলোড বা লিংক)"
                  value={kycSelfie}
                  onChange={setKycSelfie}
                  accept="image"
                  folder="piclagbe/kyc"
                  required
                />
                <div>
                  <label className="field-label">অতিরিক্ত নোট (যদি থাকে)</label>
                  <textarea
                    rows={2}
                    value={kycNote}
                    onChange={(e) => setKycNote(e.target.value)}
                    className="glass-input resize-none"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={kycSubmitting}
                    className="btn-primary px-8 py-3 text-base"
                  >
                    {kycSubmitting ? 'জমা দেওয়া হচ্ছে…' : kycSub ? 'আবেদন সংশোধন করে আবার জমা দিন' : 'KYC আবেদন জমা দিন'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
