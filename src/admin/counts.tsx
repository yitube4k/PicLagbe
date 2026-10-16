import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { BadgeKey } from './nav';

/* ═══ V18 shared admin counts — single source for nav badges + dashboard tiles ═══ */

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
  badge: (key?: BadgeKey) => number;
  pendingAlerts: number;
}

const Ctx = createContext<AdminCountsCtx>({
  counts: null,
  refresh: () => {},
  badge: () => 0,
  pendingAlerts: 0,
});

export function useAdminCounts() {
  return useContext(Ctx);
}

export function AdminCountsProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!session || profile?.role !== 'admin') return;
    let alive = true;
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
    return () => { alive = false; };
  }, [session, profile?.role, refreshKey]);

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

  const value = useMemo(() => ({ counts, refresh, badge, pendingAlerts }), [counts, refresh, badge, pendingAlerts]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
