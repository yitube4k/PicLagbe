import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { COX_SPOTS } from '../lib/constants';

type AuthMode = 'login' | 'register' | 'photographer';

export default function Auth() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const modeParam = searchParams.get('mode') as AuthMode;
  const [mode, setMode] = useState<AuthMode>(
    ['login', 'register', 'photographer'].includes(modeParam) ? modeParam : 'login'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('লাবণী পয়েন্ট');
  const [expYears, setExpYears] = useState('2');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (['login', 'register', 'photographer'].includes(modeParam)) {
      setMode(modeParam);
    }
  }, [modeParam]);

  // Role-based redirect if already logged in
  useEffect(() => {
    if (session && profile) {
      const role = profile.role;
      if (role === 'admin') navigate('/admin', { replace: true });
      else if (role === 'photographer') navigate('/studio', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [session, profile, navigate]);

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setSearchParams({ mode: newMode });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrorMsg('ইমেইল বা পাসওয়ার্ড ভুল। আবার চেষ্টা করুন।');
          } else {
            setErrorMsg(error.message);
          }
        } else {
          // Redirect handled by session useEffect
        }
      } else {
        // Register or Photographer
        const isPhotographer = mode === 'photographer';
        const roleValue = isPhotographer ? 'photographer' : 'customer';

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: roleValue,
              phone: phone.trim() || null,
            },
          },
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }

        if (isPhotographer && data.user) {
          const matchedSpot = COX_SPOTS.find((s) => s.nameBn === location) || COX_SPOTS[0];
          const slug =
            fullName
              .trim()
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-') +
            '-' +
            Math.floor(100 + Math.random() * 900);

          const { error: photoErr } = await supabase.from('photographers').insert({
            user_id: data.user.id,
            slug,
            display_name: fullName.trim(),
            full_location: location,
            home_spot: matchedSpot.key,
            experience_years: Number(expYears) || 1,
            starting_price: 4000,
            profile_status: 'pending',
          });

          if (photoErr) {
            console.error('Photographer profile creation error:', photoErr);
          }

          setSuccessMsg('স্টুডিও অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! অ্যাডমিন অ্যাপ্রুভালের জন্য অপেক্ষা করুন।');
          setTimeout(() => navigate('/studio'), 1500);
        } else {
          setSuccessMsg('অ্যাকাউন্ট তৈরি সফল! ইমেইল ভেরিফাই করুন অথবা লগইন করুন।');
          setTimeout(() => navigate('/dashboard'), 1500);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg('একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 pt-28 pb-24">
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        {/* Left Visual Panel (Hidden on mobile) */}
        <div className="hidden lg:block glass rounded-xl3 p-10 relative overflow-hidden">
          <div className="w-64 h-64 rounded-full bg-sunset-gold/25 blur-3xl absolute -top-20 -left-20 pointer-events-none" />
          <div className="w-64 h-64 rounded-full bg-sunset-coral/25 blur-3xl absolute -bottom-20 -right-20 pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-sunset-gold">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="14.31" y1="8" x2="20.05" y2="17.94" />
                <line x1="9.69" y1="8" x2="21.17" y2="8" />
                <line x1="7.38" y1="12" x2="13.12" y2="2.06" />
                <line x1="9.69" y1="16" x2="3.95" y2="6.06" />
                <line x1="14.31" y1="16" x2="2.83" y2="16" />
                <line x1="16.62" y1="12" x2="10.88" y2="21.94" />
              </svg>
            </div>

            <h2 className="text-3xl font-extrabold text-white leading-tight">
              কক্সবাজারের <span className="grad-text">#১ ফটোগ্রাফার</span> প্ল্যাটফর্ম
            </h2>

            <div className="space-y-3.5 pt-2">
              <div className="glass p-3.5 rounded-xl2 flex items-center gap-3 text-sm text-white/80">
                <span className="text-sunset-gold font-bold">✓</span>
                <span>ভেরিফায়েড প্রফেশনাল ফটোগ্রাফার</span>
              </div>
              <div className="glass p-3.5 rounded-xl2 flex items-center gap-3 text-sm text-white/80">
                <span className="text-sunset-gold font-bold">✓</span>
                <span>স্বচ্ছ বাজেট — লুকানো চার্জ নেই</span>
              </div>
              <div className="glass p-3.5 rounded-xl2 flex items-center gap-3 text-sm text-white/80">
                <span className="text-sunset-gold font-bold">✓</span>
                <span>নিরাপদ বুকিং — অগ্রিম ছাড়াই</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-xl2 mt-6">
              <p className="text-xs text-white/70 italic leading-relaxed">
                “লাবণী পয়েন্টের সূর্যাস্ত আর আমাদের বিয়ের মুহূর্তগুলো চিরস্মরণীয় হয়ে আছে ফটোলাগবে-এর বদৌলতে।”
              </p>
              <span className="text-[11px] text-sunset-gold mt-2 block font-semibold">
                — তানভীর ও বৃষ্টি, ঢাকা
              </span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="glass-strong rounded-xl3 p-6 sm:p-8 shadow-glass-lg border border-white/[0.15]">
          {/* Tab Switcher */}
          <div className="glass rounded-full p-1.5 flex gap-1 mb-6">
            <button
              type="button"
              onClick={() => handleModeChange('login')}
              className={mode === 'login' ? 'chip-active flex-1 justify-center rounded-full py-2 text-xs sm:text-sm' : 'chip flex-1 justify-center !border-transparent text-white/70 hover:text-white py-2 text-xs sm:text-sm'}
            >
              লগইন
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('register')}
              className={mode === 'register' ? 'chip-active flex-1 justify-center rounded-full py-2 text-xs sm:text-sm' : 'chip flex-1 justify-center !border-transparent text-white/70 hover:text-white py-2 text-xs sm:text-sm'}
            >
              রেজিস্টার
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('photographer')}
              className={mode === 'photographer' ? 'chip-active flex-1 justify-center rounded-full py-2 text-xs sm:text-sm' : 'chip flex-1 justify-center !border-transparent text-white/70 hover:text-white py-2 text-xs sm:text-sm'}
            >
              ফটোগ্রাফার হন
            </button>
          </div>

          <h3 className="text-xl font-bold text-white mb-1">
            {mode === 'login'
              ? 'স্বাগতম ফিরে!'
              : mode === 'register'
              ? 'অ্যাকাউন্ট খুলুন'
              : 'আপনার স্টুডিও শুরু করুন'}
          </h3>
          <p className="text-xs text-white/50 mb-6">
            {mode === 'login'
              ? 'আপনার ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।'
              : mode === 'register'
              ? 'ফটোলাগবে কমিউনিটিতে যুক্ত হন।'
              : 'কক্সবাজারে আপনার ফটোগ্রাফি ব্যবসা প্রসারিত করুন।'}
          </p>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {(mode === 'register' || mode === 'photographer') && (
              <div>
                <label className="field-label">পূর্ণ নাম</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="আপনার নাম"
                  className="glass-input"
                />
              </div>
            )}

            <div>
              <label className="field-label">ইমেইল ঠিকানা</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="glass-input"
              />
            </div>

            <div className="relative">
              <label className="field-label">পাসওয়ার্ড</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  className="glass-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label="পাসওয়ার্ড দেখান"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs font-semibold"
                >
                  {showPassword ? 'লুকান' : 'দেখুন'}
                </button>
              </div>
            </div>

            {mode === 'photographer' && (
              <>
                <div>
                  <label className="field-label">মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="glass-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">প্রধান স্পট</label>
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="glass-select"
                    >
                      {COX_SPOTS.map((s) => (
                        <option key={s.key} value={s.nameBn}>
                          {s.nameBn}
                        </option>
                      ))}
                      <option value="অন্যান্য">অন্যান্য</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">অভিজ্ঞতা (বছর)</label>
                    <input
                      type="number"
                      min={1}
                      value={expYears}
                      onChange={(e) => setExpYears(e.target.value)}
                      className="glass-input"
                    />
                  </div>
                </div>
              </>
            )}

            {errorMsg && (
              <div className="bdg-rejected p-3 rounded-xl2 text-xs w-full justify-center">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="bdg-accepted p-3 rounded-xl2 text-xs w-full justify-center">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base mt-2"
            >
              {loading
                ? '⏳ অপেক্ষা করুন…'
                : mode === 'login'
                ? 'লগইন করুন'
                : mode === 'register'
                ? 'রেজিস্টার করুন'
                : 'স্টুডিও আবেদন জমা দিন'}
            </button>
          </form>

          {/* Footer Switcher */}
          <div className="text-xs text-white/45 text-center mt-6 pt-4 border-t border-white/[0.08]">
            {mode === 'login' ? (
              <p>
                অ্যাকাউন্ট নেই?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('register')}
                  className="text-sunset-gold font-semibold hover:underline"
                >
                  রেজিস্টার করুন
                </button>
              </p>
            ) : (
              <p>
                ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('login')}
                  className="text-sunset-gold font-semibold hover:underline"
                >
                  লগইন করুন
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
