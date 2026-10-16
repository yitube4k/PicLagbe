import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
  getUnreadNotificationCount, subscribeAdminNotifications, type AdminNotification,
} from '../lib/adminNotifications';
import type { BadgeKey } from './nav';

/* ═══ V18/V20 shared admin counts — single source for nav badges + dashboard tiles ═══
   V20: + unread notification count (realtime) + single-flight guard + debounced refresh
   (low-end Android hang fix — mutation storms never stack parallel count queries) */

export type Counts = {
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

interface AdminCountsCtx {
  counts: Counts | null;
  refresh: () => void;
  refreshDebounced: () => void;
  badge: (key?: BadgeKey) => number;
  pendingAlerts: number;
  unreadNotif: number;
  bumpUnread: (delta: number) => void;
  clearUnread: () => void;
}

const Ctx = createContext<AdminCountsCtx>({
  counts: null,
  refresh: () => {},
  refreshDebounced: () => {},
  badge: () => 0,
  pendingAlerts: 0,
  unreadNotif: 0,
  bumpUnread: () => {},
  clearUnread: () => {},
});

/* single-flight guard for the 10-query count storm (module scope) */
const fetchingRef = { current: false };

export function useAdminCounts() {
  return useContext(Ctx);
}

export function AdminCountsProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  /* V20 debounced refresh — rapid mutations coalesce into ONE refetch */
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshDebounced = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => setRefreshKey((k) => k + 1), 600);
  }, []);

  useEffect(() => {
    if (!session || profile?.role !== 'admin') return;
    let alive = true;
    const fetching = fetchingRef.current;
    if (fetching) return; // single-flight: never stack 10-query storms
    fetchingRef.current = true;
    (async () => {
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
      fetchingRef.current = false;
      if (!alive) return;
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
    })();
    return () => { alive = false; /* fetchingRef reset by the in-flight completion itself */ };
  }, [session, profile?.role, refreshKey]);

  /* V20 — unread notifications: initial fetch + realtime push */
  useEffect(() => {
    if (!session || profile?.role !== 'admin') { setUnreadNotif(0); return; }
    let alive = true;
    getUnreadNotificationCount().then((n) => { if (alive) setUnreadNotif(n); });
    const unsub = subscribeAdminNotifications({
      onInsert: (n: AdminNotification) => { if (alive && !n.is_read) setUnreadNotif((c) => c + 1); },
      onUpdate: () => {
        // mark-read events — debounced recount (cheap head count)
        if (alive) {
          if (refreshTimer.current) clearTimeout(refreshTimer.current);
          refreshTimer.current = setTimeout(() => {
            getUnreadNotificationCount().then((n) => { if (alive) setUnreadNotif(n); });
          }, 500);
        }
      },
    });
    return () => { alive = false; unsub(); };
  }, [session, profile?.role]);

  const bumpUnread = useCallback((delta: number) => {
    setUnreadNotif((c) => Math.max(0, c + delta));
  }, []);
  const clearUnread = useCallback(() => setUnreadNotif(0), []);

  const badge = useCallback(
    (key?: BadgeKey) => {
      if (!key || !counts) return 0;
      if (key === 'pendingPosts') return counts.pendingPosts;
      if (key === 'pendingKyc') return counts.pendingKyc;
      if (key === 'pendingRoleReq') return counts.pendingRoleReq;
      if (key === 'pendingPhotographers') return counts.pendingPhotographers;
      return 0;
    },
    [counts],
  );

  const pendingAlerts = useMemo(
    () =>
      (counts?.pendingPosts || 0) +
      (counts?.pendingKyc || 0) +
      (counts?.pendingRoleReq || 0) +
      (counts?.pendingPhotographers || 0),
    [counts],
  );

  const value = useMemo(
    () => ({ counts, refresh, refreshDebounced, badge, pendingAlerts, unreadNotif, bumpUnread, clearUnread }),
    [counts, refresh, refreshDebounced, badge, pendingAlerts, unreadNotif, bumpUnread, clearUnread],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
