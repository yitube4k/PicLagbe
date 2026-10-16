import { AIcon } from './icons';
import { ADMIN_NAV_BY_SLUG, adminPath, type AdminSlug } from './nav';
import { NavLink } from 'react-router-dom';

/* ═══ V18 consistent section page header — Argon spec:
   icon tile (w-11 h-11, amber tile) + Bengali title + subtitle + optional right slot ═══ */

export function PageHeader({
  slug,
  right,
}: {
  slug: AdminSlug;
  right?: React.ReactNode;
}) {
  const nav = ADMIN_NAV_BY_SLUG[slug];
  if (!nav) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="w-11 h-11 shrink-0 rounded-xl2 glass-card border border-sunset-gold/25 bg-sunset-soft grid place-items-center text-sunset-gold">
          <AIcon name={nav.icon} size={22} />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-snug truncate">
            {nav.label}
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-0.5 leading-snug">{nav.sub}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

/* Breadcrumb back-to-dashboard chip (used on non-dashboard pages) */
export function PageBack() {
  return (
    <NavLink
      to={adminPath('dashboard')}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/45 hover:text-sunset-gold transition-colors"
    >
      ← ওভারভিউ
    </NavLink>
  );
}
