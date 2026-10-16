import React from 'react';

/* ═══ V18 Admin icon kit — Material-style stroke SVGs, 24×24, currentColor ═══
   Per Gemini 4 Argon spec: stroke-width 1.75 (inactive) → 2.25 (active). */

export type IconName =
  | 'dashboard' | 'bookings' | 'camera' | 'shield' | 'posts' | 'requests'
  | 'chats' | 'users' | 'star' | 'category' | 'blog' | 'audit' | 'tune'
  | 'grid' | 'search' | 'close' | 'chevron' | 'arrow-up' | 'plus' | 'logout'
  | 'more' | 'eye' | 'edit' | 'trash' | 'check' | 'xmark' | 'whatsapp'
  | 'phone' | 'undo' | 'alert' | 'ban' | 'download' | 'refresh' | 'external' | 'clock';

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="9.5" rx="1.8" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.8" />
      <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.8" />
      <rect x="3" y="15.5" width="7.5" height="5.5" rx="1.8" />
    </>
  ),
  bookings: (
    <>
      <path d="M8 2.5v3.5M16 2.5v3.5" />
      <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
      <path d="M3 10h18" />
      <circle cx="8" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="18" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  camera: (
    <>
      <path d="M14.6 4.5h-5.2L7.3 7.5H4.5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2.8z" />
      <circle cx="12" cy="13" r="3.6" />
      <circle cx="18.4" cy="9.9" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5.2L12 2.2l-8 3V12c0 6 8 10 8 10z" />
      <path d="m8.8 11.8 2.3 2.3 4.2-4.2" />
    </>
  ),
  posts: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="m7.5 12.2 3 3 6.5-6.5" />
    </>
  ),
  requests: (
    <>
      <rect x="4" y="4" width="16" height="17.5" rx="2.2" />
      <path d="M9.2 2.5h5.6v3.8H9.2z" />
      <circle cx="12" cy="11.5" r="2.1" />
      <path d="M8.2 17.6c.8-2 2.3-3 3.8-3s3 1 3.8 3" />
    </>
  ),
  chats: (
    <>
      <path d="M14 9.2a2.2 2.2 0 0 1-2.2 2.2H6.4L3 14.6V4.2a2.2 2.2 0 0 1 2.2-2.2h6.6A2.2 2.2 0 0 1 14 4.2z" />
      <path d="M18.2 9.5h.4A2.2 2.2 0 0 1 20.8 11.7v8.1l-3.4-3.2h-5.2a2.2 2.2 0 0 1-2.2-2.2v-.9" />
    </>
  ),
  users: (
    <>
      <path d="M15.5 21v-1.8a4 4 0 0 0-4-4h-5a4 4 0 0 0-4 4V21" />
      <circle cx="9" cy="7.2" r="3.8" />
      <path d="M21.5 21v-1.8a4 4 0 0 0-3-3.86" />
      <path d="M15.6 3.5a3.8 3.8 0 0 1 0 7.4" />
    </>
  ),
  star: (
    <path d="m12 2.6 2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.44l-5.8 3.06 1.1-6.47L2.6 9.45l6.5-.95z" />
  ),
  category: (
    <>
      <path d="M10.4 9.8a.62.62 0 0 1-.55-.95l2.95-5.13a.62.62 0 0 1 1.07-.04l3.13 5.17a.62.62 0 0 1-.53.95z" />
      <rect x="3" y="13.8" width="6.6" height="6.6" rx="1.1" />
      <circle cx="17.2" cy="17.1" r="3.4" />
    </>
  ),
  blog: (
    <>
      <path d="M14.5 2.5H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14.5 2.5v5.5H20" />
      <path d="M15.5 13.2h-7M15.5 16.8h-7M9.5 9.6h-1" />
    </>
  ),
  audit: (
    <>
      <path d="M14.5 2.5H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14.5 2.5v5.5H20" />
      <circle cx="11.3" cy="13.8" r="2.6" />
      <path d="m13.2 15.7 2.8 2.8" />
    </>
  ),
  tune: (
    <>
      <path d="M21 4.5h-6.5M8.5 4.5H3M21 12h-8.5M6.5 12H3M21 19.5h-3.5M11.5 19.5H3" />
      <circle cx="12.5" cy="4.5" r="2" />
      <circle cx="8.5" cy="12" r="2" />
      <circle cx="15.5" cy="19.5" r="2" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7.5" />
      <path d="m21 21-4.7-4.7" />
    </>
  ),
  close: <path d="M18 6 6 18M6 6l12 12" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  'arrow-up': (
    <>
      <path d="M7.5 7.5h9v9" />
      <path d="M7.5 16.5 16.5 7.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  logout: (
    <>
      <path d="M9.5 21.5H5.5a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9.5" />
    </>
  ),
  more: (
    <>
      <circle cx="12" cy="5.2" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.8" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4.5L20 8.5a2.1 2.1 0 0 0-3-3L5.5 17 4 20z" />
      <path d="m14.5 7 3 3" />
    </>
  ),
  trash: (
    <>
      <path d="M4 6.5h16M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
      <path d="M6.5 6.5 7.3 19a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12.5" />
      <path d="M10 10.5v6M14 10.5v6" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5L19.5 7" />,
  xmark: <path d="M18 6 6 18M6 6l12 12" />,
  whatsapp: (
    <>
      <path d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.2 20.8l4.5-1.2A8.8 8.8 0 1 0 12 3.2z" />
      <path d="M8.8 7.8c-.6 1.2-.3 2.9.9 4.6a9 9 0 0 0 3.4 3c1.4.6 2.6.6 3.3-.1l.5-.6a.8.8 0 0 0-.1-1.1l-1.6-1.2a.8.8 0 0 0-1 .1l-.5.5a6.5 6.5 0 0 1-2.4-2.4l.5-.5a.8.8 0 0 0 .1-1L10.7 7.5a.8.8 0 0 0-1.1-.1z" />
    </>
  ),
  phone: <path d="M5.5 3.5h3l1.7 4.3-2 1.5a12.5 12.5 0 0 0 6.5 6.5l1.5-2 4.3 1.7v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 5.7a2 2 0 0 1 2-2.2z" />,
  undo: (
    <>
      <path d="M8 5 3.5 9.5 8 14" />
      <path d="M3.5 9.5H15a5.5 5.5 0 0 1 0 11h-4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 22 20H2z" />
      <path d="M12 9.5v5" />
      <circle cx="12" cy="17.2" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.7 5.7l12.6 12.6" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 20.5h16" />
    </>
  ),
  refresh: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6" />
      <path d="M20.5 3.5v5h-5" />
    </>
  ),
  external: (
    <>
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5 11 13" />
      <path d="M19.5 14v4.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2H10" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
};

export function AIcon({
  name,
  size = 22,
  strokeWidth,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
