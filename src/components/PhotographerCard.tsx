import React from 'react';
import { Link } from 'react-router-dom';
import { Photographer } from '../lib/types';
import { toBn } from '../lib/utils';

interface PhotographerCardProps {
  p: Photographer;
}

export default function PhotographerCard({ p }: PhotographerCardProps) {
  const ratingAvg = Number(p.rating_avg || 0);
  const filledStars = Math.max(0, Math.min(5, Math.round(ratingAvg)));
  const ratingCount = Number(p.rating_count || 0);

  const rawCategories = p.photographer_categories || [];
  const visibleCategories = rawCategories.slice(0, 3);
  const extraCount = Math.max(0, rawCategories.length - 3);

  const formattedPrice = toBn(
    Number(p.starting_price || 0).toLocaleString('en-IN')
  );

  return (
    <Link
      to={`/photographer/${p.id}`}
      className="block glass-card rounded-xl3 overflow-hidden group focus:outline-none focus:ring-2 focus:ring-sunset-gold/50"
    >
      {/* Cover Image */}
      <div className="relative h-40 w-full overflow-hidden bg-twilight-800">
        {p.cover_photo_url ? (
          <img
            src={p.cover_photo_url}
            alt={p.display_name || 'ফটোগ্রাফার কভার'}
            className="w-full h-full object-cover "
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-sunset-soft " />
        )}

        {/* Bottom Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

        {/* Verified Badge */}
        {p.verified && (
          <span className="badge badge-verified absolute top-3 left-3 bg-emerald-500/20 border-emerald-400/45 text-emerald-300 shadow-glass-sm">
            ✓ ভেরিফায়েড
          </span>
        )}
      </div>

      {/* Avatar */}
      <div className="-mt-10 ml-5 relative w-[72px] h-[72px] z-10">
        {p.profile_photo_url ? (
          <img
            src={p.profile_photo_url}
            alt={p.display_name || 'ফটোগ্রাফার'}
            className="w-[72px] h-[72px] rounded-full ring-4 ring-twilight-900 object-cover bg-twilight-800"
            loading="lazy"
          />
        ) : (
          <div className="w-[72px] h-[72px] rounded-full ring-4 ring-twilight-900 bg-sunset-gradient flex items-center justify-center text-xl font-extrabold text-[#1A0E06]">
            {(p.display_name || 'ফ').slice(0, 1)}
          </div>
        )}
        <span
          title="অনলাইন"
          className="w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-twilight-900 absolute bottom-1 right-1"
        />
      </div>

      {/* Card Body */}
      <div className="p-5 pt-3">
        {/* Name */}
        <h3 className="font-bold text-lg text-white group-hover:text-sunset-gold transition-colors truncate">
          {p.display_name || 'নামহীন ফটোগ্রাফার'}
        </h3>

        {/* Rating Row */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="flex items-center gap-0.5" aria-label={`রেটিং ${toBn(ratingAvg.toFixed(1))}`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill={star <= filledStars ? '#fbbf24' : 'none'}
                stroke="#fbbf24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={star <= filledStars ? 'opacity-100' : 'opacity-35'}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
          <span className="text-sm text-white/60">
            ( {toBn(ratingCount)} রিভিউ )
          </span>
        </div>

        {/* Location & Price Row */}
        <div className="flex items-center justify-between gap-2 mt-3.5 pt-3 border-t border-white/[0.08]">
          <div className="flex items-center gap-1.5 text-xs text-white/70 min-w-0">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate">
              {p.full_location || 'কক্সবাজার'}
            </span>
          </div>

          <div className="shrink-0 text-right">
            <span className="text-[12.5px] text-white/45 mr-1">শুরু</span>
            <span className="price-tag">৳{formattedPrice}</span>
          </div>
        </div>

        {/* Categories */}
        {visibleCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-4">
            {visibleCategories.map((c, idx) => {
              const catName = c?.categories?.name;
              if (!catName) return null;
              return (
                <span
                  key={c.category_id || idx}
                  className="chip !text-xs !py-1 !px-2.5 pointer-events-none"
                >
                  {catName}
                </span>
              );
            })}
            {extraCount > 0 && (
              <span className="chip !text-xs !py-1 !px-2.5 pointer-events-none text-sunset-gold">
                +{toBn(extraCount)}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
