import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Photographer, Package, PortfolioImage, Review, Booking } from '../lib/types'
import StarRating from '../components/StarRating'
import { Loader, EmptyState } from '../components/States'
import { taka, toBn, bnDate, useDebouncedView } from '../lib/viewhelpers'
import { useAuth } from '../lib/auth'

export default function PhotographerProfile() {
  const { slug } = useParams()
  const { session } = useAuth()
  const nav = useNavigate()
  const [p, setP] = useState<Photographer | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [images, setImages] = useState<PortfolioImage[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [busy, setBusy] = useState(true)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [fav, setFav] = useState(false)
  const [bookOpen, setBookOpen] = useState(false)
  const [form, setForm] = useState({ package_id: '', date: '', time: '', location: '', notes: '' })
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)

  useDebouncedView(p?.id || null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: ph } = await supabase
        .from('photographers')
        .select('*, photographer_categories(category_id, categories(name, slug, icon))')
        .eq('slug', slug)
        .maybeSingle()
      if (cancelled) return
      if (!ph) { setBusy(false); return }
      setP(ph as Photographer)
      const [pk, pi, rv] = await Promise.all([
        supabase.from('packages').select('*').eq('photographer_id', ph.id).order('price'),
        supabase.from('portfolio_images').select('*').eq('photographer_id', ph.id).order('sort_order'),
        supabase.from('reviews').select('*, profiles(full_name, avatar_url)').eq('photographer_id', ph.id).order('created_at', { ascending: false }).limit(20),
      ])
      if (cancelled) return
      setPackages(pk.data || [])
      setImages(pi.data || [])
      setReviews((rv.data as Review[]) || [])
      if (session) {
        const { data: f } = await supabase.from('favorites').select('customer_id').eq('customer_id', session.user.id).eq('photographer_id', ph.id).maybeSingle()
        if (!cancelled) setFav(!!f)
      }
      if (!cancelled) setBusy(false)
    })()
    return () => { cancelled = true }
  }, [slug, session])

  const [favBusy, setFavBusy] = useState(false)
  const toggleFav = async () => {
    if (!session) return nav('/login')
    if (!p || favBusy) return
    setFavBusy(true)
    const next = !fav
    if (next) await supabase.from('favorites').insert({ customer_id: session.user.id, photographer_id: p.id })
    else await supabase.from('favorites').delete().eq('customer_id', session.user.id).eq('photographer_id', p.id)
    setFav(next)
    setFavBusy(false)
  }

  const book = async () => {
    if (!session) return nav('/login')
    if (!p || !form.date) return setMsg('তারিখ সিলেক্ট করুন')
    setSending(true)
    const { error } = await supabase.from('bookings').insert({
      photographer_id: p.id,
      customer_id: session.user.id,
      package_id: form.package_id || null,
      event_date: form.date,
      event_time: form.time || null,
      event_location: form.location || null,
      notes: form.notes || null,
      status: 'pending',
    })
    setSending(false)
    if (error) setMsg('বুকিং ব্যর্থ: ' + error.message)
    else { setMsg(''); setBookOpen(false); alert('বুকিং রিকোয়েস্ট পাঠানো হয়েছে! ফটোগ্রাফার গ্রহণ করলে নোটিফিকেশন পাবেন।') }
  }

  if (busy) return <Loader />
  if (!p) return <EmptyState icon="🧐" title="ফটোগ্রাফার পাওয়া যায়নি" sub="এই লিংকটি সঠিক নয় বা প্রোফাইল আর সক্রিয় নেই" />

  return (
    <div>
      {/* cover */}
      <div className="h-52 md:h-72 bg-gray-200 relative">
        <img src={p.cover_photo_url || ''} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {/* header card */}
        <div className="card p-5 -mt-16 relative flex flex-col md:flex-row gap-5 items-start">
          <img src={p.profile_photo_url || ''} alt={p.display_name} className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-card object-cover -mt-14 md:-mt-16" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading font-bold text-2xl">{p.display_name}</h1>
              {p.verified && <span className="badge bg-gold text-ink font-semibold">✓ Verified</span>}
              <span className={`badge ${p.profile_status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'}`}>অনুমোদিত</span>
            </div>
            <p className="text-sm text-muted mt-1">📍 {p.full_location || p.city} • অভিজ্ঞতা {toBn(p.experience_years || 0)} বছর • 🗣 {p.languages}</p>
            <div className="flex items-center gap-2 mt-2">
              <StarRating value={p.rating_avg || 0} showValue />
              <span className="text-sm text-muted">({toBn(p.rating_count || 0)} রিভিউ)</span>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-heading font-bold text-golddark">{taka(p.starting_price || 0)} থেকে শুরু</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(p.photographer_categories || []).map((pc) => (
                <span key={pc.category_id} className="badge bg-gray-100 text-gray-600">{pc.categories?.icon} {pc.categories?.name}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={toggleFav} className={`btn-outline !py-2 ${fav ? '!border-gold !text-golddark' : ''}`}>{fav ? '❤️ ফেভারিট' : '🤍 ফেভারিট'}</button>
            <button onClick={() => setBookOpen(true)} className="btn-primary !py-2">📅 বুকিং দিন</button>
          </div>
        </div>

        {/* about */}
        <section className="mt-8">
          <h2 className="font-heading font-bold text-xl mb-2">পরিচিতি</h2>
          <p className="text-gray-700 leading-relaxed">{p.bio}</p>
          {p.equipment && (
            <p className="text-sm text-muted mt-3"><span className="font-semibold text-gray-600">যন্ত্রপাতি:</span> {p.equipment}</p>
          )}
        </section>

        {/* packages */}
        {packages.length > 0 && (
          <section className="mt-10">
            <h2 className="font-heading font-bold text-xl mb-4">প্যাকেজ ও মূল্য</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {packages.map((pk, i) => (
                <div key={pk.id} className={`card p-5 ${i === 1 ? 'border-gold border-2' : ''}`}>
                  {i === 1 && <span className="badge bg-gold text-ink mb-2">⭐ জনপ্রিয়</span>}
                  <h3 className="font-heading font-bold">{pk.name}</h3>
                  <p className="font-heading font-bold text-2xl text-golddark mt-1">{taka(pk.price)}</p>
                  <p className="text-xs text-muted">{toBn(pk.duration_hours || 0)} ঘণ্টা কভারেজ</p>
                  <p className="text-sm text-gray-600 mt-2">{pk.description}</p>
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    {(pk.features || []).map((f) => <li key={f}>✓ {f}</li>)}
                  </ul>
                  <button onClick={() => { setForm({ ...form, package_id: pk.id }); setBookOpen(true) }} className="btn-outline w-full mt-4 !py-2 text-sm">এই প্যাকেজে বুক করুন</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* portfolio */}
        <section className="mt-10">
          <h2 className="font-heading font-bold text-xl mb-4">পোর্টফোলিও</h2>
          {images.length === 0 ? <EmptyState icon="📷" title="এখনো ছবি যোগ করা হয়নি" /> : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((im) => (
                <button key={im.id} onClick={() => setLightbox(im.url)} className="group relative rounded-lg overflow-hidden aspect-[4/3]">
                  <img src={im.url} alt={im.caption || ''} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  {im.caption && <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 text-white text-xs p-2 text-left">{im.caption}</span>}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* reviews */}
        <section className="mt-10 pb-16">
          <h2 className="font-heading font-bold text-xl mb-4">রিভিউ ({toBn(reviews.length)})</h2>
          {reviews.length === 0 ? <EmptyState icon="⭐" title="এখনো রিভিউ নেই" sub="সম্পন্ন হওয়া বুকিংয়ের ক্লায়েন্টরা রিভিউ দেবেন" /> : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center gap-3">
                    <img src={r.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.profiles?.full_name || 'U')}&background=D4AF37&color=121316`} className="w-9 h-9 rounded-full" alt="" />
                    <div>
                      <p className="font-heading font-semibold text-sm">{r.profiles?.full_name || 'ক্লায়েন্ট'}</p>
                      <StarRating value={r.rating} size="text-xs" />
                    </div>
                    <span className="ml-auto text-xs text-muted">{bnDate(r.created_at)}</span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-700 mt-2">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-full rounded-lg" />
        </div>
      )}

      {/* booking modal */}
      {bookOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setBookOpen(false)}>
          <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-xl mb-4">বুকিং রিকোয়েস্ট — {p.display_name}</h3>
            <label className="text-sm font-heading font-medium">প্যাকেজ</label>
            <select value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })} className="input mb-3">
              <option value="">— নির্বাচন করুন —</option>
              {packages.map((pk) => <option key={pk.id} value={pk.id}>{pk.name} ({taka(pk.price)})</option>)}
            </select>
            <label className="text-sm font-heading font-medium">ইভেন্টের তারিখ *</label>
            <input type="date" value={form.date} min={new Date().toISOString().split('T')[0]} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input mb-3" />
            <label className="text-sm font-heading font-medium">সময়</label>
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="input mb-3" />
            <label className="text-sm font-heading font-medium">লোকেশন</label>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="যেমন: গুলশান, ঢাকা" className="input mb-3" />
            <label className="text-sm font-heading font-medium">বিশেষ নির্দেশনা</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="আপনার চাহিদা লিখুন…" className="input mb-4" />
            {msg && <p className="text-red-600 text-sm mb-3">{msg}</p>}
            <div className="flex gap-2">
              <button onClick={() => setBookOpen(false)} className="btn-outline flex-1">বাতিল</button>
              <button onClick={book} disabled={sending} className="btn-primary flex-1 disabled:opacity-60">{sending ? 'পাঠানো হচ্ছে…' : 'রিকোয়েস্ট পাঠান'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
