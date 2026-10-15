import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { SITE } from '../lib/constants';
import SearchPanel from './SearchPanel';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'হোম',
    to: '/',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: 'ফটোগ্রাফার',
    to: '/photographers',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    label: 'ম্যাপ ফাইন্ডার',
    to: '/finder',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
  },
  {
    label: 'কমিউনিটি',
    to: '/community',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'ব্লগ',
    to: '/blog',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
];

export default function Navbar() {
  const { session, profile } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  // সার্চ প্যানেলের বাইরে ক্লিক করলে বন্ধ
  useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [searchOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        setSearchOpen(false);
      }
    };

    if (drawerOpen || searchOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawerOpen, searchOpen]);

  const getRoleConfig = () => {
    const role = profile?.role || 'customer';
    if (role === 'admin') {
      return { to: '/admin', label: 'অ্যাডমিন' };
    }
    if (role === 'photographer') {
      return { to: '/studio', label: 'মাই স্টুডিও' };
    }
    return { to: '/dashboard', label: 'আমার ড্যাশবোর্ড' };
  };

  const getInitials = (name?: string | null) => {
    if (!name || !name.trim()) return 'ফ';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const roleConfig = getRoleConfig();

  const renderAvatar = () => {
    if (profile?.avatar_url) {
      return (
        <img
          src={profile.avatar_url}
          alt={profile.full_name || 'প্রোফাইল'}
          className="w-9 h-9 rounded-full ring-2 ring-sunset-gold/40 object-cover shrink-0"
        />
      );
    }
    return (
      <div
        className="w-9 h-9 rounded-full ring-2 ring-sunset-gold/40 bg-sunset-gradient flex items-center justify-center text-xs font-extrabold text-[#1A0E06] shrink-0 select-none"
        title={profile?.full_name || 'প্রোফাইল'}
      >
        {getInitials(profile?.full_name)}
      </div>
    );
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass-strong !rounded-none shadow-glass-md border-b border-white/[0.08] py-3'
            : 'bg-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Brand */}
          <Link
            to="/"
            aria-label={`${SITE.name} হোমপেজ`}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="w-10 h-10 glass rounded-xl2 flex items-center justify-center shrink-0 group-hover:border-sunset-gold/45 transition-all duration-300">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="url(#navbar-aperture-grad)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className=""
              >
                <defs>
                  <linearGradient id="navbar-aperture-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="55%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                </defs>
                <circle cx="12" cy="12" r="10" />
                <line x1="14.31" y1="8" x2="20.05" y2="17.94" />
                <line x1="9.69" y1="8" x2="21.17" y2="8" />
                <line x1="7.38" y1="12" x2="13.12" y2="2.06" />
                <line x1="9.69" y1="16" x2="3.95" y2="6.06" />
                <line x1="14.31" y1="16" x2="2.83" y2="16" />
                <line x1="16.62" y1="12" x2="10.88" y2="21.94" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold grad-text leading-tight tracking-tight">
                {SITE.name}
              </span>
              <span className="text-[10px] tracking-[0.22em] uppercase text-white/50 font-semibold leading-none mt-0.5">
                {SITE.nameEn || 'PHOTOLAGBE'}
              </span>
            </div>
          </Link>

          {/* Center Desktop Navigation Pills */}
          <nav
            aria-label="প্রধান নেভিগেশন"
            className="hidden lg:flex items-center gap-1 glass rounded-full px-2 py-1.5"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  isActive
                    ? 'chip-active rounded-full px-4 py-2 text-sm'
                    : 'text-white/75 hover:bg-white/[0.08] hover:text-white rounded-full px-4 py-2 text-sm font-medium transition-all duration-200'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* ═══ ALWAYS-ON SEARCH (desktop pill + mobile icon) ═══ */}
          <div ref={searchWrapRef} className="nav-search-wrap">
            {/* Desktop trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-expanded={searchOpen}
              aria-label="সার্চ খুলুন"
              className={`hidden md:flex items-center gap-2.5 rounded-full border px-4 min-h-[42px] text-sm font-medium transition-colors ${
                searchOpen
                  ? 'border-sunset-gold/60 bg-white/[0.09] text-white'
                  : 'border-white/[0.12] bg-white/[0.05] text-white/60 hover:text-white hover:border-white/25'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="hidden xl:inline">কক্সবাজারে খুঁজুন…</span>
              <kbd className="hidden xl:inline-flex items-center rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-white/50">
                /
              </kbd>
            </button>

            {/* Mobile trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-expanded={searchOpen}
              aria-label="সার্চ খুলুন"
              className={`md:hidden rounded-xl2 p-2.5 border transition-colors ${
                searchOpen
                  ? 'border-sunset-gold/60 bg-white/[0.09] text-sunset-gold'
                  : 'border-white/[0.12] bg-white/[0.05] text-white/80'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            {/* Dropdown panel */}
            {searchOpen && (
              <div className="nav-search-panel glass-strong !rounded-[18px] p-2 shadow-glass-lg">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45 px-2 pt-1.5 pb-2">
                  ফটোগ্রাফার খুঁজুন
                </p>
                <SearchPanel
                  variant="dropdown"
                  autoFocus
                  onDone={() => setSearchOpen(false)}
                />
              </div>
            )}
          </div>

          {/* Right Desktop Auth / User Action */}
          <div className="hidden lg:flex items-center gap-3">
            {!session ? (
              <>
                <Link
                  to="/auth?mode=login"
                  className="btn-ghost px-5 py-2.5 text-sm"
                >
                  লগইন
                </Link>
                <Link
                  to="/auth?mode=register"
                  className="btn-primary px-5 py-2.5 text-sm"
                >
                  রেজিস্টার
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/chat"
                  aria-label="মেসেজ ইনবক্স"
                  title="মেসেজ"
                  className="glass rounded-full w-10 h-10 flex items-center justify-center text-white/80 hover:text-sunset-gold hover:border-sunset-gold/45 transition-all duration-300"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </Link>
                <Link
                  to={roleConfig.to}
                  className="btn-primary px-5 py-2.5 text-sm"
                >
                  {roleConfig.label}
                </Link>
                <Link
                  to={roleConfig.to}
                  aria-label="প্রোফাইল ও ড্যাশবোর্ড"
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-sunset-coral"
                >
                  {renderAvatar()}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Trigger */}
          <button
            type="button"
            aria-label={drawerOpen ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন'}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((prev) => !prev)}
            className="lg:hidden glass rounded-xl2 p-2.5 text-white/90 hover:text-white focus:outline-none focus:ring-2 focus:ring-sunset-coral/50 transition"
          >
            <div className="w-6 h-5 relative flex flex-col justify-between items-center">
              <span
                className={`w-full h-0.5 bg-current rounded-full transform transition-all duration-300 origin-center ${
                  drawerOpen ? 'rotate-45 translate-y-[9px] text-sunset-gold' : ''
                }`}
              />
              <span
                className={`w-full h-0.5 bg-current rounded-full transition-all duration-300 ${
                  drawerOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
                }`}
              />
              <span
                className={`w-full h-0.5 bg-current rounded-full transform transition-all duration-300 origin-center ${
                  drawerOpen ? '-rotate-45 -translate-y-[9px] text-sunset-gold' : ''
                }`}
              />
            </div>
          </button>
        </div>
      </header>

      {/* Mobile Drawer & Backdrop */}
      <div
        aria-hidden={!drawerOpen}
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
          drawerOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Drawer Panel */}
        <aside
          aria-label="মোবাইল নেভিগেশন মেনু"
          className={`fixed right-4 top-20 w-[280px] glass-strong rounded-xl3 p-6 flex flex-col gap-1.5 transition-all duration-300 transform ${
            drawerOpen
              ? 'translate-x-0 opacity-100'
              : 'translate-x-8 opacity-0'
          }`}
        >
          <nav className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) =>
                  `rounded-xl2 px-4 py-3 flex items-center gap-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-sunset-soft border border-sunset-gold/40 text-sunset-gold font-bold shadow-glass-sm'
                      : 'text-white/85 hover:bg-white/[0.08] hover:text-white'
                  }`
                }
              >
                <span className="text-sunset-gold/90 shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <hr className="divider-glow my-3" />

          {/* Mobile Auth Block */}
          {!session ? (
            <div className="flex flex-col gap-2.5">
              <Link
                to="/auth?mode=login"
                onClick={() => setDrawerOpen(false)}
                className="btn-ghost w-full py-2.5 text-sm justify-center"
              >
                লগইন
              </Link>
              <Link
                to="/auth?mode=register"
                onClick={() => setDrawerOpen(false)}
                className="btn-primary w-full py-2.5 text-sm justify-center"
              >
                রেজিস্টার
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 px-2 py-1">
                {renderAvatar()}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate">
                    {profile?.full_name || 'ব্যবহারকারী'}
                  </span>
                  <span className="text-xs text-white/55 truncate">
                    {profile?.role === 'admin'
                      ? 'অ্যাডমিন প্রোফাইল'
                      : profile?.role === 'photographer'
                      ? 'ভেরিফায়েড ফটোগ্রাফার'
                      : 'সম্মানিত গ্রাহক'}
                  </span>
                </div>
              </div>
              <Link
                to={roleConfig.to}
                onClick={() => setDrawerOpen(false)}
                className="btn-primary w-full py-2.5 text-sm justify-center"
              >
                {roleConfig.label}
              </Link>
              <Link
                to="/chat"
                onClick={() => setDrawerOpen(false)}
                className="btn-ghost w-full py-2.5 text-sm justify-center"
              >
                মেসেজ ইনবক্স
              </Link>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
