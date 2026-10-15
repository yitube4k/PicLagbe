// src/pages/AdminDash.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Profile, Photographer, Booking, BlogPost } from '../lib/types';
import { toBn, taka, bnDate } from '../lib/utils';
import { COX_SPOTS } from '../lib/constants';

type AdminTab = 'overview' | 'users' | 'photographers' | 'kyc' | 'chats' | 'bookings' | 'blog';

type AdminBooking = Booking & {
  photographers?: { display_name?: string | null } | null;
  profiles?: { full_name?: string | null } | null;
};

type AdminPhotographer = Photographer & {
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

type KycSubmission = {
  id: string;
  photographer_id: string;
  status: 'pending' | 'approved' | 'rejected';
  nid_front_url: string;
  nid_back_url?: string;
  selfie_url: string;
  phone: string;
  note?: string;
  review_note?: string;
  created_at: string;
  photographers?: { display_name?: string; slug?: string } | null;
};

type Conversation = {
  id: string;
  customer_id: string;
  photographer_id: string;
  last_message_at: string;
  created_at: string;
  customers?: { full_name?: string; avatar_url?: string } | null;
  photographers?: { display_name?: string; profile_photo_url?: string } | null;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export default function AdminDash() {
  const { session, profile } = useAuth();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);

  // Counts
  const [counts, setCounts] = useState({
    users: 0,
    photographers: 0,
    bookings: 0,
    pendingPhotographers: 0,
    pendingKyc: 0,
  });

  // Data states
  const [recentBookings, setRecentBookings] = useState<AdminBooking[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [photographers, setPhotographers] = useState<AdminPhotographer[]>([]);
  const [photoFilter, setPhotoFilter] = useState<'all' | 'pending' | 'approved' | 'blocked' | 'banned'>('all');
  const [kycSubmissions, setKycSubmissions] = useState<KycSubmission[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [allBookings, setAllBookings] = useState<AdminBooking[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  // Manual Photographer Add Form State
  const [isAddingPhotographer, setIsAddingPhotographer] = useState(false);
  const [newPhotoName, setNewPhotoName] = useState('');
  const [newPhotoEmail, setNewPhotoEmail] = useState('');
  const [newPhotoPhone, setNewPhotoPhone] = useState('');
  const [newPhotoSpot, setNewPhotoSpot] = useState('laboni');
  const [newPhotoPrice, setNewPhotoPrice] = useState('4000');
  const [newPhotoBio, setNewPhotoBio] = useState('');

  // Blog creation form state
  const [isAddingBlog, setIsAddingBlog] = useState(false);
  const [blogTitle, setBlogTitle] = useState('');
  const [blogSlug, setBlogSlug] = useState('');
  const [blogCover, setBlogCover] = useState('');
  const [blogExcerpt, setBlogExcerpt] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogTags, setBlogTags] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAdminData() {
      if (!session || profile?.role !== 'admin') {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [
          cntUsers,
          cntPhoto,
          cntBookings,
          cntPending,
          cntKyc,
          recBookingsRes,
          usersRes,
          photoRes,
          kycRes,
          convRes,
          allBRes,
          blogRes,
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('photographers').select('*', { count: 'exact', head: true }),
          supabase.from('bookings').select('*', { count: 'exact', head: true }),
          supabase.from('photographers').select('*', { count: 'exact', head: true }).eq('profile_status', 'pending'),
          supabase.from('kyc_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase
            .from('bookings')
            .select('*, photographers(display_name), profiles(full_name)')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('photographers').select('*, profiles!photographers_user_id_fkey(full_name, email)').order('created_at', { ascending: false }),
          supabase.from('kyc_submissions').select('*, photographers(display_name, slug)').eq('status', 'pending').order('created_at', { ascending: false }),
          supabase.from('conversations').select('*, customers:customer_id(full_name, avatar_url), photographers:photographer_id(display_name, profile_photo_url)').order('last_message_at', { ascending: false }),
          supabase
            .from('bookings')
            .select('*, photographers(display_name), profiles(full_name)')
            .order('created_at', { ascending: false })
            .limit(30),
          supabase.from('blog_posts').select('*').order('created_at', { ascending: false }),
        ]);

        if (!active) return;

        setCounts({
          users: cntUsers.count || 0,
          photographers: cntPhoto.count || 0,
          bookings: cntBookings.count || 0,
          pendingPhotographers: cntPending.count || 0,
          pendingKyc: cntKyc.count || 0,
        });

        if (!recBookingsRes.error) setRecentBookings((recBookingsRes.data as AdminBooking[]) || []);
        if (!usersRes.error) setUsers((usersRes.data as Profile[]) || []);
        if (!photoRes.error) setPhotographers((photoRes.data as AdminPhotographer[]) || []);
        if (!kycRes.error) setKycSubmissions((kycRes.data as KycSubmission[]) || []);
        if (!convRes.error) setConversations((convRes.data as Conversation[]) || []);
        if (!allBRes.error) setAllBookings((allBRes.data as AdminBooking[]) || []);
        if (!blogRes.error) setBlogPosts((blogRes.data as BlogPost[]) || []);
      } catch (err) {
        if (active) console.error('Admin data load error:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAdminData();

    return () => {
      active = false;
    };
  }, [session, profile]);

  // Load messages for selected conversation & subscribe
  useEffect(() => {
    if (!selectedConvId) return;

    let active = true;
    async function loadMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConvId)
        .order('created_at', { ascending: true });

      if (active && !error && data) {
        setMessages(data as ChatMessage[]);
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }

    loadMessages();

    const channel = supabase
      .channel(`admin-chat-${selectedConvId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConvId}` },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [selectedConvId]);

  if (!session || profile?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-6 pt-40 pb-24 text-center">
        <div className="glass-card p-12 rounded-xl3 space-y-4">
          <div className="text-4xl">🔒</div>
          <h2 className="text-xl font-bold text-white">শুধু অ্যাডমিনের জন্য</h2>
          <p className="text-sm text-white/60 mb-4">আপনার এই পৃষ্ঠায় প্রবেশাধিকার নেই।</p>
          <Link to="/" className="btn-primary">
            হোমে ফিরে যান
          </Link>
        </div>
      </div>
    );
  }

  // Manual Photographer Add
  const handleCreatePhotographer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoName.trim()) return;

    const slug =
      newPhotoName
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-') +
      '-' +
      Math.floor(100 + Math.random() * 900);

    const matchedSpot = COX_SPOTS.find((s) => s.key === newPhotoSpot) || COX_SPOTS[0];

    const { data, error } = await supabase
      .from('photographers')
      .insert({
        slug,
        display_name: newPhotoName.trim(),
        full_location: matchedSpot.nameBn,
        home_spot: matchedSpot.key,
        starting_price: Number(newPhotoPrice) || 4000,
        bio: newPhotoBio.trim() || null,
        profile_status: 'approved',
        verified: true,
      })
      .select('*, profiles!photographers_user_id_fkey(full_name, email)')
      .single();

    if (!error && data) {
      setPhotographers((prev) => [data as AdminPhotographer, ...prev]);
      setIsAddingPhotographer(false);
      setNewPhotoName('');
      setNewPhotoEmail('');
      setNewPhotoPhone('');
      setNewPhotoBio('');
      alert('নতুন ফটোগ্রাফার প্রোফাইল সফলভাবে তৈরি করা হয়েছে!');
    } else {
      alert('ফটোগ্রাফার তৈরি করতে সমস্যা হয়েছে।');
    }
  };

  // KYC Review Action
  const handleKycReview = async (subId: string, photographerId: string, status: 'approved' | 'rejected', reviewNote?: string) => {
    const { error } = await supabase
      .from('kyc_submissions')
      .update({ status, review_note: reviewNote || null, reviewed_at: new Date().toISOString() })
      .eq('id', subId);

    if (!error) {
      if (status === 'approved') {
        await supabase.from('photographers').update({ verified: true, profile_status: 'approved' }).eq('id', photographerId);
      }
      setKycSubmissions((prev) => prev.filter((s) => s.id !== subId));
      setCounts((c) => ({ ...c, pendingKyc: Math.max(0, c.pendingKyc - 1) }));
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u)));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('এই ইউজার প্রোফাইল ডিলিট করতে চান?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (!error) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setCounts((c) => ({ ...c, users: Math.max(0, c.users - 1) }));
    }
  };

  const handleUpdatePhotographerStatus = async (photoId: string, status: 'pending' | 'approved' | 'blocked' | 'banned') => {
    const { error } = await supabase.from('photographers').update({ profile_status: status }).eq('id', photoId);
    if (!error) {
      setPhotographers((prev) => prev.map((p) => (p.id === photoId ? { ...p, profile_status: status } : p)));
    }
  };

  const handleAdminBookingStatus = async (bookingId: string, status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed') => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
    if (!error) {
      setAllBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));
    }
  };

  const handleToggleBlogPublish = async (postId: string, currentPublished: boolean) => {
    const { error } = await supabase.from('blog_posts').update({ published: !currentPublished }).eq('id', postId);
    if (!error) {
      setBlogPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, published: !currentPublished } : p)));
    }
  };

  const handleDeleteBlog = async (postId: string) => {
    if (!window.confirm('আর্টিকেলটি ডিলিট করতে চান?')) return;
    const { error } = await supabase.from('blog_posts').delete().eq('id', postId);
    if (!error) {
      setBlogPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  const handleCreateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogTitle.trim()) return;

    const generatedSlug = blogSlug.trim() || blogTitle.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    const tagsArr = blogTags.split(',').map((t) => t.trim()).filter(Boolean);

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title: blogTitle.trim(),
        slug: generatedSlug,
        cover_url: blogCover.trim() || null,
        excerpt: blogExcerpt.trim() || null,
        content: blogContent.trim() || null,
        tags: tagsArr,
        published: true,
        author: profile.full_name || 'অ্যাডমিন',
      })
      .select()
      .single();

    if (!error && data) {
      setBlogPosts((prev) => [data as BlogPost, ...prev]);
      setIsAddingBlog(false);
      setBlogTitle('');
      setBlogSlug('');
      setBlogCover('');
      setBlogExcerpt('');
      setBlogContent('');
      setBlogTags('');
    } else {
      alert('ব্লগ পোস্ট তৈরি করতে সমস্যা হয়েছে।');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'accepted':
        return <span className="bdg-accepted">অ্যাপ্রুভড</span>;
      case 'completed':
        return <span className="bdg-completed">সম্পন্ন</span>;
      case 'pending':
        return <span className="bdg-pending">পেন্ডিং</span>;
      case 'blocked':
      case 'rejected':
        return <span className="bdg-rejected">ব্লকড</span>;
      case 'banned':
        return <span className="bdg-rejected">ব্যানড</span>;
      default:
        return <span className="bdg-cancelled">{status}</span>;
    }
  };

  const filteredPhotographers = photographers.filter((p) => {
    if (photoFilter === 'all') return true;
    return p.profile_status === photoFilter;
  });

  const filteredUsers = users.filter(
    (u) =>
      (u.full_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  const getInitials = (name?: string | null) => {
    if (!name || !name.trim()) return 'অ';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 pb-24 space-y-8">
      <div>
        <h1 className="section-head text-3xl">🛡️ অ্যাডমিন প্যানেল</h1>
        <p className="section-sub mt-1">প্ল্যাটফর্মের সম্পূর্ণ নিয়ন্ত্রণ ও পরিচালনা</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="stat-card">
          <div className="stat-num">{toBn(counts.users)}</div>
          <div className="stat-label">মোট ইউজার</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{toBn(counts.photographers)}</div>
          <div className="stat-label">ফটোগ্রাফার</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{toBn(counts.bookings)}</div>
          <div className="stat-label">মোট বুকিং</div>
        </div>
        <div className="stat-card">
          <div className={`stat-num ${counts.pendingPhotographers > 0 ? 'text-amber-400' : ''}`}>
            {toBn(counts.pendingPhotographers)}
          </div>
          <div className="stat-label">পেন্ডিং প্রোফাইল</div>
        </div>
        <div className="stat-card">
          <div className={`stat-num ${counts.pendingKyc > 0 ? 'text-sunset-gold' : ''}`}>
            {toBn(counts.pendingKyc)}
          </div>
          <div className="stat-label">পেন্ডিং KYC</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="glass rounded-full inline-flex p-1.5 gap-1 flex-wrap justify-center">
          <button type="button" onClick={() => setTab('overview')} className={tab === 'overview' ? 'chip-active rounded-full px-4 py-2 text-xs sm:text-sm' : 'chip !border-transparent text-white/75 hover:text-white py-2 text-xs sm:text-sm'}>
            📊 ওভারভিউ
          </button>
          <button type="button" onClick={() => setTab('users')} className={tab === 'users' ? 'chip-active rounded-full px-4 py-2 text-xs sm:text-sm' : 'chip !border-transparent text-white/75 hover:text-white py-2 text-xs sm:text-sm'}>
            👥 ইউজার
          </button>
          <button type="button" onClick={() => setTab('photographers')} className={tab === 'photographers' ? 'chip-active rounded-full px-4 py-2 text-xs sm:text-sm' : 'chip !border-transparent text-white/75 hover:text-white py-2 text-xs sm:text-sm'}>
            📷 ফটোগ্রাফার ({toBn(counts.pendingPhotographers)})
          </button>
          <button type="button" onClick={() => setTab('kyc')} className={tab === 'kyc' ? 'chip-active rounded-full px-4 py-2 text-xs sm:text-sm' : 'chip !border-transparent text-white/75 hover:text-white py-2 text-xs sm:text-sm'}>
            🆔 KYC রিভিউ ({toBn(counts.pendingKyc)})
          </button>
          <button type="button" onClick={() => setTab('chats')} className={tab === 'chats' ? 'chip-active rounded-full px-4 py-2 text-xs sm:text-sm' : 'chip !border-transparent text-white/75 hover:text-white py-2 text-xs sm:text-sm'}>
            💬 চ্যাট মনিটর
          </button>
          <button type="button" onClick={() => setTab('bookings')} className={tab === 'bookings' ? 'chip-active rounded-full px-4 py-2 text-xs sm:text-sm' : 'chip !border-transparent text-white/75 hover:text-white py-2 text-xs sm:text-sm'}>
            📦 বুকিং
          </button>
          <button type="button" onClick={() => setTab('blog')} className={tab === 'blog' ? 'chip-active rounded-full px-4 py-2 text-xs sm:text-sm' : 'chip !border-transparent text-white/75 hover:text-white py-2 text-xs sm:text-sm'}>
            📝 ব্লগ
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl3 w-full" />
          ))}
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="glass-card p-6 rounded-xl3 space-y-4">
                <h3 className="font-bold text-white text-base">সাম্প্রতিক বুকিং</h3>
                {recentBookings.length === 0 ? (
                  <p className="text-sm text-white/50">কোনো বুকিং নেই</p>
                ) : (
                  <div className="space-y-3">
                    {recentBookings.map((b) => (
                      <div key={b.id} className="glass p-3 rounded-xl2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-semibold text-white text-sm truncate block">
                            {b.profiles?.full_name || 'গ্রাহক'} → {b.photographers?.display_name || 'ফটোগ্রাফার'}
                          </span>
                          <span className="text-xs text-white/50">{bnDate(b.event_date)}</span>
                        </div>
                        {getStatusBadge(b.status)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-card p-6 rounded-xl3 space-y-4">
                <h3 className="font-bold text-white text-base">পেন্ডিং অ্যাকশন</h3>
                <div className="space-y-3">
                  <div className="glass p-4 rounded-xl2 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-white text-sm">KYC ভেরিফিকেশন অপেক্ষমাণ</h4>
                      <p className="text-xs text-white/50">{counts.pendingKyc} টি কেওয়াইসি আবেদন যাচাই বাকি</p>
                    </div>
                    <button type="button" onClick={() => setTab('kyc')} className="btn-primary !py-1.5 !px-3 !text-xs">
                      যাচাই করুন
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <h3 className="font-bold text-white text-lg">ইউজার তালিকা ({toBn(users.length)})</h3>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="নাম বা ইমেল দিয়ে খুঁজুন…"
                  className="glass-input max-w-xs !py-2 !text-sm"
                />
              </div>

              <div className="space-y-3">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="glass-card p-4 rounded-xl2 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-1 ring-sunset-gold/30" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-sunset-gradient flex items-center justify-center font-bold text-[#1A0E06]">
                          {getInitials(u.full_name)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-white text-sm">{u.full_name || 'নামহীন'}</h4>
                        <p className="text-xs text-white/55">{u.email || 'ইমেল নেই'} · {bnDate(u.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={u.role || 'customer'}
                        onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                        className="glass-select !py-1.5 !text-xs w-32"
                      >
                        <option value="customer">Customer</option>
                        <option value="photographer">Photographer</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button type="button" onClick={() => handleDeleteUser(u.id)} className="btn-danger !py-1.5 !px-3 !text-xs">ডিলিট</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'photographers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <h3 className="font-bold text-white text-lg">ফটোগ্রাফার কন্ট্রোল</h3>
                <div className="flex gap-3 items-center flex-wrap">
                  <button type="button" onClick={() => setIsAddingPhotographer((prev) => !prev)} className="btn-primary text-xs">
                    {isAddingPhotographer ? 'ফর্ম বন্ধ করুন' : '+ নতুন ফটোগ্রাফার যোগ করুন'}
                  </button>
                  <div className="flex gap-2">
                    {(['all', 'pending', 'approved', 'blocked', 'banned'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setPhotoFilter(f)}
                        className={photoFilter === f ? 'chip-active !text-xs !py-1' : 'chip !text-xs !py-1'}
                      >
                        {f === 'all' ? 'সব' : f === 'pending' ? 'পেন্ডিং' : f === 'approved' ? 'অ্যাপ্রুভড' : f === 'blocked' ? 'ব্লকড' : 'ব্যানড'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {isAddingPhotographer && (
                <form onSubmit={handleCreatePhotographer} className="glass-card p-6 rounded-xl3 space-y-4 border-sunset-gold/50">
                  <h4 className="font-bold text-white text-base">ম্যানুয়াল ফটোগ্রাফার প্রোফাইল তৈরি</h4>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="field-label">ডিসপ্লে নাম</label>
                      <input type="text" required value={newPhotoName} onChange={(e) => setNewPhotoName(e.target.value)} placeholder="ফটোগ্রাফারের নাম" className="glass-input" />
                    </div>
                    <div>
                      <label className="field-label">হোম স্পট</label>
                      <select value={newPhotoSpot} onChange={(e) => setNewPhotoSpot(e.target.value)} className="glass-select">
                        {COX_SPOTS.map((s) => (
                          <option key={s.key} value={s.key}>{s.nameBn}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">শুরু মূল্য (৳)</label>
                      <input type="number" required value={newPhotoPrice} onChange={(e) => setNewPhotoPrice(e.target.value)} className="glass-input" />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">বায়ো / বিবরণ</label>
                    <textarea rows={2} value={newPhotoBio} onChange={(e) => setNewPhotoBio(e.target.value)} placeholder="সংক্ষিপ্ত বিবরণ..." className="glass-input resize-none" />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" className="btn-primary px-6 py-2 text-xs">প্রোফাইল তৈরি করুন</button>
                  </div>
                </form>
              )}

              {filteredPhotographers.length === 0 ? (
                <div className="glass-card p-12 text-center rounded-xl3">
                  <p className="text-white/60">কোনো ফটোগ্রাফার পাওয়া যায়নি।</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPhotographers.map((p) => {
                    const status = p.profile_status || 'pending';
                    return (
                      <div key={p.id} className="glass-card p-5 rounded-xl3 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl2 overflow-hidden bg-twilight-800 shrink-0">
                            {p.cover_photo_url ? (
                              <img src={p.cover_photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-sunset-soft" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-base">{p.display_name}</h4>
                              {getStatusBadge(status)}
                              {p.verified && <span className="badge badge-verified bg-emerald-500/20 text-emerald-300">✓ ভেরিফায়েড</span>}
                            </div>
                            <p className="text-xs text-white/50 mt-0.5">
                              {p.full_location || 'কক্সবাজার'} · ★ {toBn(Number(p.rating_avg || 0).toFixed(1))}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                          {status === 'pending' && (
                            <>
                              <button type="button" onClick={() => handleUpdatePhotographerStatus(p.id, 'blocked')} className="btn-danger !py-1.5 !px-3 !text-xs">বাতিল</button>
                              <button type="button" onClick={() => handleUpdatePhotographerStatus(p.id, 'approved')} className="btn-primary !py-1.5 !px-4 !text-xs">অ্যাপ্রুভ</button>
                            </>
                          )}
                          {status === 'approved' && (
                            <>
                              <button type="button" onClick={() => handleUpdatePhotographerStatus(p.id, 'blocked')} className="btn-ghost !py-1.5 !px-3 !text-xs">ব্লক</button>
                              <button type="button" onClick={() => handleUpdatePhotographerStatus(p.id, 'banned')} className="btn-danger !py-1.5 !px-3 !text-xs">ব্যান</button>
                            </>
                          )}
                          {(status === 'blocked' || status === 'banned') && (
                            <button type="button" onClick={() => handleUpdatePhotographerStatus(p.id, 'approved')} className="btn-primary !py-1.5 !px-4 !text-xs">পুনরায় চালু</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'kyc' && (
            <div className="space-y-6">
              <h3 className="font-bold text-white text-lg">KYC ভেরিফিকেশন আবেদনসমূহ</h3>
              {kycSubmissions.length === 0 ? (
                <div className="glass-card p-12 text-center rounded-xl3">
                  <p className="text-white/60">কোনো পেন্ডিং KYC আবেদন নেই।</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {kycSubmissions.map((sub) => (
                    <div key={sub.id} className="glass-card p-6 rounded-xl3 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="font-bold text-white text-lg">{sub.photographers?.display_name || 'ফটোগ্রাফার'}</h4>
                          <p className="text-xs text-white/50 mt-0.5">ফোন: {sub.phone} · জমাদানের তারিখ: {bnDate(sub.created_at)}</p>
                        </div>
                        <span className="bdg-pending">পেন্ডিং</span>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4 pt-2">
                        <div>
                          <span className="text-xs text-white/50 block mb-1">NID ফ্রন্ট</span>
                          <a href={sub.nid_front_url} target="_blank" rel="noreferrer" className="block h-36 rounded-xl2 overflow-hidden bg-twilight-900 border border-white/10">
                            <img src={sub.nid_front_url} alt="NID Front" className="w-full h-full object-cover " />
                          </a>
                        </div>
                        {sub.nid_back_url && (
                          <div>
                            <span className="text-xs text-white/50 block mb-1">NID ব্যাক</span>
                            <a href={sub.nid_back_url} target="_blank" rel="noreferrer" className="block h-36 rounded-xl2 overflow-hidden bg-twilight-900 border border-white/10">
                              <img src={sub.nid_back_url} alt="NID Back" className="w-full h-full object-cover " />
                            </a>
                          </div>
                        )}
                        <div>
                          <span className="text-xs text-white/50 block mb-1">সেলফি</span>
                          <a href={sub.selfie_url} target="_blank" rel="noreferrer" className="block h-36 rounded-xl2 overflow-hidden bg-twilight-900 border border-white/10">
                            <img src={sub.selfie_url} alt="Selfie" className="w-full h-full object-cover " />
                          </a>
                        </div>
                      </div>

                      {sub.note && <p className="text-sm text-white/70 italic bg-white/[0.03] p-3 rounded-xl2">নোট: {sub.note}</p>}

                      <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
                        <button type="button" onClick={() => handleKycReview(sub.id, sub.photographer_id, 'rejected', 'নথি অসম্পূর্ণ')} className="btn-danger !py-2 !px-4 !text-xs">প্রত্যাখ্যান</button>
                        <button type="button" onClick={() => handleKycReview(sub.id, sub.photographer_id, 'approved')} className="btn-primary !py-2 !px-5 !text-xs">✓ অ্যাপ্রুভ ও ভেরিফাইড করুন</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'chats' && (
            <div className="grid md:grid-cols-[320px_1fr] gap-5 items-start">
              {/* Conversations List */}
              <div className="glass rounded-xl3 p-4 space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                <h3 className="font-bold text-white text-sm mb-2 px-1">কনভার্সেশনসমূহ ({toBn(conversations.length)})</h3>
                {conversations.length === 0 ? (
                  <p className="text-xs text-white/50 p-2">কোনো চ্যাট নেই</p>
                ) : (
                  conversations.map((c) => {
                    const isSelected = c.id === selectedConvId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedConvId(c.id)}
                        className={`w-full text-left p-3 rounded-xl2 transition border ${isSelected ? 'border-sunset-gold bg-sunset-soft' : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'}`}
                      >
                        <div className="font-semibold text-white text-xs truncate">
                          {c.customers?.full_name || 'গ্রাহক'} ↔ {c.photographers?.display_name || 'ফটোগ্রাফার'}
                        </div>
                        <span className="text-[10px] text-white/45 mt-1 block">{bnDate(c.last_message_at)}</span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Message Thread Viewer */}
              <div className="glass-card rounded-xl3 p-5 h-[60vh] flex flex-col justify-between">
                {!selectedConvId ? (
                  <div className="flex items-center justify-center h-full text-white/50 text-sm">
                    বাম পাশ থেকে একটি কনভার্সেশন সিলেক্ট করুন
                  </div>
                ) : (
                  <>
                    <div className="border-b border-white/[0.08] pb-3 mb-3">
                      <h4 className="font-bold text-white text-sm">চ্যাট থ্রেড ভিউ (অ্যাডমিন মনিটরিং)</h4>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
                      {messages.map((m) => {
                        return (
                          <div key={m.id} className="glass p-3 rounded-xl2 max-w-md">
                            <p className="text-sm text-white/90 leading-relaxed">{m.body}</p>
                            <span className="text-[10px] text-white/40 mt-1 block">{bnDate(m.created_at)}</span>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'bookings' && (
            <div className="space-y-4">
              <h3 className="font-bold text-white text-lg">সকল বুকিং তালিকা</h3>
              {allBookings.length === 0 ? (
                <div className="glass-card p-12 text-center rounded-xl3"><p className="text-white/60">কোনো বুকিং নেই।</p></div>
              ) : (
                <div className="space-y-3">
                  {allBookings.map((b) => (
                    <div key={b.id} className="glass-card p-4 rounded-xl2 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-white text-sm">{b.profiles?.full_name || 'গ্রাহক'} → {b.photographers?.display_name || 'ফটোগ্রাফার'}</h4>
                        <p className="text-xs text-white/50 mt-0.5">তারিখ: {bnDate(b.event_date)} ({b.event_time}) · স্পট: {b.event_location || 'লাবণী'}</p>
                      </div>
                      <select
                        value={b.status || 'pending'}
                        onChange={(e) => handleAdminBookingStatus(b.id, e.target.value as any)}
                        className="glass-select !py-1.5 !text-xs w-36"
                      >
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'blog' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-white text-lg">ব্লগ ম্যানেজমেন্ট</h3>
                <button type="button" onClick={() => setIsAddingBlog((prev) => !prev)} className="btn-primary text-sm">
                  {isAddingBlog ? 'তৈরি ফর্ম বন্ধ করুন' : '+ নতুন পোস্ট'}
                </button>
              </div>

              {isAddingBlog && (
                <form onSubmit={handleCreateBlog} className="glass-card p-6 rounded-xl3 space-y-4 border-sunset-gold/50">
                  <h4 className="font-bold text-white text-base">নতুন ব্লগ পোস্ট লিখুন</h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className="field-label">টাইটেল</label><input type="text" required value={blogTitle} onChange={(e) => setBlogTitle(e.target.value)} className="glass-input" /></div>
                    <div><label className="field-label">স্লাগ</label><input type="text" value={blogSlug} onChange={(e) => setBlogSlug(e.target.value)} className="glass-input" /></div>
                  </div>
                  <div><label className="field-label">কভার URL</label><input type="url" value={blogCover} onChange={(e) => setBlogCover(e.target.value)} className="glass-input" /></div>
                  <div><label className="field-label">সারসংক্ষেপ</label><textarea rows={2} value={blogExcerpt} onChange={(e) => setBlogExcerpt(e.target.value)} className="glass-input resize-none" /></div>
                  <div><label className="field-label">কন্টেন্ট</label><textarea rows={6} required value={blogContent} onChange={(e) => setBlogContent(e.target.value)} className="glass-input resize-none font-mono text-sm" /></div>
                  <div className="flex justify-end pt-2"><button type="submit" className="btn-primary px-6 py-2.5 text-sm">প্রকাশ করুন</button></div>
                </form>
              )}

              <div className="space-y-3">
                {blogPosts.map((post) => (
                  <div key={post.id} className="glass-card p-4 rounded-xl2 flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-base truncate">{post.title}</h4>
                      <p className="text-xs text-white/50 mt-0.5">{bnDate(post.created_at)} · {post.author}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => handleToggleBlogPublish(post.id, post.published ?? true)} className={post.published ? 'chip-active !text-xs !py-1' : 'chip !text-xs !py-1 text-white/50'}>
                        {post.published ? 'প্রকাশিত' : 'ড্রাফট'}
                      </button>
                      <button type="button" onClick={() => handleDeleteBlog(post.id)} className="btn-danger !py-1.5 !px-3 !text-xs">ডিলিট</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}