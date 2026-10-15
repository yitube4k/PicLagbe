import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Booking, Photographer, Package, PortfolioImage } from '../lib/types'
import { Loader, EmptyState } from '../components/States'
import { bnDate, STATUS_BN, STATUS_STYLE, taka } from '../lib/utils'

const TABS = ['overview', 'profile', 'packages', 'portfolio', 'bookings'] as const

export function PhotographerDash() {
  const { session } = useAuth()
  const [tab, setTab] = useState<(typeof TABS)[number]>('overview')
  const [me, setMe] = useState<Photographer | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [images, setImages] = useState<PortfolioImage[]>([])
  const [busy, setBusy] = useState(true)
  const [msg, setMsg] = useState('')

  // profile edit form
  const [pf, setPf] = useState({ display_name: '', bio: '', city: '', full_location: '', experience_years: 0, equipment: '', starting_price: 0, profile_photo_url: '', cover_photo_url: '' })
  // new package
  const [np, setNp] = useState({ name: '', description: '', price: 5000, duration_hours: 4, features: '' })
  // new image (URL mode)
  const [ni, setNi] = useState({ url: '', caption: '' })

  const load = async () => {
    if (!session) return
    const { data: m } = await supabase.from('photographers').select('*').eq('user_id', session.user.id).maybeSingle()
    if (!m) { setBusy(false); return }
    setMe(m as Photographer)
    setPf({
      display_name: m.display_name || '', bio: m.bio || '', city: m.city || '', full_location: m.full_location || '',
      experience_years: m.experience_years || 0, equipment: m.equipment || '', starting_price: m.starting_price || 0,
      profile_photo_url: m.profile_photo_url || '', cover_photo_url: m.cover_photo_url || '',
    })
    const [b, pk, pi] = await Promise.all([
      supabase.from('bookings').select('*, packages(name, price), profiles(full_name, phone)').eq('photographer_id', m.id).order('created_at', { ascending: false }),
      supabase.from('packages').select('*').eq('photographer_id', m.id).order('price'),
      supabase.from('portfolio_images').select('*').eq('photographer_id', m.id).order('sort_order'),
    ])
    setBookings((b.data as Booking[]) || [])
    setPackages(pk.data || [])
    setImages(pi.data || [])
    setBusy(false)
  }

  useEffect(() => { load() }, [session?.user?.id])

  const saveProfile = async () => {
    if (!me) return
    setMsg('')
    const { error } = await supabase.from('photographers').update(pf).eq('id', me.id)
    setMsg(error ? 'সমস্যা: ' + error.message : '✅ প্রোফাইল সেভ হয়েছে')
  }

  const setBookingStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) alert('সমস্যা: ' + error.message)
    load()
  }

  const addPackage = async () => {
    if (!me || !np.name) return
    const { error } = await supabase.from('packages').insert({
      photographer_id: me.id, name: np.name, description: np.description, price: Number(np.price), duration_hours: Number(np.duration_hours),
      features: np.features.split(',').map((f) => f.trim()).filter(Boolean),
    })
    if (!error) { setNp({ name: '', description: '', price: 5000, duration_hours: 4, features: '' }); load() }
  }

  const delPackage = async (id: string) => {
    if (!confirm('প্যাকেজ মুছবেন?')) return
    await supabase.from('packages').delete().eq('id', id)
    load()
  }

  const addImage = async () => {
    if (!me || !ni.url) return
    await supabase.from('portfolio_images').insert({ photographer_id: me.id, url: ni.url, caption: ni.caption || null, sort_order: images.length + 1 })
    setNi({ url: '', caption: '' })
    load()
  }

  const delImage = async (id: string) => {
    await supabase.from('portfolio_images').delete().eq('id', id)
    load()
  }

  if (busy) return <Loader />
  if (!me) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="text-4xl mb-3">📸</div>
      <h2 className="font-heading font-bold text-xl mb-2">আপনার ফটোগ্রাফার প্রোফাইল নেই</h2>
      <p className="text-sm text-muted mb-5">ফটোগ্রাফার হিসেবে রেজিস্টার করে প্রোফাইল খুলুন</p>
      <a href="/register?role=photographer" className="btn-primary">রেজিস্টার করুন</a>
    </div>
  )

  const pending = bookings.filter((b) => b.status === 'pending')
  const accepted = bookings.filter((b) => b.status === 'accepted')

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl">ফটোগ্রাফার ড্যাশবোর্ড 📸</h1>
          <p className="text-sm text-muted">
            স্ট্যাটাস: <span className={`badge ${me.profile_status === 'approved' ? 'bg-emerald-100 text-emerald-700' : me.profile_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{me.profile_status === 'approved' ? 'অনুমোদিত' : me.profile_status === 'pending' ? 'অপেক্ষমাণ' : me.profile_status}</span>
            {me.verified && <span className="badge bg-gold text-ink ml-2">✓ Verified</span>}
          </p>
        </div>
        <a href={`/photographer/${me.slug}`} className="btn-outline !py-2 text-sm">পাবলিক প্রোফাইল দেখুন →</a>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`pill shrink-0 ${tab === t ? 'pill-active' : ''}`}>
            {t === 'overview' ? '📊 ওভারভিউ' : t === 'profile' ? '🪪 প্রোফাইল' : t === 'packages' ? '💰 প্যাকেজ' : t === 'portfolio' ? '🖼 পোর্টফোলিও' : '📅 বুকিং'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-5 text-center"><p className="font-heading font-bold text-2xl text-golddark">{bookings.length}</p><p className="text-xs text-muted">মোট বুকিং</p></div>
          <div className="card p-5 text-center"><p className="font-heading font-bold text-2xl text-amber-500">{pending.length}</p><p className="text-xs text-muted">নতুন রিকোয়েস্ট</p></div>
          <div className="card p-5 text-center"><p className="font-heading font-bold text-2xl text-emerald-600">{bookings.filter((b) => b.status === 'completed').length}</p><p className="text-xs text-muted">সম্পন্ন শুট</p></div>
          <div className="card p-5 text-center"><p className="font-heading font-bold text-2xl">⭐ {me.rating_avg || 0}</p><p className="text-xs text-muted">{me.rating_count || 0} রিভিউ • {me.profile_views || 0} ভিউ</p></div>
        </div>
      )}

      {tab === 'profile' && (
        <div className="card p-6 grid md:grid-cols-2 gap-4">
          <div><label className="text-sm font-heading font-medium">নাম</label><input value={pf.display_name} onChange={(e) => setPf({ ...pf, display_name: e.target.value })} className="input mt-1" /></div>
          <div><label className="text-sm font-heading font-medium">শহর</label>
            <select value={pf.city} onChange={(e) => setPf({ ...pf, city: e.target.value })} className="input mt-1">
              <option value="">—</option><option>ঢাকা</option><option>চট্টগ্রাম</option><option>সিলেট</option><option>খুলনা</option><option>বরিশাল</option>
            </select></div>
          <div className="md:col-span-2"><label className="text-sm font-heading font-medium">বিস্তারিত ঠিকানা</label><input value={pf.full_location} onChange={(e) => setPf({ ...pf, full_location: e.target.value })} className="input mt-1" /></div>
          <div><label className="text-sm font-heading font-medium">অভিজ্ঞতা (বছর)</label><input type="number" value={pf.experience_years} onChange={(e) => setPf({ ...pf, experience_years: Number(e.target.value) })} className="input mt-1" /></div>
          <div><label className="text-sm font-heading font-medium">শুরুর মূল্য (৳)</label><input type="number" value={pf.starting_price} onChange={(e) => setPf({ ...pf, starting_price: Number(e.target.value) })} className="input mt-1" /></div>
          <div><label className="text-sm font-heading font-medium">প্রোফাইল ছবির URL</label><input value={pf.profile_photo_url} onChange={(e) => setPf({ ...pf, profile_photo_url: e.target.value })} className="input mt-1" placeholder="https://…" /></div>
          <div><label className="text-sm font-heading font-medium">কভার ছবির URL</label><input value={pf.cover_photo_url} onChange={(e) => setPf({ ...pf, cover_photo_url: e.target.value })} className="input mt-1" placeholder="https://…" /></div>
          <div><label className="text-sm font-heading font-medium">যন্ত্রপাতি</label><input value={pf.equipment} onChange={(e) => setPf({ ...pf, equipment: e.target.value })} className="input mt-1" placeholder="Canon R5, Sony A7III…" /></div>
          <div className="md:col-span-2"><label className="text-sm font-heading font-medium">নিজের সম্পর্কে</label><textarea value={pf.bio} onChange={(e) => setPf({ ...pf, bio: e.target.value })} rows={4} className="input mt-1" /></div>
          {msg && <p className="md:col-span-2 text-sm text-emerald-600">{msg}</p>}
          <div><button onClick={saveProfile} className="btn-primary">সেভ করুন</button></div>
        </div>
      )}

      {tab === 'packages' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="font-heading font-bold mb-3">নতুন প্যাকেজ</h3>
            <input placeholder="প্যাকেজের নাম" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} className="input mb-2" />
            <input placeholder="সংক্ষিপ্ত বর্ণনা" value={np.description} onChange={(e) => setNp({ ...np, description: e.target.value })} className="input mb-2" />
            <div className="flex gap-2 mb-2">
              <input type="number" placeholder="মূল্য ৳" value={np.price} onChange={(e) => setNp({ ...np, price: Number(e.target.value) })} className="input" />
              <input type="number" placeholder="ঘণ্টা" value={np.duration_hours} onChange={(e) => setNp({ ...np, duration_hours: Number(e.target.value) })} className="input" />
            </div>
            <input placeholder="ফিচার (কমা দিয়ে আলাদা)" value={np.features} onChange={(e) => setNp({ ...np, features: e.target.value })} className="input mb-3" />
            <button onClick={addPackage} className="btn-primary w-full">যোগ করুন</button>
          </div>
          <div className="space-y-3">
            {packages.length === 0 ? <EmptyState icon="💰" title="কোনো প্যাকেজ নেই" /> : packages.map((pk) => (
              <div key={pk.id} className="card p-4 flex items-center justify-between">
                <div>
                  <p className="font-heading font-semibold">{pk.name}</p>
                  <p className="text-sm text-golddark font-bold">{taka(pk.price)} <span className="text-xs text-muted font-normal">• {pk.duration_hours}h</span></p>
                </div>
                <button onClick={() => delPackage(pk.id)} className="text-red-500 text-sm hover:underline">মুছুন</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'portfolio' && (
        <div>
          <div className="card p-5 mb-5 flex flex-col md:flex-row gap-3">
            <input placeholder="ছবির URL (https://…)" value={ni.url} onChange={(e) => setNi({ ...ni, url: e.target.value })} className="input flex-1" />
            <input placeholder="ক্যাপশন" value={ni.caption} onChange={(e) => setNi({ ...ni, caption: e.target.value })} className="input md:w-48" />
            <button onClick={addImage} className="btn-primary shrink-0">যোগ করুন</button>
          </div>
          {images.length === 0 ? <EmptyState icon="🖼" title="পোর্টফোলিও খালি" sub="সেরা কাজের ছবি যোগ করুন" /> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {images.map((im) => (
                <div key={im.id} className="relative group rounded-lg overflow-hidden aspect-[4/3]">
                  <img src={im.url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => delImage(im.id)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 opacity-0 group-hover:opacity-100 transition">✕</button>
                  {im.caption && <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs p-1.5">{im.caption}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'bookings' && (
        <div className="space-y-3">
          {bookings.length === 0 ? <EmptyState icon="📅" title="কোনো বুকিং নেই" sub="প্রোফাইল অনুমোদিত হলে ক্লায়েন্টরা বুকিং পাঠাবে" /> : bookings.map((b) => (
            <div key={b.id} className="card p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <p className="font-heading font-semibold">{b.profiles?.full_name || 'ক্লায়েন্ট'}</p>
                <p className="text-sm text-muted">📅 {bnDate(b.event_date)} {b.event_time ? `• ⏰ ${b.event_time}` : ''} {b.packages ? `• ${b.packages.name}` : ''}</p>
                {b.event_location && <p className="text-xs text-muted">📍 {b.event_location}</p>}
                {b.notes && <p className="text-xs text-gray-500 mt-1">💬 {b.notes}</p>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${STATUS_STYLE[b.status]}`}>{STATUS_BN[b.status]}</span>
                {b.status === 'pending' && (
                  <>
                    <button onClick={() => setBookingStatus(b.id, 'accepted')} className="btn-primary !py-1.5 !px-3 text-xs">গ্রহণ</button>
                    <button onClick={() => setBookingStatus(b.id, 'rejected')} className="text-red-500 text-sm hover:underline">প্রত্যাখ্যান</button>
                  </>
                )}
                {b.status === 'accepted' && (
                  <button onClick={() => setBookingStatus(b.id, 'completed')} className="btn-dark !py-1.5 !px-3 text-xs">শুট সম্পন্ন ✓</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
