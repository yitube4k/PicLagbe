import { useNavigate } from 'react-router-dom';
import { toBn } from '../lib/utils';
import { AIcon, type IconName } from './icons';
import { adminPath, type AdminSlug } from './nav';
import { useAdminCounts } from './counts';
import { PageHeader } from './PageHeader';

/* ═══ V18 Admin dashboard — Argon spec: 10 icon stat tiles (navigate to section,
   amber ring on pending>0) + quick actions row ═══ */

interface Tile {
  label: string;
  icon: IconName;
  to: AdminSlug;
  val?: number;
  pending?: boolean;
}

export default function AdminDashboard() {
  const { counts } = useAdminCounts();
  const navigate = useNavigate();

  const tiles: Tile[] = [
    { label: 'মোট ইউজার',            icon: 'users',    to: 'user',         val: counts?.users },
    { label: 'ফটোগ্রাফার',           icon: 'camera',   to: 'photographer', val: counts?.photographers },
    { label: 'পেন্ডিং ফটোগ্রাফার',    icon: 'camera',   to: 'photographer', val: counts?.pendingPhotographers, pending: true },
    { label: 'পেন্ডিং KYC',          icon: 'shield',   to: 'kyc',          val: counts?.pendingKyc, pending: true },
    { label: 'মোট বুকিং',            icon: 'bookings', to: 'booking',      val: counts?.bookings },
    { label: 'মোট পোস্ট',            icon: 'posts',    to: 'post',         val: counts?.totalPosts },
    { label: 'পেন্ডিং পোস্ট',         icon: 'posts',    to: 'post',         val: counts?.pendingPosts, pending: true },
    { label: 'রোল রিকোয়েস্ট',       icon: 'requests', to: 'requests',     val: counts?.pendingRoleReq, pending: true },
    { label: 'ব্লগ পোস্ট',           icon: 'blog',     to: 'blog',         val: counts?.blogPosts },
    { label: 'রিভিউ',               icon: 'star',     to: 'review',       val: counts?.reviews },
  ];

  const quick: { label: string; icon: IconName; to: AdminSlug; badge?: number }[] = [
    { label: 'পোস্ট অনুমোদন',      icon: 'posts',    to: 'post',         badge: counts?.pendingPosts },
    { label: 'ফটোগ্রাফার অনুমোদন', icon: 'camera',   to: 'photographer', badge: counts?.pendingPhotographers },
    { label: 'KYC রিভিউ',         icon: 'shield',   to: 'kyc',          badge: counts?.pendingKyc },
    { label: 'নতুন ব্লগ লিখুন',    icon: 'blog',     to: 'blog' },
    { label: 'চ্যাট দেখুন',        icon: 'chats',    to: 'chat' },
    { label: 'অডিট রিপোর্ট',       icon: 'audit',    to: 'audit' },
  ];

  return (
    <>
      <PageHeader slug="dashboard" />

      {/* stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tiles.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => navigate(adminPath(t.to))}
            className={`admin-press glass-card rounded-xl2 p-3.5 text-left flex flex-col justify-between min-h-[104px] relative overflow-hidden group transition-colors ${
              t.pending && (t.val || 0) > 0 ? '!border-amber-400/50' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="w-8 h-8 rounded-lg bg-white/[0.06] text-sunset-gold grid place-items-center">
                <AIcon name={t.icon} size={17} />
              </span>
              <AIcon
                name="arrow-up"
                size={15}
                className="opacity-30 group-hover:opacity-90 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-sunset-gold"
              />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-white tabular-nums tracking-tight mt-2 leading-none">
                {t.val != null ? toBn(t.val) : '—'}
              </div>
              <div className="text-xs text-white/45 font-medium mt-1.5 truncate">{t.label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* quick actions */}
      <div className="glass rounded-xl3 p-4 sm:p-5 mt-6">
        <h3 className="font-bold text-white mb-3">দ্রুত কাজ</h3>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => navigate(adminPath(q.to))}
              className="chip whitespace-nowrap inline-flex items-center gap-1.5"
            >
              <AIcon name={q.icon} size={14} />
              {q.label}
              {q.badge != null && q.badge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-sunset-coral text-white text-[10px] font-extrabold grid place-items-center">
                  {toBn(q.badge)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[12.5px] text-white/40 px-1 mt-4 leading-relaxed">
        💡 সব সেকশনে সম্পূর্ণ এডিট/যোগ/ডিলিট ক্ষমতা আছে। কোনো সেকশনে ডেটা বদলালে এখানকার সংখ্যা অটো-আপডেট হয়।
        প্রতিটি সেকশনের আলাদা ঠিকানা আছে — <span className="text-white/60 font-semibold">/admin/dashboard</span>,{' '}
        <span className="text-white/60 font-semibold">/admin/photographer</span>, <span className="text-white/60 font-semibold">/admin/user</span> ইত্যাদি।
      </p>
    </>
  );
}
