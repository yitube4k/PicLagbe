import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Photographer, Profile, Booking } from '../lib/types'
import { Loader, EmptyState } from '../components/States'
import { bnDate, STATUS_BN, STATUS_STYLE, toBn } from '../lib/utils'

const TABS = ['stats', 'photographers', 'users', 'bookings'] as const

export function AdminDash() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('stats')
  const [photogs, setPhotogs] = useState<Photographer[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [busy, setBusy] = useState(true)
  const [q, setQ] = useState('')

  const load = async () => {
    const [p, u, b] = await Promise.all([
      supabase.from('photographers').select('*, photographer_categories(category_id, categories(name, slug, icon))').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('bookings').select('*, photographers(display_name, slug), profiles(full_name)').order('created_at', { ascending: false }).limit(200),
    ])
    setPhotogs((p.data as Photographer[]) || [])
    setUsers((u.data as Profile[]) || [])
    setBookings((b.data as Booking[]) || [])
    setBusy(false)
  }

  useEffect(() => { load() }, [])

  const setStatus = async (id: string, status: string) => {
    const verb = { approved: 'অনুমোদন', blocked: 'ব্লক', banned: 'ব্যান', pending: 'পেন্ডিং', rejected: 'প্রত্যাখ্যান' }[status] || status
    if (!confirm(`সত্যিই "${verb}" করবেন?`)) return
    await supabase.from('photographers').update({ profile_status: status, verified: status === 'approved' }).eq('id', id)
    load()
  }

  if (busy) return <Loader />

  const stats = [
    ['মোট ইউজার', users.length, '👥'],
    ['ফটোগ্রাফার', photogs.length, '📸'],
    ['অনুমোদিত', photogs.filter((p) => p.profile_status === 'approved').length, '✅'],
    ['অপেক্ষমাণ', photogs.filter((p) => p.profile_status === 'pending').length, '⏳'],
    ['ব্লকড', photogs.filter((p) => p.profile_status === 'blocked').length, '🚫'],
    ['মোট বুকিং', bookings.length, '📅'],
    ['সম্পন্ন', bookings.filter((b) => b.status === 'completed').length, '🏁'],
    ['মোট রিভিউ', photogs.reduce((s, p) => s + (p.rating_count || 0), 0), '⭐'],
  ]

  const fp = photogs.filter((p) => !q || p.display_name.toLowerCase().includes(q.toLowerCase()) || (p.city || '').includes(q))
  const fu = users.filter((u) => !q || (u.full_name || '').toLowerCase().includes(q.toLowerCase()) || (u.email || '').includes(q))

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-heading font-bold text-2xl">অ্যাডমিন প্যানেল ⚡</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 নাম বা ইমেইল দিয়ে খুঁজুন…" className="input !w-64" />
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`pill ${tab === t ? 'pill-active' : ''}`}>
            {t === 'stats' ? '📊 স্ট্যাটস' : t === 'photographers' ? '📸 ফটোগ্রাফার' : t === 'users' ? '👥 ইউজার' : '📅 বুকিং'}
          </button>
        ))}
      </div>

      {tab === 'stats' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(([label, val, icon]) => (
            <div key={label as string} className="card p-5 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <p className="font-heading font-bold text-2xl">{toBn(val as number)}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'photographers' && (
        <div className="space-y-3">
          {fp.length === 0 ? <EmptyState icon="📸" title="কেউ নেই" /> : fp.map((p) => (
            <div key={p.id} className="card p-4 flex flex-col md:flex-row md:items-center gap-4">
              <img src={p.profile_photo_url || ''} className="w-12 h-12 rounded-full object-cover" alt="" />
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold truncate">{p.display_name} {p.verified && <span className="badge bg-gold text-ink">✓</span>}</p>
                <p className="text-xs text-muted">{p.city} • ⭐ {p.rating_avg || 0} ({p.rating_count || 0}) • ৳{p.starting_price}</p>
              </div>
              <span className={`badge ${p.profile_status === 'approved' ? 'bg-emerald-100 text-emerald-700' : p.profile_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{p.profile_status}</span>
              <div className="flex gap-1.5 flex-wrap">
                {p.profile_status !== 'approved' && <button onClick={() => setStatus(p.id, 'approved')} className="btn-primary !py-1 !px-3 text-xs">অনুমোদন</button>}
                {p.profile_status !== 'blocked' && <button onClick={() => setStatus(p.id, 'blocked')} className="btn-outline !py-1 !px-3 text-xs !text-red-500 !border-red-200">ব্লক</button>}
                {p.profile_status === 'blocked' && <button onClick={() => setStatus(p.id, 'approved')} className="btn-outline !py-1 !px-3 text-xs">আনব্লক</button>}
                <button onClick={() => setStatus(p.id, 'banned')} className="text-red-600 text-xs hover:underline px-1">ব্যান</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-3">
          {fu.length === 0 ? <EmptyState icon="👥" title="কেউ নেই" /> : fu.map((u) => (
            <div key={u.id} className="card p-4 flex items-center gap-3">
              <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || 'U')}&background=2A2D34&color=D4AF37`} className="w-10 h-10 rounded-full" alt="" />
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold truncate">{u.full_name || '—'}</p>
                <p className="text-xs text-muted truncate">{u.email}</p>
              </div>
              <span className={`badge ${u.role === 'admin' ? 'bg-ink text-gold' : u.role === 'photographer' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'bookings' && (
        <div className="space-y-3">
          {bookings.length === 0 ? <EmptyState icon="📅" title="কোনো বুকিং নেই" /> : bookings.map((b) => (
            <div key={b.id} className="card p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1">
                <p className="font-heading font-semibold text-sm">{b.profiles?.full_name || 'ক্লায়েন্ট'} → {b.photographers?.display_name || '—'}</p>
                <p className="text-xs text-muted">{bnDate(b.event_date)} • তৈরি {bnDate(b.created_at)}</p>
              </div>
              <span className={`badge ${STATUS_STYLE[b.status]}`}>{STATUS_BN[b.status]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
