import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Photographer, Package } from '../lib/types';
import { toBn, taka } from '../lib/utils';
import { COX_SPOTS } from '../lib/constants';

interface BookingModalProps {
  p: Photographer;
  packages: Package[];
  open: boolean;
  onClose: () => void;
}

const TIME_SLOTS = [
  { id: 'morning', label: 'সকাল (৬টা–৯টা)' },
  { id: 'afternoon', label: 'বিকেল (৩টা–৬টা)' },
  { id: 'golden', label: 'গোল্ডেন আওয়ার (৪:৩০–৬টা)' },
  { id: 'night', label: 'নাইট (৮টা–১০টা)' },
];

export default function BookingModal({ p, packages, open, onClose }: BookingModalProps) {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedPkgId, setSelectedPkgId] = useState<string>(packages[0]?.id || '');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('golden');
  const [spot, setSpot] = useState(COX_SPOTS[0]?.nameBn || 'লাবণী পয়েন্ট');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      if (packages.length > 0 && !selectedPkgId) {
        setSelectedPkgId(packages[0].id);
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, packages, selectedPkgId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const selectedPackage = packages.find((pkg) => pkg.id === selectedPkgId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate) {
      setErrorMsg('দয়া করে শুটিংয়ের তারিখ নির্বাচন করুন।');
      return;
    }

    if (!session || !profile) {
      onClose();
      navigate('/auth', { state: { from: location } });
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const slotLabel = TIME_SLOTS.find((s) => s.id === eventTime)?.label || eventTime;

      const { error } = await supabase.from('bookings').insert({
        photographer_id: p.id,
        customer_id: profile.id,
        package_id: selectedPackage?.id || null,
        event_date: eventDate,
        event_time: slotLabel,
        event_location: spot,
        notes: notes.trim() || null,
        status: 'pending',
      });

      if (error) {
        console.error('Booking insert error:', error);
        setErrorMsg('বুকিং রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      } else {
        onClose();
        navigate('/dashboard?booked=1');
      }
    } catch (err) {
      console.error('Booking error:', err);
      setErrorMsg('একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes modalScaleIn {
          0% {
            opacity: 0;
            transform: scale(0.96) translateY(12px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .modal-animate-in {
          animation: modalScaleIn 0.25s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Panel */}
      <div className="fixed z-[90] inset-x-4 top-[6vh] mx-auto max-w-lg glass-strong rounded-xl3 max-h-[88vh] overflow-y-auto no-scrollbar modal-animate-in shadow-glass-lg border border-white/[0.15]">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-twilight-900/90 backdrop-blur-xl p-5 border-b border-white/[0.08] flex justify-between items-center">
          <div className="flex items-center gap-3">
            {p.profile_photo_url ? (
              <img
                src={p.profile_photo_url}
                alt={p.display_name}
                className="w-11 h-11 rounded-full ring-2 ring-sunset-gold/40 object-cover"
              />
            ) : (
              <div className="w-11 h-11 rounded-full ring-2 ring-sunset-gold/40 bg-sunset-gradient flex items-center justify-center font-bold text-[#1A0E06]">
                {(p.display_name || 'ফ').slice(0, 1)}
              </div>
            )}
            <div>
              <h3 className="font-bold text-white text-base leading-tight">
                {p.display_name}
              </h3>
              <p className="text-xs text-white/50 mt-0.5">বুকিং রিকোয়েস্ট</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="glass rounded-full p-2 text-white/80 hover:text-white hover:rotate-90 transition-all duration-300"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 1) Package Selector */}
          <div>
            <label className="field-label">প্যাকেজ বাছাই</label>
            {packages.length > 0 ? (
              <div className="space-y-2.5 mt-1.5">
                {packages.map((pkg) => {
                  const isSelected = selectedPkgId === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPkgId(pkg.id)}
                      className={`w-full text-left p-4 rounded-xl2 transition-all duration-200 border ${
                        isSelected
                          ? 'border-sunset-gold/60 bg-sunset-soft shadow-sunset-glow'
                          : 'border-white/10 bg-white/[0.04] hover:border-white/25'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm sm:text-base">
                          {pkg.name}
                        </span>
                        <span className="price-tag">{taka(pkg.price)}</span>
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-white/60 line-clamp-1 mb-1.5">
                          {pkg.description}
                        </p>
                      )}
                      <span className="text-[11px] text-white/50">
                        ⏱ {toBn(pkg.duration_hours || 0)} ঘণ্টা
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                type="text"
                disabled
                value="কাস্টম বুকিং (ফটোগ্রাফারের সাথে আলোচনা)"
                className="glass-input opacity-75 cursor-not-allowed text-xs"
              />
            )}
          </div>

          {/* 2) Date & Time Slots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">তারিখ</label>
              <input
                type="date"
                required
                min={todayStr}
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="glass-input"
              />
            </div>

            <div>
              <label className="field-label">সময়</label>
              <select
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="glass-select"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3) Spot Select */}
          <div>
            <label className="field-label">স্পট</label>
            <select
              value={spot}
              onChange={(e) => setSpot(e.target.value)}
              className="glass-select"
            >
              {COX_SPOTS.map((s) => (
                <option key={s.key} value={s.nameBn}>
                  {s.nameBn} ({s.kind})
                </option>
              ))}
              <option value="অন্যান্য">অন্যান্য (আলোচনা সাপেক্ষ)</option>
            </select>
          </div>

          {/* 4) Notes Textarea */}
          <div>
            <label className="field-label">বিশেষ নির্দেশনা (ঐচ্ছিক)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="যেমন: সানসেট শট চাই, ২ জন থাকব…"
              className="glass-input resize-none"
            />
          </div>

          {/* 5) Summary Card */}
          <div className="glass rounded-xl2 p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60">প্যাকেজ:</span>
              <span className="font-semibold text-white">
                {selectedPackage ? selectedPackage.name : 'কাস্টম বুকিং'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60">প্রস্তাবিত বাজেট:</span>
              <span className="price-tag">
                {selectedPackage ? taka(selectedPackage.price) : 'আলোচনা সাপেক্ষ'}
              </span>
            </div>
            <hr className="divider-glow" />
            <p className="text-[11px] text-white/50 leading-relaxed text-center">
              কোনো অগ্রিম পেমেন্ট লাগবে না — ফটোগ্রাফার গ্রহণ করলে কনফার্ম হবে
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bdg-rejected w-full justify-center py-2 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !eventDate}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {submitting ? '⏳ পাঠানো হচ্ছে…' : '✓ বুকিং রিকোয়েস্ট পাঠান'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
