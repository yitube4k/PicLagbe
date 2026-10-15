import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Category, Photographer } from '../lib/types'
import PhotographerCard from '../components/PhotographerCard'
import { SkeletonCard, EmptyState } from '../components/States'

const CITIES = ['ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'খুলনা', 'বরিশাল']
const SORTS = [
  { id: 'recommended', label: 'রেকমেন্ডেড' },
  { id: 'rating', label: 'সর্বোচ্চ রেটিং' },
  { id: 'price_asc', label: 'কম দাম আগে' },
  { id: 'price_desc', label: 'বেশি দাম আগে' },
  { id: 'experience', label: 'বেশি অভিজ্ঞতা' },
]

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const [cats, setCats] = useState<Category[]>([])
  const [all, setAll] = useState<Photographer[]>([])
  const [loading, setLoading] = useState(true)
  const [maxPrice, setMaxPrice] = useState(0)

  const city = params.get('city') || ''
  const cat = params.get('cat') || ''
  const sort = params.get('sort') || 'recommended'

  useEffect(() => {
    ;(async () => {
      const [c, p] = await Promise.all([
        supabase.from('categories').select('*').order('id'),
        supabase
          .from('photographers')
          .select('*, photographer_categories(category_id, categories(name, slug, icon))')
          .eq('profile_status', 'approved'),
      ])
      setCats(c.data || [])
      setAll((p.data as Photographer[]) || [])
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    let list = all
    if (city) list = list.filter((p) => p.city === city)
    if (cat) list = list.filter((p) => (p.photographer_categories || []).some((pc) => pc.categories?.slug === cat))
    if (maxPrice > 0) list = list.filter((p) => (p.starting_price || 0) <= maxPrice)
    switch (sort) {
      case 'rating': list = [...list].sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0)); break
      case 'price_asc': list = [...list].sort((a, b) => (a.starting_price || 0) - (b.starting_price || 0)); break
      case 'price_desc': list = [...list].sort((a, b) => (b.starting_price || 0) - (a.starting_price || 0)); break
      case 'experience': list = [...list].sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0)); break
      default: list = [...list].sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0))
    }
    return list
  }, [all, city, cat, maxPrice, sort])

  const setP = (k: string, v: string) => {
    const n = new URLSearchParams(params)
    if (v) n.set(k, v); else n.delete(k)
    setParams(n)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-heading font-bold text-2xl md:text-3xl mb-1">ফটোগ্রাফার খুঁজুন</h1>
      <p className="text-muted text-sm mb-6">শহর, ক্যাটাগরি ও বাজেট অনুযায়ী ফিল্টার করুন</p>

      {/* filter bar */}
      <div className="card p-4 mb-8 flex flex-wrap gap-3 items-center">
        <select value={city} onChange={(e) => setP('city', e.target.value)} className="input !w-auto">
          <option value="">সব শহর</option>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={cat} onChange={(e) => setP('cat', e.target.value)} className="input !w-auto">
          <option value="">সব ক্যাটাগরি</option>
          {cats.map((c) => <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setP('sort', e.target.value)} className="input !w-auto">
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>সর্বোচ্চ বাজেট:</span>
          <input type="range" min={0} max={30000} step={1000} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="accent-gold w-32" />
          <span className="font-heading font-semibold text-gray-700 w-20">{maxPrice ? `৳${maxPrice.toLocaleString('en-IN')}` : 'সব'}</span>
        </div>
        <span className="ml-auto text-sm text-muted">{filtered.length} জন পাওয়া গেছে</span>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔍" title="কোনো ফটোগ্রাফার পাওয়া যায়নি" sub="ফিল্টার বদলে আবার চেষ্টা করুন" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => <PhotographerCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  )
}
