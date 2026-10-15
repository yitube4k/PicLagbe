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
  { id: 'morning', label: 'সকাল (৬টা–৯টা)' },
  { id: 'afternoon', label: 'বিকেল (৩টা–৬টা)' },
  { id: 'golden', label: 'গোল্ডেন আওয়ার (৪:৩০–৬টা)' },
  { id: 'night', label: 'নাইট (৮টা–১০টা)' },
];

/**
 * Shared booking form (ivory editorial theme).
 * Insert logic identical to the legacy BookingModal — bookings table, status 'pending'.
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

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-4' : 'space-y-5'} noValidate>
      {/* 1) Package Selector */}
      {packages.length > 0 && (
        <div>
          <label className="pf-label" htmlFor="pf-pkg">প্যাকেজ বাছাই</label>
          <select
            id="pf-pkg"
            value={selectedPkgIdResolved}
            onChange={(e) => setSelectedPkgId(e.target.value)}
            className="pf-input"
          >
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} — {taka(pkg.price)}
              </option>
            ))}
          </select>
        </div>
      )}
      {packages.length === 0 && (
        <div className="rounded-[10px] border border-[#e6ddcc] bg-[#f3efe6] px-4 py-3 text-xs text-[#6b6357]">
          কোনো প্যাকেজ নেই — কাস্টম বুকিং হিসেবে রিকোয়েস্ট যাবে, দাম আলোচনা সাপেক্ষ।
        </div>
      )}

      {/* 2) Date & Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="pf-label" htmlFor="pf-date">তারিখ</label>
          <input
            id="pf-date"
            type="date"
            required
            min={todayStr}
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="pf-input"
          />
        </div>
        <div>
          <label className="pf-label" htmlFor="pf-time">সময়</label>
          <select
            id="pf-time"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            className="pf-input"
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot.id} value={slot.id}>{slot.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 3) Spot */}
      <div>
        <label className="pf-label" htmlFor="pf-spot">শুটিং স্পট</label>
        <select
          id="pf-spot"
          value={spot}
          onChange={(e) => setSpot(e.target.value)}
          className="pf-input"
        >
          {COX_SPOTS.map((s) => (
            <option key={s.key} value={s.nameBn}>{s.nameBn}</option>
          ))}
          <option value="অন্যান্য">অন্যান্য (আলোচনা সাপেক্ষ)</option>
        </select>
      </div>

      {/* 4) Notes */}
      <div>
        <label className="pf-label" htmlFor="pf-notes">বিশেষ নির্দেশনা (ঐচ্ছিক)</label>
        <textarea
          id="pf-notes"
          rows={compact ? 2 : 3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="যেমন: সানসেট শট চাই, ২ জন থাকব…"
          className="pf-input resize-none"
        />
      </div>

      {/* 5) Summary */}
      <div className="rounded-[12px] border border-[#e6ddcc] bg-[#faf7f0] p-4 space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-[#6b6357]">প্যাকেজ:</span>
          <span className="font-bold text-[#26231e]">
            {selectedPackage ? selectedPackage.name : 'কাস্টম বুকিং'}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-[#6b6357]">প্রস্তাবিত বাজেট:</span>
          <span className="pf-serif font-bold text-[#1d4d3b] text-base">
            {selectedPackage ? taka(selectedPackage.price) : 'আলোচনা সাপেক্ষ'}
          </span>
        </div>
        <p className="text-[11px] text-[#8a8172] leading-relaxed pt-1 border-t border-[#e6ddcc]">
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
        className="pf-btn-primary w-full !py-3.5 text-base"
      >
        {submitting ? 'পাঠানো হচ্ছে…' : 'বুকিং রিকোয়েস্ট পাঠান'}
      </button>
    </form>
  );
}
