import React, { useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   CircularMenu — বৃত্তাকার আইকন মেনু কিট (থিম-ম্যাচড: sunset × twilight)
   রেফারেন্স: গোল প্যাস্টেল আইকন + নিচে লেবেল + সোনালি স্ট্যাট + কোরাল ব্যাজ
   ═══════════════════════════════════════════════════════════════════ */

export type CircleTint = 'sky' | 'sea' | 'hill' | 'mist' | 'gold' | 'coral' | 'crimson' | 'berry' | 'teal' | 'emerald';

/* V26 — প্রোফাইল আবার dark-gold (sunset × twilight); coastal টিন্টগুলো backward-compat এ আছে */
const TINT_CLASS: Record<CircleTint, string> = {
  sky: 'bg-sky-400/[0.16] text-sky-300 ring-sky-300/30',
  sea: 'bg-cyan-400/[0.15] text-cyan-300 ring-cyan-300/28',
  hill: 'bg-emerald-400/[0.14] text-emerald-300 ring-emerald-300/26',
  mist: 'bg-indigo-400/[0.15] text-indigo-300 ring-indigo-300/26',
  gold: 'bg-sunset-gold/[0.13] text-sunset-gold ring-sunset-gold/25',
  coral: 'bg-sunset-coral/[0.14] text-orange-400 ring-sunset-coral/25',
  crimson: 'bg-sunset-crimson/[0.14] text-rose-400 ring-sunset-crimson/25',
  berry: 'bg-sunset-berry/[0.20] text-purple-400 ring-sunset-berry/30',
  teal: 'bg-teal-400/[0.13] text-teal-300 ring-teal-300/25',
  emerald: 'bg-emerald-400/[0.13] text-emerald-300 ring-emerald-300/25',
};

export type CircleItem = {
  key: string;
  label: string;
  /** আইকন — <CIc.calendar /> জাতীয় */
  icon: React.ReactNode;
  tint: CircleTint;
  /** গোল বাটনের নিচে সোনালি সংখ্যা/স্ট্যাট */
  stat?: string;
  /** বৃত্তের কোণায় কোরাল ব্যাজ (count / "রিভিউ") */
  badge?: string | number;
  onClick: () => void;
};

/* ── আইকন সেট (24 viewBox, stroke = currentColor — DashTabs-এর সাথে ম্যাচড) ── */
const svg = (children: React.ReactNode, size = 26) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const CIc = {
  grid: (s?: number) => svg(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>, s),
  calendar: (s?: number) => svg(<><rect x="3" y="4" width="18" height="17" rx="2.5" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>, s),
  clock: (s?: number) => svg(<><circle cx="12" cy="12" r="9.5" /><polyline points="12 6.5 12 12 15.5 14" /></>, s),
  camera: (s?: number) => svg(<><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>, s),
  tag: (s?: number) => svg(<><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>, s),
  user: (s?: number) => svg(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>, s),
  heart: (s?: number) => svg(<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />, s),
  star: (s?: number) => svg(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />, s),
  bell: (s?: number) => svg(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>, s),
  shield: (s?: number) => svg(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, s),
  check: (s?: number) => svg(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>, s),
  checkCircle: (s?: number) => svg(<><circle cx="12" cy="12" r="9.5" /><polyline points="8 12.5 11 15.5 16.5 9.5" /></>, s),
  message: (s?: number) => svg(<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />, s),
  image: (s?: number) => svg(<><rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>, s),
  wallet: (s?: number) => svg(<><rect x="2" y="5" width="20" height="15" rx="2.5" /><path d="M2 10h20" /><path d="M6 15h4" /></>, s),
  migration: (s?: number) => svg(<><path d="M17 3l4 4-4 4" /><path d="M21 7H8" /><path d="M7 21l-4-4 4-4" /><path d="M3 17h13" /></>, s),
  studio: (s?: number) => svg(<><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></>, s),
  eye: (s?: number) => svg(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>, s),
  award: (s?: number) => svg(<><circle cx="12" cy="8" r="6" /><path d="M15.5 13l1.5 9-5-3-5 3 1.5-9" /></>, s),
  arrowLeft: (s?: number) => svg(<><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>, s),
  cameraBadge: (s?: number) => svg(<><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>, s),
};

/* ── সেকশন শিরোনাম (স্ট্যাটিস / মেনু) ── */
export function CircleSectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4 px-1">
      <h2 className="text-[13.5px] font-bold tracking-wide text-white/45 uppercase">{children}</h2>
      {right}
    </div>
  );
}

