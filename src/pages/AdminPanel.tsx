import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toBn } from '../lib/utils';
import RoleRequestsPanel from '../components/RoleRequestsPanel';
import AdminUsers from '../components/admin/AdminUsers';
import AdminPhotographers from '../components/admin/AdminPhotographers';
import AdminPosts from '../components/admin/AdminPosts';
import { AdminBlog, AdminCategories, AdminReviews } from '../components/admin/AdminContent';
import { AdminBookings, AdminKyc, AdminChats } from '../components/admin/AdminOps';

type AdminSection =
  | 'overview'
  | 'users'
  | 'photographers'
  | 'posts'
  | 'bookings'
  | 'reviews'
  | 'blog'
  | 'categories'
  | 'kyc'
  | 'requests'
  | 'chats';

const SECTIONS: { key: AdminSection; label: string; icon: string }[] = [
  { key: 'overview', label: 'ওভারভিউ', icon: '📊' },
  { key: 'users', label: 'ইউজার', icon: '👥' },
  { key: 'photographers', label: 'ফটোগ্রাফার', icon: '📷' },
  { key: 'posts', label: 'পোস্ট মডারেশন', icon: '🖼' },
  { key: 'bookings', label: 'বুকিং', icon: '📅' },
  { key: 'reviews', label: 'রিভিউ', icon: '⭐' },
  { key: 'blog', label: 'ব্লগ', icon: '📝' },
  { key: 'categories', label: 'ক্যাটাগরি', icon: '🏷️' },
  { key: 'kyc', label: 'KYC', icon: '🛡️' },
  { key: 'requests', label: 'রোল রিকোয়েস্ট', icon: '🔄' },
  { key: 'chats', label: 'চ্যাট', icon: '💬' },
];

type Counts = {
  users: number;
  photographers: number;
  pendingPhotographers: number;
  pendingPosts: number;
  totalPosts: number;
  bookings: number;
  pendingKyc: number;
  pendingRoleReq: number;
  blogPosts: number;
  reviews: number;
};

