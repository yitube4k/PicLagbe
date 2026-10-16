import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toBn } from '../lib/utils';
import { AIcon } from './icons';
import {
  ADMIN_NAV_BY_SLUG, BOTTOM_SLUGS, MORE_SHEET_SLUGS, NAV_GROUPS, adminPath, type AdminSlug,
} from './nav';
import { AdminCountsProvider, useAdminCounts } from './counts';
import { SnackbarProvider } from '../components/admin/kit';

/* ═══ V18 AdminLayout — full-screen app shell (no site navbar/footer) ═══
   Android-style: mobile top app bar + bottom nav (4 + আরও sheet) + safe-area;
   desktop: grouped sidebar rail. Per Gemini 4 Argon spec. */

export default function AdminLayout() {
  return (
    <AdminCountsProvider>
      <SnackbarProvider>
        <AdminShell />
      </SnackbarProvider>
    </AdminCountsProvider>
  );
}

function AdminShell() {
  const { session, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !session) navigate('/auth?mode=login');
  }, [authLoading, session, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] max-w-6xl mx-auto px-6 pt-32 pb-20">
        <div className="skeleton h-40 rounded-xl3" />
      </div>
    );
  }

  if (!session || profile?.role !== 'admin') {
    return <AdminLock />;
  }

  return <AdminChrome />;
}

/* ── lock screen (admin-only) — preserved from V14 guidance flow ── */
function AdminLock() {
  const { session, profile } = useAuth();
  return (
    <div className="min-h-[100dvh] max-w-xl mx-auto px-6 pt-36 pb-20">
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
            <ol className="text-[14.5px] text-white/70 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Supabase Dashboard খুলুন → আপনার প্রজেক্ট → <span className="text-white/90 font-semibold">SQL Editor</span></li>
              <li>নিচের SQL রান করুন (আপনার ইমেইল বসিয়ে):</li>
            </ol>
            <pre className="text-[12.5px] leading-relaxed bg-twilight-950/80 border border-white/[0.08] rounded-lg p-3 overflow-x-auto text-emerald-300 whitespace-pre">{`update public.profiles
   set role = 'admin'
 where email = 'আপনার-ইমেইল@gmail.com';`}</pre>
            <ol className="text-[14.5px] text-white/70 space-y-2 list-decimal list-inside leading-relaxed" start={3}>
              <li>এই পেজ <span className="text-white/90 font-semibold">Reload</span> দিন — তারপর সরাসরি <span className="text-white/90 font-semibold">/admin</span> ঠিকানায় যান।</li>
            </ol>
          </div>
        )}

        <button type="button" onClick={() => window.location.reload()} className="btn-ghost w-full justify-center">
          ↻ Reload করুন
        </button>
      </div>
    </div>
  );
}

