import React from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '../lib/constants';
import { toBn } from '../lib/utils';

export default function Footer() {
  const currentYearBn = toBn(new Date().getFullYear());

  return (
    <footer className="border-t border-white/[0.08] bg-twilight-950/80 backdrop-blur-xl mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Top Row */}
        <div className="flex flex-wrap justify-between gap-8 pb-8">
          {/* Brand Block */}
          <div className="max-w-xs flex flex-col items-start gap-3">
            <Link
              to="/"
              aria-label={`${SITE.name} হোমপেজ`}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 glass rounded-xl2 flex items-center justify-center shrink-0 group-hover:border-sunset-gold/45 transition-all duration-300">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="url(#footer-aperture-grad)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <defs>
                    <linearGradient id="footer-aperture-grad" x1="0%" y1="0%" x2="100%" y2="100%">
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
              <span className="text-xl font-bold grad-text tracking-tight">
                {SITE.name}
              </span>
            </Link>

            <p className="text-sm text-white/50 leading-relaxed">
              {SITE.tagline}
            </p>

            <span className="chip cursor-default">
              কক্সবাজার · বাংলাদেশ
            </span>
          </div>

          {/* 3 Navigation Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-14">
            {/* Column 1: প্ল্যাটফর্ম */}
            <div>
              <h3 className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-3">
                প্ল্যাটফর্ম
              </h3>
              <Link
                to="/photographers"
                className="text-sm text-white/65 hover:text-sunset-gold transition block mb-2"
              >
                ফটোগ্রাফার খুঁজুন
              </Link>
              <Link
                to="/finder"
                className="text-sm text-white/65 hover:text-sunset-gold transition block mb-2"
              >
                ম্যাপ ফাইন্ডার
              </Link>
              <Link
                to="/auth?mode=photographer"
                className="text-sm text-white/65 hover:text-sunset-gold transition block mb-2"
              >
                ফটোগ্রাফার হন
              </Link>
            </div>

            {/* Column 2: কমিউনিটি */}
            <div>
              <h3 className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-3">
                কমিউনিটি
              </h3>
              <Link
                to="/community"
                className="text-sm text-white/65 hover:text-sunset-gold transition block mb-2"
              >
                চ্যাট
              </Link>
              <Link
                to="/blog"
                className="text-sm text-white/65 hover:text-sunset-gold transition block mb-2"
              >
                ব্লগ
              </Link>
              <Link
                to="/photographers"
                className="text-sm text-white/65 hover:text-sunset-gold transition block mb-2"
              >
                রিভিউ
              </Link>
            </div>

            {/* Column 3: সাপোর্ট */}
            <div>
              <h3 className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-3">
                সাপোর্ট
              </h3>
              <Link
                to="/community"
                className="text-sm text-white/65 hover:text-sunset-gold transition block mb-2"
              >
                যোগাযোগ
              </Link>
              <Link
                to="/blog"
                className="text-sm text-white/65 hover:text-sunset-gold transition block mb-2"
              >
                গাইড
              </Link>
              <Link
                to="/blog"
                className="text-sm text-white/65 hover:text-sunset-gold transition block mb-2"
              >
                শর্তাবলি
              </Link>
            </div>
          </div>
        </div>

        {/* Glow Divider */}
        <hr className="divider-glow" />

        {/* Bottom Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-5 text-xs text-white/40">
          <p>© {currentYearBn} ফটোলাগবে — সর্বস্বত্ব সংরক্ষিত</p>

          <div className="flex items-center gap-4">
            <span>কক্সবাজারে ভালোবাসা দিয়ে তৈরি 🌊</span>

            <div className="flex items-center gap-2">
              <Link
                to="/photographers"
                aria-label="ফটোগ্রাফার গ্যালারি"
                className="w-8 h-8 glass !rounded-lg flex items-center justify-center text-white/65 hover:text-sunset-gold hover:border-sunset-gold/40 transition"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </Link>

              <Link
                to="/community"
                aria-label="যোগাযোগ ও কমিউনিটি"
                className="w-8 h-8 glass !rounded-lg flex items-center justify-center text-white/65 hover:text-sunset-gold hover:border-sunset-gold/40 transition"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </Link>

              <Link
                to="/finder"
                aria-label="কক্সবাজার ম্যাপ ফাইন্ডার"
                className="w-8 h-8 glass !rounded-lg flex items-center justify-center text-white/65 hover:text-sunset-gold hover:border-sunset-gold/40 transition"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
