import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Booking, Notification, Photographer } from '../lib/types'
import { Loader, EmptyState } from '../components/States'
import { bnDate, STATUS_BN, STATUS_STYLE, taka } from '../lib/utils'

export function NotificationBell() {
  const { session } = useAuth()
  const [items, setItems] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!session) return
    const load = async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(15)
      setItems((data as Notification[]) || [])
    }
    load()
    const ch = supabase.channel('notif_' + session.user.id.slice(0, 8))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [session])

  if (!session) return null
  const unread = items.filter((n) => !n.read).length

  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); if (unread) supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false).then() }} className="relative p-2 rounded-full hover:bg-gray-100" aria-label="Notifications">
        🔔
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 flex items-center justify-center px-1">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 card p-2 z-50 max-h-96 overflow-auto">
          <p className="text-xs font-heading font-bold px-2 py-1 text-muted">নোটিফিকেশন</p>
          {items.length === 0 ? <p className="text-sm text-muted px-2 py-4 text-center">কোনো নোটিফিকেশন নেই</p> : items.map((n) => (
            <Link key={n.id} to={n.link || '#'} onClick={() => setOpen(false)} className={`block px-3 py-2 rounded hover:bg-gray-50 text-sm ${!n.read ? 'bg-gold/5' : ''}`}>
              {n.message}
              <span className="block text-xs text-muted">{bnDate(n.created_at)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function CustomerDash() {
  const { session, profile } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [favs, setFavs] = useState<Photographer[]>([])
  const [busy, setBusy] = useState(true)

  const load = async () => {
    if (!session) return
    const [b, f] = await Promise.all([
      supabase.from('bookings').select('*, photographers(display_name, slug, profile_photo_url, city), packages(name, price)').eq('customer_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('favorites').select('photographer_id, photographers!inner(*, photographer_categories(category_id, categories(name, slug, icon)))').eq('customer_id', session.user.id),
    ])
    setBookings((b.data as Booking[]) || [])
    setFavs(((f.data as unknown) as { photographers: Photographer }[] || []).map((x) => x.photographers))
    setBusy(false)
  }

  useEffect(() => { load() }, [session?.user?.id])

  const cancel = async (id: string) => {
    if (!confirm('এই বুকিং বাতিল করবেন?')) return
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id).eq('customer_id', session!.user.id)
    load()
  }

  if (busy) return <Loader />
  const pending = bookings.filter((b) => b.status === 'pending').length
  const completed = bookings.filter((b) => b.status === 'completed').length

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-heading font-bold text-2xl mb-1">স্বাগতম, {profile?.full_name}! 🙋</h1>
      <p className="text-muted text-sm mb-6">আপনার বুকিং ও ফেভারিট — সব এক জায়গায়</p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="card p-4 text-center"><p className="font-heading font-bold text-2xl text-golddark">{bookings.length}</p><p className="text-xs text-muted">মোট বুকিং</p></div>
        <div className="card p-4 text-center"><p className="font-heading font-bold text-2xl text-amber-500">{pending}</p><p className="text-xs text-muted">অপেক্ষমাণ</p></div>
        <div className="card p-4 text-center"><p className="font-heading font-bold text-2xl text-emerald-600">{completed}</p><p className="text-xs text-muted">সম্পন্ন</p></div>
      </div>

      <h2 className="font-heading font-bold text-xl mb-3">আমার বুকিং</h2>
      {bookings.length === 0 ? (
        <EmptyState icon="📅" title="কোনো বুকিং নেই" sub="একজন ফটোগ্রাফার বেছে নিয়ে প্রথম বুকিং দিন" />
      ) : (
        <div className="space-y-3 mb-10">
          {bookings.map((b) => (
            <div key={b.id} className="card p-4 flex flex-col md:flex-row md:items-center gap-4">
              <img src={b.photographers?.profile_photo_url || ''} className="w-14 h-14 rounded-full object-cover" alt="" />
              <div className="flex-1">
                <Link to={`/photographer/${b.photographers?.slug}`} className="font-heading font-semibold hover:text-golddark">{b.photographers?.display_name}</Link>
                <p className="text-sm text-muted">📅 {bnDate(b.event_date)} {b.event_time ? `• ⏰ ${b.event_time}` : ''} {b.packages?.price != null ? `• ${b.packages.name} (${taka(b.packages.price)})` : ''}</p>
                {b.event_location && <p className="text-xs text-muted">📍 {b.event_location}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${STATUS_STYLE[b.status]}`}>{STATUS_BN[b.status]}</span>
                {(b.status === 'pending' || b.status === 'accepted') && (
                  <button onClick={() => cancel(b.id)} className="text-sm text-red-500 hover:underline">বাতিল</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-heading font-bold text-xl mb-3">ফেভারিট ফটোগ্রাফার ❤️</h2>
      {favs.length === 0 ? <EmptyState icon="🤍" title="ফেভারিট নেই" sub="পছন্দের ফটোগ্রাফারে ❤️ চাপুন" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {favs.map((p) => (
            <Link key={p.id} to={`/photographer/${p.slug}`} className="card p-4 flex items-center gap-3 hover:shadow-cardhover transition">
              <img src={p.profile_photo_url || ''} className="w-12 h-12 rounded-full object-cover" alt="" />
              <div>
                <p className="font-heading font-semibold">{p.display_name}</p>
                <p className="text-xs text-muted">{p.city} • {taka(p.starting_price || 0)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
