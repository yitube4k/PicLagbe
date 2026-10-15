export default function StarRating({ value, size = 'text-sm', showValue = false }: { value: number; size?: string; showValue?: boolean }) {
  const full = Math.round(value)
  return (
    <span className={`inline-flex items-center gap-1 ${size}`}>
      <span className="text-gold tracking-tight">
        {'★'.repeat(full)}
        <span className="text-gray-300">{'★'.repeat(5 - full)}</span>
      </span>
      {showValue && <span className="font-semibold text-gray-700">{value.toFixed(1)}</span>}
    </span>
  )
}