export default function AdminPanel() {
  const { session, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState<AdminSection>('overview');
  const [counts, setCounts] = useState<Counts | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // not logged in → auth page
  useEffect(() => {
    if (!authLoading && !session) navigate('/auth?mode=login');
  }, [authLoading, session, navigate]);

  const loadCounts = useCallback(async () => {
    const [
      u, ph, phPend, postsAll, postsPend, bk, kyc, roleReq, blog, rev,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('photographers').select('id', { count: 'exact', head: true }),
      supabase.from('photographers').select('id', { count: 'exact', head: true }).eq('profile_status', 'pending'),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bookings').select('id', { count: 'exact', head: true }),
      supabase.from('kyc_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('role_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('blog_posts').select('id', { count: 'exact', head: true }),
      supabase.from('reviews').select('id', { count: 'exact', head: true }),
    ]);
    setCounts({
      users: u.count || 0,
      photographers: ph.count || 0,
      pendingPhotographers: phPend.count || 0,
      totalPosts: postsAll.count || 0,
      pendingPosts: postsPend.count || 0,
      bookings: bk.count || 0,
      pendingKyc: kyc.count || 0,
      pendingRoleReq: roleReq.count || 0,
      blogPosts: blog.count || 0,
      reviews: rev.count || 0,
    });
  }, []);

  useEffect(() => {
    if (session && profile?.role === 'admin') loadCounts();
  }, [session, profile?.role, loadCounts, refreshKey]);

  if (authLoading) {
    return (
      <div className="min-h-screen max-w-6xl mx-auto px-6 pt-32 pb-20">
        <div className="skeleton h-40 rounded-xl3" />
      </div>
    );
  }

  if (!session || profile?.role !== 'admin') {
    return (
      <div className="min-h-screen max-w-xl mx-auto px-6 pt-36 pb-20">
        <div className="glass-card !rounded-xl3 p-8 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl glass flex items-center justify-center text-3xl">🔒</div>
          <div>
            <h2 className="text-xl font-extrabold text-white">শুধু অ্যাডমিনের জন্য</h2>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              {session
                ? <>আপনি লগইন করেছেন: <span className="text-white/85 font-semibold">{profile?.email || session.user?.email || '—'}</span><br />কিন্তু এই অ্যাকাউন্টে অ্যাডমিন অনুমতি (role) নেই।</>
                : 'প্রথমে অ্যাডমিন অ্যাকাউন্ট দিয়ে লগইন করুন।'}
            </p>
          </div>

          {!session && (
            <Link to="/auth?mode=login" className="btn-primary w-full justify-center">
              লগইন করুন
            </Link>
          )}

          {session && (
            <div className="text-left bg-black/30 border border-white/[0.08] rounded-xl2 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sunset-gold">
                অ্যাডমিন বানানোর নিয়ম (একবারই করতে হয়)
              </p>
              <ol className="text-[13px] text-white/70 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Supabase Dashboard খুলুন → আপনার প্রজেক্ট → <span className="text-white/90 font-semibold">SQL Editor</span></li>
                <li>নিচের SQL রান করুন (আপনার ইমেইল বসিয়ে):</li>
              </ol>
              <pre className="text-[11px] leading-relaxed bg-twilight-950/80 border border-white/[0.08] rounded-lg p-3 overflow-x-auto text-emerald-300 whitespace-pre">{`update public.profiles
   set role = 'admin'
 where email = 'আপনার-ইমেইল@gmail.com';`}</pre>
              <ol className="text-[13px] text-white/70 space-y-2 list-decimal list-inside leading-relaxed" start={3}>
                <li>এই পেজ <span className="text-white/90 font-semibold">Reload</span> দিন — তারপর হেডারে অ্যাভাটারে ক্লিক করলে <span className="text-sunset-gold font-semibold">🛡️ অ্যাডমিন প্যানেল</span> মেনু দেখাবে, অথবা সরাসরি <span className="text-white/90 font-semibold">/admin</span> ঠিকানায় যান।</li>
              </ol>
            </div>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-ghost w-full justify-center"
          >
            ↻ Reload করুন
          </button>
        </div>
      </div>
    );
  }

  const badgeFor = (key: AdminSection): number => {
    if (!counts) return 0;
    if (key === 'posts') return counts.pendingPosts;
    if (key === 'kyc') return counts.pendingKyc;
    if (key === 'requests') return counts.pendingRoleReq;
    return 0;
  };

  const pendingAlerts =
    (counts?.pendingPosts || 0) + (counts?.pendingKyc || 0) + (counts?.pendingRoleReq || 0) + (counts?.pendingPhotographers || 0);

  const openSection = (key: AdminSection) => {
    setSection(key);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        {/* head */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold grad-text">অ্যাডমিন প্যানেল</h1>
          <p className="text-sm text-white/55 mt-1">
            পুরো সাইটের সম্পূর্ণ নিয়ন্ত্রণ — সবকিছু দেখা, এডিট, যোগ ও মডারেট করার ক্ষমতা
            {pendingAlerts > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                ⏳ {toBn(pendingAlerts)} টি রিভিউ অপেক্ষমাণ
              </span>
            )}
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[240px_1fr] gap-6 items-start">
          {/* ══ Sidebar (desktop) ══ */}
          <aside className="hidden lg:block glass rounded-xl3 p-3 sticky top-24">
            <nav className="flex flex-col gap-1">
              {SECTIONS.map((s) => {
                const badge = badgeFor(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => openSection(s.key)}
                    className={`flex items-center gap-3 rounded-xl2 px-4 py-2.5 text-sm font-medium transition text-left ${
                      section === s.key
                        ? 'bg-sunset-soft border border-sunset-gold/40 text-sunset-gold font-bold'
                        : 'text-white/75 hover:bg-white/[0.07] hover:text-white border border-transparent'
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span className="flex-1">{s.label}</span>
                    {badge > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-sunset-coral text-white text-[10px] font-extrabold">
                        {toBn(badge)}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ══ Mobile section bar ══ */}
          <div className="lg:hidden -mx-4 px-4 mb-4 overflow-x-auto">
            <div className="flex gap-2 w-max pb-1">
              {SECTIONS.map((s) => {
                const badge = badgeFor(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => openSection(s.key)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium border transition ${
                      section === s.key
                        ? 'bg-sunset-soft border-sunset-gold/40 text-sunset-gold font-bold'
                        : 'border-white/10 bg-white/[0.04] text-white/75'
                    }`}
                  >
                    {s.icon} {s.label}
                    {badge > 0 && <span className="ml-1.5 text-[10px] font-extrabold text-sunset-coral">{toBn(badge)}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ══ Content ══ */}
          <main className="min-w-0">
            {section === 'overview' && (
              <div className="space-y-6">
                {/* stat grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                  {[
                    { label: 'ইউজার', val: counts?.users, icon: '👥', to: 'users' as AdminSection },
                    { label: 'ফটোগ্রাফার', val: counts?.photographers, icon: '📷', to: 'photographers' as AdminSection },
                    { label: 'মোট পোস্ট', val: counts?.totalPosts, icon: '🖼', to: 'posts' as AdminSection },
                    { label: 'বুকিং', val: counts?.bookings, icon: '📅', to: 'bookings' as AdminSection },
                    { label: 'ব্লগ পোস্ট', val: counts?.blogPosts, icon: '📝', to: 'blog' as AdminSection },
                    { label: 'রিভিউ', val: counts?.reviews, icon: '⭐', to: 'reviews' as AdminSection },
                    { label: 'পেন্ডিং ফটোগ্রাফার', val: counts?.pendingPhotographers, icon: '⏳', to: 'photographers' as AdminSection },
                    { label: 'পেন্ডিং পোস্ট', val: counts?.pendingPosts, icon: '🖼', to: 'posts' as AdminSection },
                    { label: 'পেন্ডিং KYC', val: counts?.pendingKyc, icon: '🛡️', to: 'kyc' as AdminSection },
                    { label: 'রোল রিকোয়েস্ট', val: counts?.pendingRoleReq, icon: '🔄', to: 'requests' as AdminSection },
                  ].map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => openSection(c.to)}
                      className="glass-card rounded-xl3 p-4 text-left hover:border-sunset-gold/40 transition"
                    >
                      <span className="text-lg">{c.icon}</span>
                      <div className="stat-num !text-2xl mt-1">{c.val != null ? toBn(c.val) : '—'}</div>
                      <div className="stat-label">{c.label}</div>
                    </button>
                  ))}
                </div>

                {/* quick actions */}
                <div className="glass rounded-xl3 p-5">
                  <h3 className="font-bold text-white mb-3">দ্রুত কাজ</h3>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => openSection('posts')} className="chip">
                      🖼 পোস্ট অনুমোদন {counts && counts.pendingPosts > 0 ? `(${toBn(counts.pendingPosts)})` : ''}
                    </button>
                    <button type="button" onClick={() => openSection('photographers')} className="chip">
                      📷 ফটোগ্রাফার অনুমোদন {counts && counts.pendingPhotographers > 0 ? `(${toBn(counts.pendingPhotographers)})` : ''}
                    </button>
                    <button type="button" onClick={() => openSection('kyc')} className="chip">
                      🛡️ KYC রিভিউ {counts && counts.pendingKyc > 0 ? `(${toBn(counts.pendingKyc)})` : ''}
                    </button>
                    <button type="button" onClick={() => openSection('blog')} className="chip">
                      📝 নতুন ব্লগ লিখুন
                    </button>
                    <button type="button" onClick={() => openSection('chats')} className="chip">
                      💬 চ্যাট দেখুন
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-white/40 px-1">
                  💡 সব সেকশনে সম্পূর্ণ এডিট/যোগ/ডিলিট ক্ষমতা আছে। কোনো সেকশনে ডেটা বদলালে ওভারভিউয়ের সংখ্যা অটো-আপডেট হবে।
                </p>
              </div>
            )}

            {section === 'users' && <AdminUsers onChanged={() => setRefreshKey((k) => k + 1)} />}
            {section === 'photographers' && <AdminPhotographers onChanged={() => setRefreshKey((k) => k + 1)} />}
            {section === 'posts' && <AdminPosts onChanged={() => setRefreshKey((k) => k + 1)} />}
            {section === 'bookings' && <AdminBookings />}
            {section === 'reviews' && <AdminReviews />}
            {section === 'blog' && <AdminBlog />}
            {section === 'categories' && <AdminCategories />}
            {section === 'kyc' && <AdminKyc onChanged={() => setRefreshKey((k) => k + 1)} />}
            {section === 'requests' && <RoleRequestsPanel />}
            {section === 'chats' && <AdminChats />}
          </main>
        </div>
      </div>
    </div>
  );
}
