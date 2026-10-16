import React from 'react';
import { toBn } from '../lib/utils';

/* ── ছোট SVG আইকন (16px, stroke = currentColor — nav-এর সাথে ম্যাচড) ── */
const svg = (children: React.ReactNode) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const TabIc = {
  grid: () => svg(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>),
  calendar: () => svg(<><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>),
  clock: () => svg(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>),
  image: () => svg(<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>),
  tag: () => svg(<><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>),
  camera: () => svg(<><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>),
  user: () => svg(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  heart: () => svg(<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />),
  star: () => svg(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />),
  bell: () => svg(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>),
  shield: () => svg(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />),
  check: () => svg(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>),
};

export interface DashTabDef<T extends string> {
  key: T;
  label: string;
  icon: React.ReactNode;
  count?: number;
  show?: boolean;
  /** gold = সবসময় সোনালি টেক্সট (admin/verified জাতীয়) */
  tone?: 'default' | 'gold';
}

/**
 * ড্যাশবোর্ড/স্টুডিওর ক্লিন ট্যাব বার — মোবাইলে এক লাইনে স্ক্রল, ডেস্কটপে সেন্টার।
 * আইকন + লেবেল + (ঐচ্ছিক) সংখ্যা-ব্যাজ — ইমোজি-ছাড়া, হোমপেজ থিম-ম্যাচড।
 */
export default function DashTabs<T extends string>({
  tabs,
  active,
  onChange,
  className = 'mt-8',
}: {
  tabs: DashTabDef<T>[];
  active: T;
  onChange: (t: T) => void;
  className?: string;
}) {
  return (
    <div className={`${className} flex justify-center`}>
      <div className="glass rounded-full inline-flex p-1.5 gap-1 max-w-full overflow-x-auto dash-tabs-scroll">
        {tabs
          .filter((t) => t.show !== false)
          .map((t) => {
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onChange(t.key)}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[14.5px] font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset-gold/50 ${
                  isActive
                    ? 'chip-active'
                    : t.tone === 'gold'
                      ? 'text-sunset-gold/90 hover:text-sunset-gold'
                      : 'text-white/65 hover:text-white'
                }`}
              >
                <span className={`shrink-0 ${isActive ? '' : 'opacity-80'}`}>{t.icon}</span>
                {t.label}
                {typeof t.count === 'number' && t.count > 0 && (
                  <span className="ml-0.5 rounded-full bg-sunset-coral/90 px-1.5 py-px text-[11.5px] font-extrabold leading-4 text-white">
                    {toBn(t.count)}
                  </span>
                )}
                {t.tone === 'gold' && t.count !== undefined && isActive && null}
              </button>
            );
          })}
      </div>
    </div>
  );
}
