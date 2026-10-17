import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Photographer, Package } from "../lib/types";
import { toBn, taka } from "../lib/utils";
import { COX_SPOTS, SPOT_BY_KEY } from "../lib/constants";
import { cldUrl } from "../lib/cloudinary";
import { videoThumb } from "./PackageEditDialog";
import {
  unitSuffix,
  qtyMax,
  defaultQty,
  bookingTotal,
  qtyLabel,
  photoCountLine,
} from "../lib/pricing";

interface BookingFormProps {
  p: Photographer;
  packages: Package[];
  selectedPkgId?: string | null;
  onPackageChange?: (pkgId: string) => void;
  compact?: boolean;
}

const TIME_SLOTS = [
  { id: "morning", label: "সকাল", time: "৬টা–৯টা", icon: "🌅" },
  { id: "afternoon", label: "বিকেল", time: "৩টা–৬টা", icon: "☀️" },
  { id: "golden", label: "গোল্ডেন আওয়ার", time: "৪:৩০–৬টা", icon: "✨" },
  { id: "night", label: "নাইট", time: "৮টা–১০টা", icon: "🌙" },
];

const WEEKDAY_NAMES_BN = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];
const MONTH_NAMES_BN = [
  "জানু",
  "ফেব্রু",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টে",
  "অক্টো",
  "নভে",
  "ডিসে",
];

