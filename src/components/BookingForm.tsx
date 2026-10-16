import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Photographer, Package } from '../lib/types';
import { toBn, taka } from '../lib/utils';
import { COX_SPOTS, SPOT_BY_KEY } from '../lib/constants';

interface BookingFormProps {
  p: Photographer;
  packages: Package[];
  /** External package override (e.g. "Book" clicked on a package card) */
  selectedPkgId?: string | null;
  onPackageChange?: (pkgId: string) => void;
  compact?: boolean;
}

const TIME_SLOTS = [
  { id: 'morning', label: 'সকাল', time: '৬টা–৯টা', icon: '🌅' },
  { id: 'afternoon', label: 'বিকেল', time: '৩টা–৬টা', icon: '☀️' },
  { id: 'golden', label: 'গোল্ডেন আওয়ার', time: '৪:৩০–৬টা', icon: '✨' },
  { id: 'night', label: 'নাইট', time: '৮টা–১০টা', icon: '🌙' },
];

/**
 * প্রিমিয়াম বুকিং ফর্ম (ivory editorial theme)।
 * Insert logic identical to the legacy BookingModal — bookings table, status 'pending'।
 */
export default function BookingForm({ p, packages, selectedPkgId, onPackageChange, compact = false }: BookingFormProps) {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [innerPkgId, setInnerPkgId] = useState<string>(packages[0]?.id || '');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('golden');
  const [spot, setSpot] = useState(SPOT_BY_KEY(p.home_spot || '')?.nameBn || COX_SPOTS[0]?.nameBn || 'লাবণী পয়েন্ট');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedPkgIdResolved = selectedPkgId ?? innerPkgId;
  const setSelectedPkgId = (id: string) => {
    if (onPackageChange) onPackageChange(id);
    else setInnerPkgId(id);
  };

  useEffect(() => {
    if (packages.length > 0 && !selectedPkgIdResolved) {
      setSelectedPkgId(packages[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages]);

  const todayStr = new Date().toISOString().split('T')[0];
  const selectedPackage = packages.find((pkg) => pkg.id === selectedPkgIdResolved);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate) {
      setErrorMsg('দয়া করে শুটিংয়ের তারিখ নির্বাচন করুন।');
      return;
    }

    if (!session || !profile) {
      navigate('/auth', { state: { from: location } });
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const slotLabel = TIME_SLOTS.find((s) => s.id === eventTime)?.label || eventTime;
      const slotTime = TIME_SLOTS.find((s) => s.id === eventTime)?.time || '';
      const slotText = slotTime ? `${slotLabel} (${slotTime})` : slotLabel;

      const { error } = await supabase.from('bookings').insert({
        photographer_id: p.id,
        customer_id: profile.id,
        package_id: selectedPackage?.id || null,
        event_date: eventDate,
        event_time: slotText,
        event_location: spot,
        notes: notes.trim() || null,
        status: 'pending',
      });

      if (error) {
        console.error('Booking insert error:', error);
        setErrorMsg('বুকিং রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      } else {
        navigate('/dashboard?booked=1');
      }
    } catch (err) {
      console.error('Booking error:', err);
      setErrorMsg('একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।');
    } finally {
      setSubmitting(false);
    }
  };

  const prettyDate = eventDate
    ? new Date(eventDate + 'T00:00:00').toLocaleDateString('bn-BD', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-5' : 'space-y-6'} noValidate>
      {/* ═══ ধাপ ১: প্যাকেজ (প্রিমিয়াম কার্ড রেডিও) ═══ */}
      {packages.length > 0 ? (
        <fieldset>
          <legend className="pf-label">১ · প্যাকেজ বাছাই</legend>
          <div className="space-y-2.5 mt-1" role="radiogroup" aria-label="প্যাকেজ">
            {packages.map((pkg) => {
              const active = pkg.id === selectedPkgIdResolved;
              return (
                <label
                  key={pkg.id}
                  className={`bf-pkg flex items-center gap-3 cursor-pointer ${active ? 'bf-pkg-active' : ''}`}
                >
                  <input
                    type="radio"
                    name="bf-package"
                    value={pkg.id}
                    checked={active}
                    onChange={() => setSelectedPkgId(pkg.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`shrink-0 w-[18px] h-[18px] rounded-full border-2 grid place-items-center transition-colors ${
                      active ? 'border-[#1d4d3b]' : 'border-[#cfc4ac]'
                    }`}
                  >
                    {active && <span className="w-2.5 h-2.5 rounded-full bg-[#1d4d3b]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <b className="pf-serif text-[16.5px] text-[#26231e] truncate">{pkg.name}</b>
                      <span className="pf-serif font-bold text-[#1d4d3b] whitespace-nowrap">{taka(pkg.price)}</span>
                    </span>
                    <span className="block text-[12.5px] text-[#8a8172] mt-0.5">
                      ⏱ {toBn(pkg.duration_hours || 0)} ঘণ্টা{pkg.description ? ` · ${pkg.description}` : ''}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <div className="rounded-[12px] border border-[#e6ddcc] bg-[#f3efe6] px-4 py-3 text-xs text-[#6b6357]">
          কোনো প্যাকেজ নেই — কাস্টম বুকিং হিসেবে রিকোয়েস্ট যাবে, দাম আলোচনা সাপেক্ষ।
        </div>
      )}

      {/* ═══ ধাপ ২: তারিখ ও সময় ═══ */}
      <fieldset className="space-y-3">
        <div>
          <label className="pf-label" htmlFor="pf-date">২ · তারিখ</label>
          <div className="relative mt-1">
            <input
              id="pf-date"
              type="date"
              required
              min={todayStr}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="pf-input !pl-11"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[16.5px] pointer-events-none" aria-hidden="true">📅</span>
          </div>
          {prettyDate && (
            <p className="text-[12.5px] text-[#8a8172] mt-1.5">সিলেক্টেড: {prettyDate}</p>
          )}
        </div>

        <div>
          <span className="pf-label">সময়</span>
          <div className="grid grid-cols-2 gap-2 mt-1" role="radiogroup" aria-label="শুটিংয়ের সময়">
            {TIME_SLOTS.map((slot) => {
              const active = eventTime === slot.id;
              return (
                <label
                  key={slot.id}
                  className={`bf-slot ${active ? 'bf-slot-active' : ''}`}
                >
                  <input
                    type="radio"
                    name="bf-slot"
                    value={slot.id}
                    checked={active}
                    onChange={() => setEventTime(slot.id)}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className="text-base leading-none">{slot.icon}</span>
                  <span className="min-w-0">
                    <b className="block text-[14px] leading-tight">{slot.label}</b>
                    <span className="block text-[12px] opacity-75 leading-tight mt-0.5">{slot.time}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </fieldset>

      {/* ═══ ধাপ ৩: স্পট ═══ */}
      <div>
        <label className="pf-label" htmlFor="pf-spot">৩ · শুটিং স্পট</label>
        <select
          id="pf-spot"
          value={spot}
          onChange={(e) => setSpot(e.target.value)}
          className="pf-input mt-1"
        >
          {COX_SPOTS.map((s) => (
            <option key={s.key} value={s.nameBn}>{s.nameBn}</option>
          ))}
          <option value="অন্যান্য">অন্যান্য (আলোচনা সাপেক্ষ)</option>
        </select>
      </div>

      {/* ═══ ধাপ ৪: নোট ═══ */}
      <div>
        <label className="pf-label" htmlFor="pf-notes">৪ · বিশেষ নির্দেশনা (ঐচ্ছিক)</label>
        <textarea
          id="pf-notes"
          rows={compact ? 2 : 3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="যেমন: সানসেট শট চাই, ২ জন থাকব…"
          className="pf-input resize-none mt-1"
        />
      </div>

      {/* ═══ সামারি (গ্রেডিয়েন্ট প্রিমিয়াম কার্ড) ═══ */}
      <div className="bf-summary">
        <div className="flex items-center justify-between gap-3 py-1.5">
          <span className="text-xs font-semibold text-[#6b6357]">প্যাকেজ</span>
          <span className="pf-serif font-bold text-[15px] text-[#26231e] text-right">
            {selectedPackage ? selectedPackage.name : 'কাস্টম বুকিং'}
          </span>
        </div>
        {eventDate && (
          <div className="flex items-center justify-between gap-3 py-1.5 border-t border-[#e6ddcc]/70">
            <span className="text-xs font-semibold text-[#6b6357]">তারিখ</span>
            <span className="text-[14.5px] font-semibold text-[#26231e] text-right">{prettyDate}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 py-2 border-t border-[#e6ddcc]/70">
          <span className="text-xs font-semibold text-[#6b6357]">প্রস্তাবিত বাজেট</span>
          <span className="pf-serif font-bold text-lg text-[#1d4d3b]">
            {selectedPackage ? taka(selectedPackage.price) : 'আলোচনা সাপেক্ষ'}
          </span>
        </div>
        <p className="text-[12px] text-[#8a8172] leading-relaxed pt-2 border-t border-[#e6ddcc]/70 flex items-center gap-1.5">
          <span aria-hidden="true">🛡️</span>
          কোনো অগ্রিম পেমেন্ট লাগবে না — ফটোগ্রাফার গ্রহণ করলে কনফার্ম হবে
        </p>
      </div>

      {/* Error */}
      {errorMsg && (
        <div role="alert" className="rounded-[10px] border border-[#e7c8c8] bg-[#fdf1f1] px-4 py-2.5 text-xs font-semibold text-[#9b3a3a]">
          {errorMsg}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !eventDate}
        className="pf-btn-primary w-full !py-3.5 text-base !rounded-[14px]"
      >
        {submitting ? (
          <>
            <span className="bf-spin" aria-hidden="true" />
            পাঠানো হচ্ছে…
          </>
        ) : (
          <>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            বুকিং রিকোয়েস্ট পাঠান
          </>
        )}
      </button>
    </form>
  );
}
