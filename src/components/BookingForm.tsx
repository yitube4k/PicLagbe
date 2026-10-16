import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Photographer, Package } from '../lib/types';
import { toBn, taka } from '../lib/utils';
import { COX_SPOTS, SPOT_BY_KEY } from '../lib/constants';
import { cldUrl } from '../lib/cloudinary';
import { videoThumb } from './PackageEditDialog';
import { unitSuffix, qtyMax, defaultQty, bookingTotal, qtyLabel, photoCountLine } from '../lib/pricing';

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
  const [qty, setQty] = useState(1); // V30 — ঘণ্টা বা ছবির সংখ্যা (unit-ভেদে)
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

  /* V30 — প্যাকেজ বদলালে কোয়ান্টিটি ডিফল্টে ফিরে যায় (ঘণ্টা/ছবি একক) */
  useEffect(() => {
    if (selectedPackage) setQty(defaultQty(selectedPackage));
  }, [selectedPackage?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const unitQty = selectedPackage && (selectedPackage.pricing_unit === 'hour' || selectedPackage.pricing_unit === 'photo');
  const unitTotal = selectedPackage ? bookingTotal(selectedPackage, qty) : null;

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
        // V21 — immutable snapshot + structured shoot info (V30: unit-aware)
        package_snapshot: selectedPackage
          ? {
              name: selectedPackage.name,
              price: Number(selectedPackage.price) || 0,
              duration_hours: selectedPackage.duration_hours ?? null,
              cover_url: selectedPackage.media?.[0]?.url ?? null,
              features_count: selectedPackage.features?.length ?? 0,
              pricing_unit: selectedPackage.pricing_unit ?? 'event',
              unit_qty: selectedPackage.pricing_unit === 'hour' || selectedPackage.pricing_unit === 'photo' ? qty : null,
              photo_count: selectedPackage.photo_count ?? null,
              total: unitTotal,
            }
          : null,
        shoot_spot: spot || null,
        shoot_time_slot: slotText || null,
        status_history: [{ status: 'pending', at: new Date().toISOString() }],
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
                      active ? 'border-[#fbbf24]' : 'border-white/25'
                    }`}
                  >
                    {active && <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <b className="pf-serif text-[16.5px] text-[#f3ede0] truncate">{pkg.name}</b>
                      <span className="pf-serif font-bold text-[#fbbf24] whitespace-nowrap">{taka(pkg.price)}<span className="text-[12px] font-semibold">{unitSuffix(pkg.pricing_unit)}</span></span>
                    </span>
                    <span className="block text-[12.5px] text-[#8d8471] mt-0.5">
                      {pkg.pricing_unit === 'hour'
                        ? `⏱ ${toBn(pkg.duration_hours || 2)} ঘণ্টা সেশন${pkg.description ? ` · ${pkg.description}` : ''}`
                        : pkg.pricing_unit === 'photo'
                          ? `📷 যত ছবি দরকার${pkg.description ? ` · ${pkg.description}` : ''}`
                          : <>⏱ {toBn(pkg.duration_hours || 0)} ঘণ্টা{photoCountLine(pkg) ? ` · ${photoCountLine(pkg)}` : ''}{pkg.description ? ` · ${pkg.description}` : ''}</>
                      }
                    </span>
                  </span>
                  {pkg.media && pkg.media.length > 0 && (
                    <span className="relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-white/[0.12] bg-white/[0.05]">
                      <img
                        src={pkg.media[0].type === 'video' ? videoThumb(pkg.media[0].url) : cldUrl(pkg.media[0].url, { w: 160, c: 'fill' })}
                        alt="" className="w-full h-full object-cover" loading="lazy"
                      />
                      {pkg.media[0].type === 'video' && (
                        <span className="absolute inset-0 grid place-items-center text-white">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                        </span>
                      )}
                      {pkg.media.length > 1 && (
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] font-bold text-white text-center leading-4">+{toBn(pkg.media.length - 1)}</span>
                      )}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <div className="rounded-[12px] border border-white/10 bg-[#f3efe6] px-4 py-3 text-xs text-[#a89d88]">
          কোনো প্যাকেজ নেই — কাস্টম বুকিং হিসেবে রিকোয়েস্ট যাবে, দাম আলোচনা সাপেক্ষ।
        </div>
      )}

      {/* ═══ ধাপ ২.৫ (V30): ঘণ্টা / ছবির সংখ্যা — একক-ভিত্তিক প্যাকেজে ═══ */}
      {selectedPackage && unitQty && (
        <div>
          <span className="pf-label">
            {selectedPackage.pricing_unit === 'hour' ? 'কত ঘণ্টা?' : 'কত ছবি?'}
          </span>
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              onClick={() => setQty((v) => Math.max(1, v - 1))}
              aria-label="কমান"
              className="w-11 h-11 rounded-xl border border-white/15 bg-white/[0.07] text-xl font-bold text-[#f3ede0] hover:border-[#fbbf24]/50 transition shrink-0"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={qtyMax(selectedPackage)}
              value={qty}
              onChange={(e) => setQty(Math.min(qtyMax(selectedPackage), Math.max(1, Number(e.target.value) || 1)))}
              aria-label={selectedPackage.pricing_unit === 'hour' ? 'ঘণ্টার সংখ্যা' : 'ছবির সংখ্যা'}
              className="pf-input !w-24 text-center font-bold"
            />
            <button
              type="button"
              onClick={() => setQty((v) => Math.min(qtyMax(selectedPackage), v + 1))}
              aria-label="বাড়ান"
              className="w-11 h-11 rounded-xl border border-white/15 bg-white/[0.07] text-xl font-bold text-[#f3ede0] hover:border-[#fbbf24]/50 transition shrink-0"
            >
              +
            </button>
            <span className="text-[12.5px] text-[#8d8471]">
              {taka(selectedPackage.price)}{unitSuffix(selectedPackage.pricing_unit)} × {qtyLabel(selectedPackage, qty)}
            </span>
          </div>
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
            <p className="text-[12.5px] text-[#8d8471] mt-1.5">সিলেক্টেড: {prettyDate}</p>
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
          <span className="text-xs font-semibold text-[#a89d88]">প্যাকেজ</span>
          <span className="pf-serif font-bold text-[15px] text-[#f3ede0] text-right">
            {selectedPackage ? selectedPackage.name : 'কাস্টম বুকিং'}
          </span>
        </div>
        {eventDate && (
          <div className="flex items-center justify-between gap-3 py-1.5 border-t border-white/10/70">
            <span className="text-xs font-semibold text-[#a89d88]">তারিখ</span>
            <span className="text-[14.5px] font-semibold text-[#f3ede0] text-right">{prettyDate}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 py-1.5 border-t border-white/10/70">
          <span className="text-xs font-semibold text-[#a89d88]">হিসাব</span>
          <span className="text-[14px] font-semibold text-[#f3ede0] text-right">
            {selectedPackage && unitQty
              ? `${taka(selectedPackage.price)}${unitSuffix(selectedPackage.pricing_unit)} × ${qtyLabel(selectedPackage, qty)}`
              : selectedPackage
                ? `⏱ ${toBn(selectedPackage.duration_hours || 0)} ঘণ্টা সেশন`
                : 'কাস্টম বুকিং'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 py-2 border-t border-white/10/70">
          <span className="text-xs font-semibold text-[#a89d88]">প্রস্তাবিত বাজেট</span>
          <span className="pf-serif font-bold text-lg text-[#fbbf24]">
            {selectedPackage && unitTotal != null ? taka(unitTotal) : selectedPackage ? taka(selectedPackage.price) : 'আলোচনা সাপেক্ষ'}
          </span>
        </div>
        <p className="text-[12px] text-[#8d8471] leading-relaxed pt-2 border-t border-white/10/70 flex items-center gap-1.5">
          <span aria-hidden="true">🛡️</span>
          কোনো অগ্রিম পেমেন্ট লাগবে না — ফটোগ্রাফার গ্রহণ করলে কনফার্ম হবে
        </p>
      </div>

      {/* Error */}
      {errorMsg && (
        <div role="alert" className="rounded-[10px] border border-[rgba(248,113,113,0.35)] bg-[rgba(127,29,29,0.16)] px-4 py-2.5 text-xs font-semibold text-[#fca5a5]">
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
