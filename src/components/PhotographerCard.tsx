import { Link } from 'react-router-dom'
import type { Photographer } from '../lib/types'
import StarRating from './StarRating'
import { taka, toBn } from '../lib/utils'

export default function PhotographerCard({ p }: { p: Photographer }) {
  const cats = (p.photographer_categories || []).map((pc) => pc.categories?.name).filter(Boolean).slice(0, 3)
  return (
    <Link
      to={`/photographer/${p.slug}`}
      className="card group overflow-hidden block transition-all duration-200 hover:-translate-y-1 hover:shadow-cardhover"
    >
      <div className="relative">
        <div className="aspect-[3/2] overflow-hidden bg-gray-100">
          <img
            src={p.cover_photo_url || p.profile_photo_url || ''}
            alt={p.display_name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        {p.verified && (
          <span className="absolute top-3 right-3 badge bg-gold text-ink font-semibold">✓ Verified</span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3 -mt-9">
          <img
            src={p.profile_photo_url || ''}
            alt={p.display_name}
            className="w-11 h-11 rounded-full border-2 border-white shadow-md object-cover bg-white"
          />
          <div className="pt-9 flex-1 min-w-0">
            <h3 className="font-heading font-bold text-base truncate">{p.display_name}</h3>
            <p className="text-xs text-muted flex items-center gap-1">📍 {p.city || 'বাংলাদেশ'}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <span key={c} className="badge bg-gray-100 text-gray-600">{c}</span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <StarRating value={p.rating_avg || 0} size="text-xs" />
            <span className="text-xs text-muted">({toBn(p.rating_count || 0)})</span>
          </div>
          <p className="text-sm font-heading font-bold text-golddark">
            {taka(p.starting_price || 0)} <span className="text-xs font-normal text-muted">শুরু</span>
          </p>
        </div>
      </div>
    </Link>
  )
}
