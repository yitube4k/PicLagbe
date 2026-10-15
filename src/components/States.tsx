export function Loader({ label = 'লোড হচ্ছে…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      <p className="text-sm text-muted font-heading">{label}</p>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="aspect-[3/2] bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-3/4" />
      </div>
    </div>
  )
}

export function EmptyState({ icon = '📭', title, sub }: { icon?: string; title: string; sub?: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-3">{icon}</div>
      <h3 className="font-heading font-bold text-lg">{title}</h3>
      {sub && <p className="text-sm text-muted mt-1">{sub}</p>}
    </div>
  )
}
