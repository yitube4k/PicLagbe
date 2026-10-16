import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toBn, bnDateTime } from '../../lib/utils';
import { AIcon, type IconName } from '../../admin/icons';
import { useAdminCounts } from '../../admin/counts';
import { adminPath, isAdminSlug, type AdminSlug } from '../../admin/nav';
import {
  FilterBar, EmptyState, ListSkeleton, ProgressiveRows, useSnack,
} from './kit';
import {
  fetchAdminNotifications, markNotificationRead, markAllNotificationsRead,
  subscribeAdminNotifications,
  type AdminNotification, type NotifFilter, type AdminNotificationType,
} from '../../lib/adminNotifications';

/* ═══════════════ V20 নোটিফিকেশন — dedicated admin section (Android style) ═══════════════
   • রিয়েলটাইম ফিড (Supabase realtime) — নতুন ইভেন্ট সাথে সাথে চলে আসে
   • টাইপ চিপস + অপঠিত ব্যাজ · ট্যাপ = পঠিত + সংশ্লিষ্ট সেকশনে জাম্প
   • সব পঠিত করুন (optimistic) · প্রগ্রেসিভ রেন্ডার (৩০+৩০…) */

const TYPE_META: Record<AdminNotificationType, { icon: IconName; tile: string; label: string; to: AdminSlug }> = {
  new_booking:         { icon: 'bookings', tile: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25', label: 'বুকিং',        to: 'booking' },
  post_pending:        { icon: 'posts',    tile: 'bg-amber-400/12 text-amber-300 border-amber-400/25',        label: 'পোস্ট',        to: 'post' },
  kyc_submitted:       { icon: 'shield',   tile: 'bg-sky-400/12 text-sky-300 border-sky-400/25',              label: 'KYC',         to: 'kyc' },
  photographer_signup: { icon: 'camera',   tile: 'bg-purple-400/12 text-purple-300 border-purple-400/25',     label: 'ফটোগ্রাফার',   to: 'photographer' },
  role_request:        { icon: 'requests', tile: 'bg-orange-400/12 text-orange-300 border-orange-400/25',     label: 'রোল আবেদন',   to: 'requests' },
  user_signup:         { icon: 'users',    tile: 'bg-teal-400/12 text-teal-300 border-teal-400/25',           label: 'ইউজার',       to: 'user' },
  new_review:          { icon: 'star',     tile: 'bg-yellow-400/12 text-yellow-300 border-yellow-400/25',     label: 'রিভিউ',       to: 'review' },
  new_chat:            { icon: 'chats',    tile: 'bg-pink-400/12 text-pink-300 border-pink-400/25',           label: 'চ্যাট',        to: 'chat' },
  admin_action:        { icon: 'check',    tile: 'bg-indigo-400/12 text-indigo-300 border-indigo-400/25',     label: 'অ্যাকশন',     to: 'audit' },
};

const FILTERS: { key: NotifFilter; label: string }[] = [
  { key: 'all', label: 'সব' },
  { key: 'unread', label: 'অপঠিত' },
  { key: 'new_booking', label: 'বুকিং' },
  { key: 'kyc_submitted', label: 'KYC' },
  { key: 'post_pending', label: 'পোস্ট' },
  { key: 'photographer_signup', label: 'ফটোগ্রাফার' },
  { key: 'role_request', label: 'রোল আবেদন' },
  { key: 'user_signup', label: 'ইউজার' },
  { key: 'new_review', label: 'রিভিউ' },
  { key: 'new_chat', label: 'চ্যাট' },
  { key: 'admin_action', label: 'অ্যাকশন' },
];

export default function AdminNotifications() {
  const navigate = useNavigate();
  const { show } = useSnack();
  const { unreadNotif, bumpUnread, clearUnread, refreshDebounced } = useAdminCounts();

  const [filter, setFilter] = useState<NotifFilter>('all');
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  /* ফিল্টার বদলালে লোড (নীরব — লিস্ট হোঁচট খায় না) */
  const load = useCallback(async (f: NotifFilter, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchAdminNotifications(f);
      setItems(data);
      setError(null);
    } catch (e) {
      setError((e as Error)?.message || 'লোড ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  /* রিয়েলটাইম — নতুন ইভেন্ট সাথে সাথে ফিডে (ফিল্টার মিললে) */
  useEffect(() => {
    const unsub = subscribeAdminNotifications({
      onInsert: (n) => {
        if (filter === 'all' || filter === 'unread' || filter === n.type) {
          setItems((prev) => [n, ...prev]);
        }
      },
      onUpdate: (u) => setItems((prev) => prev.map((x) => (x.id === u.id ? u : x))),
    });
    return unsub;
  }, [filter]);

  /* ট্যাপ = optimistic পঠিত + সেকশনে জাম্প */
  const openNotif = (n: AdminNotification) => {
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      bumpUnread(-1);
      markNotificationRead(n.id).catch(() => {});
    }
    const slug = (n.target_section || '').replace(/^\/admin\//, '');
    navigate(adminPath(isAdminSlug(slug) ? slug : 'dashboard'));
  };

  /* সব পঠিত (optimistic + rollback) */
  const markAll = async () => {
    if (unreadNotif === 0 || markingAll) return;
    setMarkingAll(true);
    const snapshot = items;
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    clearUnread();
    const { error: err } = await supabase
      .from('admin_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('is_read', false);
    setMarkingAll(false);
    if (err) {
      setItems(snapshot);
      show('ব্যর্থ হয়েছে — আবার চেষ্টা করুন', { tone: 'error' });
      return;
    }
    show('সব নোটিফিকেশন পঠিত করা হয়েছে ✓');
    load(filter, true);
    refreshDebounced();
  };

  const chips = FILTERS.map((f) => ({
    key: f.key,
    label: f.label,
    count: f.key === 'unread' ? unreadNotif : undefined,
  }));

  return (
    <div>
      <FilterBar
        chips={chips}
        activeChip={filter}
        onChip={(k) => setFilter(k as NotifFilter)}
        right={
          <button
            type="button"
            onClick={markAll}
            disabled={unreadNotif === 0 || markingAll}
            className="shrink-0 h-[42px] px-4 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold border transition-colors active:scale-95 disabled:opacity-40 disabled:pointer-events-none bg-emerald-400/10 border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/15"
          >
            <AIcon name="check-all" size={16} strokeWidth={2.2} />
            সব পঠিত
          </button>
        }
      />

      {/* স্ট্যাটাস লাইন */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="relative w-2 h-2 rounded-full bg-emerald-400">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
        </span>
        <p className="text-[12.5px] font-semibold text-white/50">
          লাইভ ফিড — অপঠিত <span className="text-emerald-300 font-extrabold">{toBn(unreadNotif)}</span>টি
          <span className="text-white/30"> · নতুন বুকিং, পোস্ট, KYC, রিভিউ, চ্যাট সব এখানে</span>
        </p>
      </div>

      {error && <p className="text-sm text-rose-300 mb-3 px-1">{error}</p>}

      {loading && items.length === 0 ? (
        <ListSkeleton rows={6} h="h-[76px]" />
      ) : items.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="কোনো নোটিফিকেশন নেই"
          sub={filter === 'unread' ? 'সব পড়া হয়ে গেছে — দুর্দান্ত!' : 'নতুন ইভেন্ট এলে এখানে সাথে সাথে দেখা যাবে।'}
        />
      ) : (
        <ProgressiveRows
          items={items}
          resetKey={filter}
          renderRow={(n) => {
            const meta = TYPE_META[n.type] || TYPE_META.admin_action;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => openNotif(n)}
                className={`w-full text-left rounded-xl2 p-3.5 flex items-start gap-3 border transition-colors active:scale-[0.99] ${
                  n.is_read
                    ? 'glass-row bg-white/[0.03] border-white/[0.06]'
                    : 'bg-white/[0.07] border-sunset-gold/25 shadow-[0_0_0_1px_rgba(245,197,110,0.06)]'
                }`}
              >
                <span className={`w-11 h-11 rounded-xl2 border grid place-items-center shrink-0 ${meta.tile}`}>
                  <AIcon name={meta.icon} size={19} strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1 block">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={`text-[13.5px] leading-snug truncate flex-1 min-w-0 ${n.is_read ? 'font-semibold text-white/75' : 'font-extrabold text-white'}`}>
                      {n.title}
                    </span>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-sunset-gold shrink-0 shadow-glow" />}
                  </span>
                  {n.body && (
                    <span className="text-[12.5px] text-white/50 leading-snug line-clamp-2 mt-0.5 block">
                      {n.body}
                    </span>
                  )}
                  <span className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-white/45">{meta.label}</span>
                    <span className="text-[11px] text-white/35">{bnDateTime(n.created_at)}</span>
                  </span>
                </span>
                <span className="w-9 h-9 rounded-full grid place-items-center text-white/30 shrink-0">
                  <AIcon name="chevron" size={16} className="rotate-90" />
                </span>
              </button>
            );
          }}
        />
      )}
    </div>
  );
}