/* ── একটা বৃত্ত বাটন ── */
export function CircleButton({ item, small = false }: { item: CircleItem; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      aria-label={item.label}
      className="group flex flex-col items-center gap-2 rounded-2xl px-1 py-1.5 text-center min-h-11 min-w-11 outline-none focus-visible:ring-2 focus-visible:ring-sunset-gold/50 transition-transform duration-150 active:scale-[0.94]"
    >
      <span className="relative">
        <span
          className={`grid ${small ? 'size-14' : 'size-16 sm:size-[4.25rem]'} place-items-center rounded-full ring-1 transition-all duration-200 group-hover:scale-[1.06] group-active:scale-[0.96] ${TINT_CLASS[item.tint]}`}
        >
          {item.icon}
        </span>
        {item.badge !== undefined && item.badge !== '' && item.badge !== 0 ? (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 max-w-14 truncate rounded-full bg-sunset-coral px-1.5 py-0.5 text-[11px] font-extrabold leading-none text-white shadow-glass-sm ring-1 ring-twilight-900">
            {item.badge}
          </span>
        ) : null}
      </span>
      <span className="text-[13.5px] leading-tight font-semibold text-white/85">{item.label}</span>
      {item.stat ? <span className="text-[13.5px] leading-none font-extrabold text-sunset-gold">{item.stat}</span> : null}
    </button>
  );
}

/* ── মেনু গ্রিড — ৩ কলাম (মোবাইল), ৪/৫ (বড় স্ক্রিন) ── */
export function CircleMenuGrid({ items }: { items: CircleItem[] }) {
  return (
    <div className="grid grid-cols-3 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-x-1.5 gap-y-5">
      {items.map((it) => (
        <CircleButton key={it.key} item={it} />
      ))}
    </div>
  );
}

/* ── স্ট্যাট গ্রিড — ৪ কলাম, ছোট বৃত্ত + সোনালি স্ট্যাট ── */
export function CircleStatGrid({ items }: { items: CircleItem[] }) {
  return (
    <div className="grid grid-cols-4 gap-x-1 gap-y-4">
      {items.map((it) => (
        <CircleButton key={it.key} item={it} small />
      ))}
    </div>
  );
}

/* ── ডিটেইল শেল — স্টিকি গোল ব্যাক-বাটন হেডার + কনটেন্ট ── */
export function DetailShell({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="circle-detail-enter">
      <div className="sticky top-[72px] z-30 -mx-4 sm:-mx-6 mb-6 flex items-center gap-3 glass-strong border-b border-white/[0.08] px-4 sm:px-6 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="পিছনে"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white/[0.08] ring-1 ring-white/10 text-white transition-transform active:scale-90"
        >
          {CIc.arrowLeft(20)}
        </button>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-extrabold text-white truncate">{title}</h2>
          {subtitle ? <p className="text-xs text-white/50 truncate">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ── বৃত্রাকার প্রোফাইল ছবি + ক্যামেরা ব্যাজ (কুইক আপলোড) — সোনালি রিং ── */
export function CircleAvatar({
  url,
  initials,
  size = 112,
  onFile,
  busy,
}: {
  url: string | null | undefined;
  initials: string;
  size?: number;
  onFile: (file: File) => void;
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="block size-full overflow-hidden rounded-full bg-sunset-gradient ring-[3px] ring-sunset-gold/60 ring-offset-[3px] ring-offset-twilight-950 shadow-sunset-glow outline-none focus-visible:ring-4 focus-visible:ring-sunset-gold transition-all duration-200 active:scale-[0.97]"
        aria-label="প্রোফাইল ছবি বদলান"
      >
        {url ? (
          <img src={url} alt={initials} className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-3xl font-extrabold text-[#1A0E06]">{initials}</span>
        )}
      </button>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="ছবি আপলোড করুন"
        className="absolute -bottom-0.5 -right-0.5 grid size-9 place-items-center rounded-full bg-sunset-coral text-white ring-2 ring-twilight-950 shadow-glass-sm transition-transform active:scale-90"
      >
        {busy ? (
          <span className="block size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        ) : (
          CIc.cameraBadge(16)
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/* ── হেল্পার: প্রথম অক্ষর (Bengali-safe) ── */
export function getInitials(name?: string | null, fallback = 'ফ'): string {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
  return parts[0].slice(0, 2);
}