/* ── the real chrome ── */
function AdminChrome() {
  const { profile } = useAuth();
  const { pendingAlerts, badge, unreadNotif } = useAdminCounts();
  const { pathname } = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  // close More sheet on route change
  useEffect(() => { setSheetOpen(false); }, [pathname]);

  const currentSlug = (pathname.replace(/^\/admin\//, '').replace(/^\/admin$/, 'dashboard') || 'dashboard') as AdminSlug;
  const current = ADMIN_NAV_BY_SLUG[currentSlug];

  const moreBadges = MORE_SHEET_SLUGS.reduce((sum, s) => sum + badge(ADMIN_NAV_BY_SLUG[s].badgeKey), 0);

  return (
    <div className="admin-shell min-h-[100dvh] flex bg-twilight-950">
      {/* ══ Desktop sidebar rail (lg+) ══ */}
      <aside className="hidden lg:flex w-64 shrink-0 h-[100dvh] sticky top-0 flex-col glass-strong border-r border-white/[0.06]">
        <RailHeader />
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {NAV_GROUPS.map((g) => (
            <div key={g.title}>
              <p className="px-3 mb-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-white/30">{g.title}</p>
              <div className="space-y-0.5">
                {g.slugs.map((slug) => (
                  <RailItem key={slug} slug={slug} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <RailProfile />
      </aside>

      {/* ══ Main column ══ */}
      <div className="flex-1 min-w-0 flex flex-col min-h-[100dvh]">
        {/* Mobile top app bar */}
        <header className="lg:hidden sticky top-0 z-30 glass-strong border-b border-white/[0.06] pt-[env(safe-area-inset-top)]">
          <div className="h-14 px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 shrink-0 rounded-lg bg-sunset-soft border border-sunset-gold/30 grid place-items-center text-sunset-gold">
                <AIcon name={current?.icon || 'dashboard'} size={17} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] grad-text leading-none">অ্যাডমিন</p>
                <h1 className="text-[15px] font-extrabold text-white leading-tight truncate">{current?.label}</h1>
              </div>
            </div>
            {pendingAlerts > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11.5px] font-bold text-amber-300 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {toBn(pendingAlerts)} অপেক্ষমাণ
              </span>
            )}
            {/* V20 — নোটিফিকেশন বেল (অপঠিত ব্যাজ) */}
            <Link
              to={adminPath('notification')}
              aria-label={`নোটিফিকেশন${unreadNotif > 0 ? ` — ${toBn(unreadNotif)} অপঠিত` : ''}`}
              className="relative w-10 h-10 shrink-0 rounded-full grid place-items-center text-white/70 hover:text-white hover:bg-white/[0.07] transition-colors active:scale-90"
            >
              <AIcon name="bell" size={19} strokeWidth={unreadNotif > 0 ? 2.1 : 1.8} />
              {unreadNotif > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-sunset-coral text-white text-[10px] font-extrabold grid place-items-center ring-2 ring-twilight-950 tabular-nums admin-badge-pulse">
                  {toBn(unreadNotif > 99 ? 99 : unreadNotif)}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Outlet */}
        <main className="flex-1 min-w-0 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-10">
          <div key={pathname} className="admin-page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ══ Mobile bottom nav ══ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)]" aria-label="অ্যাডমিন নেভিগেশন">
        <div className="h-16 grid grid-cols-5 items-center px-1">
          {BOTTOM_SLUGS.map((slug) => (
            <BottomItem key={slug} slug={slug} active={currentSlug === slug} />
          ))}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-1 h-14 select-none"
            aria-expanded={sheetOpen}
            aria-label="আরও সেকশন"
          >
            <span className={`w-14 h-8 rounded-full grid place-items-center relative transition-colors duration-200 ${sheetOpen || moreBadges > 0 ? 'text-sunset-gold' : 'text-white/55'}`}>
              {sheetOpen || moreBadges > 0 ? <span className="absolute inset-0 rounded-full bg-sunset-gold/15" /> : null}
              <AIcon name="grid" size={21} strokeWidth={moreBadges > 0 || sheetOpen ? 2.1 : 1.75} />
              {moreBadges > 0 && (
                <span className="absolute -top-0.5 right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-sunset-coral text-white text-[10px] font-extrabold grid place-items-center ring-2 ring-twilight-950 tabular-nums">
                  {toBn(moreBadges > 99 ? 99 : moreBadges)}
                </span>
              )}
            </span>
            <span className={`text-[10.5px] font-semibold leading-none ${sheetOpen ? 'text-sunset-gold' : 'text-white/55'}`}>আরও</span>
          </button>
        </div>
      </nav>

      {/* ══ More bottom sheet ══ */}
      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="আরও সেকশন">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setSheetOpen(false)} />
          <div className="admin-sheet-enter absolute bottom-0 inset-x-0 glass-strong rounded-t-xl3 border-t border-white/15 p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[80dvh] overflow-y-auto">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-sm font-extrabold text-white">সব সেকশন</p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 rounded-full glass grid place-items-center text-white/60"
                aria-label="বন্ধ করুন"
              >
                <AIcon name="close" size={15} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MORE_SHEET_SLUGS.map((slug) => {
                const nav = ADMIN_NAV_BY_SLUG[slug];
                const b = badge(nav.badgeKey);
                return (
                  <NavLink
                    key={slug}
                    to={adminPath(slug)}
                    className={({ isActive }) =>
                      `admin-press relative rounded-xl2 border p-3 flex flex-col items-center gap-2 text-center min-h-[84px] justify-center transition-colors ${
                        isActive
                          ? 'bg-sunset-soft border-sunset-gold/40 text-sunset-gold'
                          : 'bg-white/[0.04] border-white/[0.07] text-white/70 hover:bg-white/[0.07]'
                      }`
                    }
                  >
                    <span className="relative">
                      <AIcon name={nav.icon} size={22} />
                      {b > 0 && (
                        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-sunset-coral text-white text-[9.5px] font-extrabold grid place-items-center">
                          {toBn(b > 99 ? 99 : b)}
                        </span>
                      )}
                    </span>
                    <span className="text-[11.5px] font-bold leading-tight">{nav.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── desktop rail pieces ── */
function RailHeader() {
  return (
    <div className="h-14 px-4 flex items-center gap-2.5 border-b border-white/[0.06] shrink-0">
      <span className="w-8 h-8 rounded-lg bg-sunset-soft border border-sunset-gold/30 grid place-items-center text-sunset-gold">
        <AIcon name="shield" size={17} strokeWidth={2} />
      </span>
      <div className="leading-tight">
        <p className="font-extrabold grad-text text-[15px]">অ্যাডমিন প্যানেল</p>
        <p className="text-[10px] text-white/35 font-semibold tracking-wide">ফটোলাগবে কন্ট্রোল সেন্টার</p>
      </div>
    </div>
  );
}

function RailItem({ slug }: { slug: AdminSlug }) {
  const nav = ADMIN_NAV_BY_SLUG[slug];
  const { badge } = useAdminCounts();
  const b = badge(nav.badgeKey);
  return (
    <NavLink
      to={adminPath(slug)}
      className={({ isActive }) =>
        `relative h-10 px-3 rounded-xl2 flex items-center gap-3 text-sm transition-all border ${
          isActive
            ? 'bg-sunset-soft border-sunset-gold/35 text-sunset-gold font-bold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-sunset-gold before:rounded-r'
            : 'border-transparent text-white/65 hover:text-white hover:bg-white/[0.05] font-medium'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <AIcon name={nav.icon} size={19} strokeWidth={isActive ? 2.1 : 1.75} />
          <span className="flex-1 truncate">{nav.label}</span>
          {b > 0 && (
            <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30 tabular-nums">
              {toBn(b)}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function RailProfile() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const email = profile?.email || 'admin';
  return (
    <div className="p-3 border-t border-white/[0.06] shrink-0 space-y-2">
      <Link
        to="/"
        className="h-10 px-3 rounded-xl2 flex items-center gap-3 text-sm font-medium text-white/65 hover:text-white hover:bg-white/[0.05] transition-colors"
      >
        <AIcon name="arrow-up" size={17} className="rotate-[135deg]" />
        সাইটে ফিরে যান
      </Link>
      <div className="rounded-xl2 bg-white/[0.04] border border-white/[0.06] p-3 flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-full bg-sunset-soft border border-sunset-gold/30 grid place-items-center text-sunset-gold font-extrabold text-sm shrink-0">
          {email.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-white truncate">{email}</p>
          <p className="text-[10.5px] font-bold text-sunset-gold tracking-wide">অ্যাডমিন</p>
        </div>
        <button
          type="button"
          title="লগআউট"
          onClick={async () => { await supabase.auth.signOut(); navigate('/'); }}
          className="w-8 h-8 rounded-full grid place-items-center text-white/40 hover:text-red-300 hover:bg-red-400/10 transition-colors"
        >
          <AIcon name="logout" size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── mobile bottom nav item (M3 pill style) ── */
function BottomItem({ slug, active }: { slug: AdminSlug; active: boolean }) {
  const nav = ADMIN_NAV_BY_SLUG[slug];
  const { badge } = useAdminCounts();
  const b = badge(nav.badgeKey);
  return (
    <NavLink
      to={adminPath(slug)}
      className="flex flex-col items-center justify-center gap-1 py-1 h-14 select-none"
      aria-current={active ? 'page' : undefined}
    >
      <span className={`w-14 h-8 rounded-full grid place-items-center relative transition-colors duration-200 ${active ? 'bg-sunset-gold/15 text-sunset-gold' : 'text-white/55'}`}>
        <AIcon name={nav.icon} size={21} strokeWidth={active ? 2.1 : 1.75} />
        {b > 0 && (
          <span className={`absolute -top-0.5 right-2.5 min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-extrabold grid place-items-center ring-2 ring-twilight-950 tabular-nums ${active ? 'bg-sunset-gold text-twilight-950' : 'bg-sunset-coral text-white'}`}>
            {toBn(b > 99 ? 99 : b)}
          </span>
        )}
      </span>
      <span className={`text-[10.5px] leading-none ${active ? 'font-bold text-sunset-gold' : 'font-medium text-white/55'}`}>
        {nav.label}
      </span>
    </NavLink>
  );
}