export default function BookingForm({
  p,
  packages,
  selectedPkgId,
  onPackageChange,
  compact = false,
}: BookingFormProps) {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [innerPkgId, setInnerPkgId] = useState(packages[0]?.id || "");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("golden");

  const initialSpot = useMemo(() => {
    if (p.home_spot && SPOT_BY_KEY(p.home_spot)?.nameBn) {
      return SPOT_BY_KEY(p.home_spot)!.nameBn;
    }
    const coveredKeys = p.details?.covered_spots || [];
    if (coveredKeys.length > 0 && SPOT_BY_KEY(coveredKeys[0])?.nameBn) {
      return SPOT_BY_KEY(coveredKeys[0])!.nameBn;
    }
    return COX_SPOTS[0]?.nameBn || "লাবণী পয়েন্ট";
  }, [p.home_spot, p.details?.covered_spots]);

  const [spot, setSpot] = useState(initialSpot);
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const selectedPkgIdResolved = selectedPkgId ?? innerPkgId;
  const setSelectedPkgId = (id: string) => {
    if (onPackageChange) onPackageChange(id);
    else setInnerPkgId(id);
  };

  useEffect(() => {
    if (packages.length > 0 && !selectedPkgIdResolved) {
      setSelectedPkgId(packages[0].id);
    }
  }, [packages, selectedPkgIdResolved]);

  const selectedPackage = packages.find(
    (pkg) => pkg.id === selectedPkgIdResolved,
  );

  useEffect(() => {
    if (selectedPackage) {
      setQty(defaultQty(selectedPackage));
    }
  }, [selectedPackage?.id]);

  const unitQty =
    selectedPackage &&
    (selectedPackage.pricing_unit === "hour" ||
      selectedPackage.pricing_unit === "photo");
  const unitTotal = selectedPackage ? bookingTotal(selectedPackage, qty) : null;

  const spotOptions = useMemo(() => {
    const list: string[] = [];
    const coveredKeys = p.details?.covered_spots || [];
    coveredKeys.forEach((k) => {
      const match = SPOT_BY_KEY(k);
      if (match && !list.includes(match.nameBn)) {
        list.push(match.nameBn);
      }
    });
    COX_SPOTS.forEach((s) => {
      if (!list.includes(s.nameBn)) {
        list.push(s.nameBn);
      }
    });
    list.push("অন্যান্য (আলোচনা সাপেক্ষ)");
    return list;
  }, [p.details?.covered_spots]);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [today]);

  const next7Days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      let label = WEEKDAY_NAMES_BN[d.getDay()];
      if (i === 0) label = "আজ";
      else if (i === 1) label = "কাল";
      const dayNum = toBn(d.getDate());
      const monthShort = MONTH_NAMES_BN[d.getMonth()];
      arr.push({ iso, label, sub: `${dayNum} ${monthShort}` });
    }
    return arr;
  }, [today]);

  const prettyDate = useMemo(() => {
    if (!eventDate) return "";
    try {
      return new Date(eventDate + "T00:00:00").toLocaleDateString("bn-BD", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch {
      return eventDate;
    }
  }, [eventDate]);

  const selectedSlotObj =
    TIME_SLOTS.find((s) => s.id === eventTime) || TIME_SLOTS[2];

  const handleNextStep = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (packages.length > 0 && !selectedPackage) {
        setErrorMsg("দয়া করে একটি প্যাকেজ নির্বাচন করুন।");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!eventDate) {
        setErrorMsg("দয়া করে শুটিংয়ের তারিখ নির্বাচন করুন।");
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!eventDate) {
      setErrorMsg("দয়া করে শুটিংয়ের তারিখ নির্বাচন করুন।");
      return;
    }

    if (!session || !profile) {
      navigate("/auth", { state: { from: location } });
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const slotLabel =
        TIME_SLOTS.find((s) => s.id === eventTime)?.label || eventTime;
      const slotTime = TIME_SLOTS.find((s) => s.id === eventTime)?.time || "";
      const slotText = slotTime ? `${slotLabel} (${slotTime})` : slotLabel;

      const { error } = await supabase.from("bookings").insert({
        photographer_id: p.id,
        customer_id: profile.id,
        package_id: selectedPackage?.id || null,
        event_date: eventDate,
        event_time: slotText,
        event_location: spot,
        notes: notes.trim() || null,
        status: "pending",
        package_snapshot: selectedPackage
          ? {
              name: selectedPackage.name,
              price: Number(selectedPackage.price) || 0,
              duration_hours: selectedPackage.duration_hours ?? null,
              cover_url: selectedPackage.media?.[0]?.url ?? null,
              features_count: selectedPackage.features?.length ?? 0,
              pricing_unit: selectedPackage.pricing_unit ?? "event",
              unit_qty:
                selectedPackage.pricing_unit === "hour" ||
                selectedPackage.pricing_unit === "photo"
                  ? qty
                  : null,
              photo_count: selectedPackage.photo_count ?? null,
              total: unitTotal,
            }
          : null,
        shoot_spot: spot || null,
        shoot_time_slot: slotText || null,
        status_history: [{ status: "pending", at: new Date().toISOString() }],
      });

      if (error) {
        console.error("Booking insert error:", error);
        setErrorMsg("বুকিং রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      } else {
        setIsSuccess(true);
      }
    } catch (err) {
      console.error("Booking error:", err);
      setErrorMsg("একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।");
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = currentStep === 1 ? 33.3 : currentStep === 2 ? 66.6 : 100;

  if (isSuccess) {
    return (
      <div
        className={`bf2-root bf2-glass-card ${compact ? "p-5" : "p-6 sm:p-7"} text-center bf2-fade-in`}
      >
        <div className="bf2-check-circle mx-auto" aria-hidden="true">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1A0E06"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="pf-serif text-xl font-bold text-[#f3ede0] mt-4">
          রিকোয়েস্ট পাঠানো হয়েছে!
        </h3>
        <p className="text-[13px] text-[#a89d88] leading-relaxed mt-2">
          অগ্রিম কাটা হয়নি। ফটোগ্রাফার গ্রহণ করলে আপনার বুকিং নিশ্চিত হয়ে যাবে
          — নোটিফিকেশন পাবেন।
        </p>

        <div className="bf2-review mt-6 text-left text-xs space-y-2 border border-white/10">
          <div className="flex justify-between items-center text-[#f3ede0]">
            <span className="text-[#a89d88]">প্যাকেজ</span>
            <span className="font-semibold">
              {selectedPackage ? selectedPackage.name : "কাস্টম বুকিং"}
            </span>
          </div>
          <div className="flex justify-between items-center text-[#f3ede0]">
            <span className="text-[#a89d88]">তারিখ</span>
            <span>{prettyDate}</span>
          </div>
          <div className="flex justify-between items-center text-[#f3ede0]">
            <span className="text-[#a89d88]">স্পট</span>
            <span className="truncate max-w-[180px]">{spot}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/dashboard?booked=1")}
            className="bf2-btn-cta w-full"
          >
            আমার বুকিং দেখুন
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSuccess(false);
              setCurrentStep(1);
              setEventDate("");
              setNotes("");
            }}
            className="w-full py-2.5 text-sm font-semibold text-[#a89d88] hover:text-[#f3ede0] transition-colors"
          >
            আরেকটি বুকিং
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bf2-root ${compact ? "space-y-3" : "space-y-4"}`}>
      {/* ═══ স্টেপ হেডার ও প্রগ্রেস বার ═══ */}
      <div className={compact ? "mb-4" : "mb-6"}>
        <button
          type="button"
          onClick={() => currentStep > 1 && setCurrentStep(1)}
          disabled={currentStep < 1}
          className={`bf2-step-pill ${currentStep === 1 ? "bf2-step-active" : currentStep > 1 ? "bf2-step-completed" : "bf2-step-upcoming"}`}
        >
          {currentStep > 1 && <span aria-hidden="true">✓</span>}
          <span>১ প্যাকেজ</span>
        </button>

        <button
          type="button"
          onClick={() => currentStep > 2 && setCurrentStep(2)}
          disabled={currentStep < 2}
          className={`bf2-step-pill ${
            currentStep === 2
              ? "bf2-step-active"
              : currentStep > 2
                ? "bf2-step-completed"
                : "bf2-step-upcoming"
          }`}
        >
          {currentStep > 2 && <span>✓</span>}
          <span>২ তারিখ ও সময়</span>
        </button>

        <button
          type="button"
          disabled={currentStep < 3}
          className={`bf2-step-pill ${
            currentStep === 3 ? "bf2-step-active" : "bf2-step-upcoming"
          }`}
        >
          <span>৩ স্পট ও নোট</span>
        </button>

        <div className="bf2-progress-track">
          <div
            className="bf2-progress-bar"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ═══ ফর্ম এরিয়া ═══ */}
      <div className={compact ? "space-y-4" : "space-y-5"}>
        {/* STEP 1: প্যাকেজ */}
        {currentStep === 1 && (
          <div className="bf2-fade-in space-y-4">
            {packages.length > 0 ? (
              <fieldset>
                <legend className="pf-label mb-2">প্যাকেজ নির্বাচন করুন</legend>
                <div
                  className="space-y-2.5"
                  role="radiogroup"
                  aria-label="প্যাকেজ"
                >
                  {packages.map((pkg) => {
                    const active = pkg.id === selectedPkgIdResolved;
                    const isPopular = Boolean(
                      (pkg as { is_popular?: boolean }).is_popular,
                    );

                    return (
                      <label
                        key={pkg.id}
                        className={`bf2-pkg-card ${active ? "bf2-pkg-active" : ""}`}
                      >
                        {isPopular && (
                          <span className="bf2-badge-popular">জনপ্রিয়</span>
                        )}

                        <input
                          type="radio"
                          name="bf2-package"
                          value={pkg.id}
                          checked={active}
                          onChange={() => setSelectedPkgId(pkg.id)}
                          className="sr-only"
                        />

                        {/* কাস্টম রেডিও ডট */}
                        <span
                          aria-hidden="true"
                          className={`mt-1 shrink-0 w-[18px] h-[18px] rounded-full border-2 grid place-items-center transition-colors ${
                            active ? "border-[#fbbf24]" : "border-white/25"
                          }`}
                        >
                          {active && (
                            <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" />
                          )}
                        </span>

                        {/* টেক্সট ও মূল্য */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="pf-serif text-[15.5px] font-bold text-[#f3ede0] truncate">
                              {pkg.name}
                            </span>
                            <span className="pf-serif font-bold text-[#fbbf24] whitespace-nowrap text-base">
                              {taka(pkg.price)}
                              <span className="text-xs font-semibold text-[#fbbf24]/80">
                                {unitSuffix(pkg.pricing_unit)}
                              </span>
                            </span>
                          </div>

                          <p className="text-[12px] text-[#a89d88] leading-relaxed mt-1">
                            {pkg.pricing_unit === "hour"
                              ? `⏱ ${toBn(pkg.duration_hours || 2)} ঘণ্টা সেশন · ${pkg.description || ""}`
                              : pkg.pricing_unit === "photo"
                                ? `📷 যত ছবি দরকার · ${pkg.description || ""}`
                                : `⏱ ${toBn(pkg.duration_hours || 0)} ঘণ্টা · ${photoCountLine(pkg) || ""} ${pkg.description ? `· ${pkg.description}` : ""}`}
                          </p>
                        </div>

                        {/* মিডিয়া থাম্বনেইল */}
                        {pkg.media && pkg.media.length > 0 && (
                          <div className="relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-white/[0.04]">
                            <img
                              src={
                                pkg.media[0].type === "video"
                                  ? videoThumb(pkg.media[0].url)
                                  : cldUrl(pkg.media[0].url, {
                                      w: 160,
                                      c: "fill",
                                    })
                              }
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {pkg.media[0].type === "video" && (
                              <span className="absolute inset-0 grid place-items-center bg-black/30 text-white">
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </span>
                            )}
                            {pkg.media.length > 1 && (
                              <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] font-bold text-white text-center leading-4">
                                +{toBn(pkg.media.length - 1)}
                              </span>
                            )}
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-[#a89d88] leading-relaxed">
                কোনো প্যাকেজ নেই — কাস্টম বুকিং হিসেবে রিকোয়েস্ট যাবে, দাম
                আলোচনা সাপেক্ষ।
              </div>
            )}

            {/* কোয়ান্টিটি স্টেপার (hour বা photo হলে) */}
            {selectedPackage && unitQty && (
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
                <label
                  className="pf-label block text-xs mb-1.5"
                  htmlFor="bf2-qty-input"
                >
                  {selectedPackage.pricing_unit === "hour"
                    ? "কত ঘণ্টা?"
                    : "কত ছবি?"}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty((v) => Math.max(1, v - 1))}
                    aria-label="কমান"
                    className="w-10 h-10 rounded-xl border border-white/15 bg-white/[0.06] text-xl font-bold text-[#f3ede0] hover:border-[#fbbf24]/50 transition grid place-items-center"
                  >
                    −
                  </button>
                  <input
                    id="bf2-qty-input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={qtyMax(selectedPackage)}
                    value={qty}
                    onChange={(e) =>
                      setQty(
                        Math.min(
                          qtyMax(selectedPackage),
                          Math.max(1, Number(e.target.value) || 1),
                        ),
                      )
                    }
                    className="pf-input !w-20 text-center font-bold text-base !py-2"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setQty((v) => Math.min(qtyMax(selectedPackage), v + 1))
                    }
                    aria-label="বাড়ান"
                    className="w-10 h-10 rounded-xl border border-white/15 bg-white/[0.06] text-xl font-bold text-[#f3ede0] hover:border-[#fbbf24]/50 transition grid place-items-center"
                  >
                    +
                  </button>
                  <span className="text-xs text-[#a89d88]">
                    {taka(selectedPackage.price)}
                    {unitSuffix(selectedPackage.pricing_unit)} ×{" "}
                    {qtyLabel(selectedPackage, qty)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: তারিখ ও সময় */}
        {currentStep === 2 && (
          <div className="bf2-fade-in space-y-4">
            <div>
              <span className="pf-label block mb-2">শুটিংয়ের তারিখ</span>

              {/* অনুভূমিক ৭ দিনের চিপস */}
              <div
                className="flex items-center gap-2 overflow-x-auto bf2-hide-scrollbar pb-1.5"
                role="radiogroup"
                aria-label="দ্রুত তারিখ নির্বাচন"
              >
                {next7Days.map((d) => {
                  const active = eventDate === d.iso;
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setEventDate(d.iso)}
                      className={`bf2-date-chip ${active ? "bf2-date-chip-active" : ""}`}
                    >
                      <span className="text-xs font-semibold">{d.label}</span>
                      <span
                        className={`text-[11px] mt-0.5 ${active ? "text-[#1a0e06]/85 font-medium" : "text-[#a89d88]"}`}
                      >
                        {d.sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ক্যালেন্ডার ইনপুট */}
              <div className="mt-2.5">
                <label
                  htmlFor="bf2-date-custom"
                  className="text-xs text-[#a89d88] block mb-1"
                >
                  অন্য তারিখ
                </label>
                <div className="relative">
                  <input
                    id="bf2-date-custom"
                    type="date"
                    min={todayStr}
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="pf-input !pl-10 text-sm"
                  />
                  <span
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none opacity-80"
                    aria-hidden="true"
                  >
                    📅
                  </span>
                </div>
              </div>

              {prettyDate && (
                <p className="text-xs text-[#fbbf24] mt-2 font-medium flex items-center gap-1.5">
                  <span>🗓️</span>
                  <span>নির্বাচিত: {prettyDate}</span>
                </p>
              )}
            </div>

            {/* টাইম স্লট গ্রিড */}
            <fieldset>
              <legend className="pf-label mb-2">শুটিংয়ের সময়</legend>
              <div
                className="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="সময়"
              >
                {TIME_SLOTS.map((slot) => {
                  const active = eventTime === slot.id;
                  return (
                    <label
                      key={slot.id}
                      className={`bf2-slot-card ${active ? "bf2-slot-card-active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="bf2-timeslot"
                        value={slot.id}
                        checked={active}
                        onChange={() => setEventTime(slot.id)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className="text-lg leading-none shrink-0"
                      >
                        {slot.icon}
                      </span>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-[#f3ede0] leading-tight">
                          {slot.label}
                        </span>
                        <span className="block text-[11px] text-[#a89d88] leading-tight mt-0.5">
                          {slot.time}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
        )}

        {/* STEP 3: স্পট ও নোট + রিভিউ */}
        {currentStep === 3 && (
          <div className="bf2-fade-in space-y-4">
            {/* স্পট পিল চিপস */}
            <fieldset>
              <legend className="pf-label mb-2">শুটিং স্পট</legend>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label="শুটিং স্পট"
              >
                {spotOptions.map((s) => {
                  const active = spot === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setSpot(s)}
                      className={`bf2-chip px-3 py-1.5 text-xs ${active ? "bf2-chip-active" : ""}`}
                    >
                      📍 {s}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* নোট */}
            <div>
              <label htmlFor="bf2-notes" className="pf-label block mb-1">
                বিশেষ নির্দেশনা (ঐচ্ছিক)
              </label>
              <textarea
                id="bf2-notes"
                rows={compact ? 2 : 3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="যেমন: সানসেট শট চাই, ২ জন থাকব…"
                className="pf-input resize-none text-xs"
              />
            </div>

            {/* রিভিউ সামারি কার্ড */}
            <div className="bf2-review space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#a89d88]">
                <span>প্যাকেজ</span>
                <span className="font-semibold text-[#f3ede0]">
                  {selectedPackage ? selectedPackage.name : "কাস্টম বুকিং"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#a89d88]">
                <span>তারিখ</span>
                <span className="text-[#f3ede0]">
                  {prettyDate || "নির্বাচিত হয়নি"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#a89d88]">
                <span>সময়</span>
                <span className="text-[#f3ede0]">
                  {selectedSlotObj.icon} {selectedSlotObj.label} (
                  {selectedSlotObj.time})
                </span>
              </div>
              <div className="flex items-center justify-between text-[#a89d88]">
                <span>স্পট</span>
                <span className="text-[#f3ede0] truncate max-w-[190px]">
                  {spot}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#a89d88] pt-1 border-t border-white/5">
                <span>হিসাব</span>
                <span className="text-[#f3ede0]">
                  {selectedPackage && unitQty
                    ? `${taka(selectedPackage.price)}${unitSuffix(selectedPackage.pricing_unit)} × ${qtyLabel(selectedPackage, qty)}`
                    : selectedPackage
                      ? `⏱ ${toBn(selectedPackage.duration_hours || 0)} ঘণ্টা সেশন`
                      : "কাস্টম বুকিং"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <span className="font-semibold text-[#f3ede0]">মোট</span>
                <span className="pf-serif font-bold text-base text-[#fbbf24]">
                  {selectedPackage && unitTotal != null
                    ? taka(unitTotal)
                    : selectedPackage
                      ? taka(selectedPackage.price)
                      : "আলোচনা সাপেক্ষ"}
                </span>
              </div>
              <p className="text-[11px] text-[#a89d88] leading-relaxed pt-2 border-t border-white/5 flex items-center gap-1.5">
                <span aria-hidden="true">🛡️</span>
                <span>
                  কোনো অগ্রিম পেমেন্ট লাগবে না — ফটোগ্রাফার গ্রহণ করলে কনফার্ম
                  হবে
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* এরর মেসেজ */}
      {errorMsg && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-500/30 bg-red-950/25 px-3.5 py-2 text-xs font-medium text-red-200"
        >
          {errorMsg}
        </div>
      )}

      {/* ═══ স্টিকি ফুটার ═══ */}
      <div className="bf2-footer flex items-center justify-between gap-3">
        <div>
          <span className="block text-[11px] uppercase tracking-wider text-[#a89d88] font-semibold">
            মোট
          </span>
          <span className="pf-serif text-base sm:text-lg font-bold text-[#fbbf24] leading-tight block">
            {selectedPackage && unitTotal != null
              ? taka(unitTotal)
              : selectedPackage
                ? taka(selectedPackage.price)
                : "আলোচনা সাপেক্ষ"}
          </span>
        </div>

        <div>
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={
                (currentStep === 1 &&
                  packages.length > 0 &&
                  !selectedPackage) ||
                (currentStep === 2 && !eventDate)
              }
              className="bf2-btn-cta text-sm"
            >
              <span>পরের ধাপ</span>
              <span>→</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={submitting || !eventDate}
              className="bf2-btn-cta text-sm"
            >
              {submitting ? (
                <>
                  <span
                    className="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  <span>পাঠানো হচ্ছে…</span>
                </>
              ) : (
                <>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>বুকিং রিকোয়েস্ট পাঠান</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
