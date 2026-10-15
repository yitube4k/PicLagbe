import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { slugify } from '../lib/utils'

export function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    setBusy(false)
    if (error) return setErr(error.message === 'Email not confirmed' ? 'ইমেইল কনফার্ম করা হয়নি — Gmail চেক করুন' : 'ইমেইল বা পাসওয়ার্ড ভুল')
    const { data } = await supabase.from('profiles').select('role').eq('email', email).maybeSingle()
    const role = data?.role
    nav(role === 'admin' ? '/dashboard/admin' : role === 'photographer' ? '/dashboard/photographer' : '/dashboard/customer')
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card p-8">
        <h1 className="font-heading font-bold text-2xl text-center mb-1">স্বাগতম ফিরে!</h1>
        <p className="text-sm text-muted text-center mb-6">PicLagbe অ্যাকাউন্টে লগইন করুন</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-heading font-medium">ইমেইল</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-sm font-heading font-medium">পাসওয়ার্ড</label>
            <input type="password" required value={pass} onChange={(e) => setPass(e.target.value)} className="input mt-1" placeholder="••••••••" />
          </div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button disabled={busy} className="btn-primary w-full disabled:opacity-60">{busy ? 'লগইন হচ্ছে…' : 'লগইন'}</button>
        </form>
        <p className="text-sm text-center mt-5 text-muted">
          অ্যাকাউন্ট নেই? <Link to="/register" className="text-golddark font-semibold hover:underline">রেজিস্টার করুন</Link>
        </p>
      </div>
    </div>
  )
}

export function Register() {
  const [params] = useSearchParams()
  const [role, setRole] = useState<'customer' | 'photographer'>(params.get('role') === 'photographer' ? 'photographer' : 'customer')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [city, setCity] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const { data, error } = await supabase.auth.signUp({
      email, password: pass,
      options: { data: { full_name: name } },
    })
    if (error) { setBusy(false); return setErr(error.message) }
    const uid = data.user?.id
    if (uid) {
      // profile auto-created by trigger with default role; update it
      await supabase.from('profiles').update({ full_name: name, phone: city }).eq('id', uid)
      if (role === 'photographer') {
        await supabase.from('photographers').insert({
          user_id: uid,
          slug: slugify(name) || 'photographer-' + uid.slice(0, 6),
          display_name: name,
          city: city || null,
          profile_status: 'pending',
        })
        await supabase.from('profiles').update({ role: 'photographer' }).eq('id', uid)
      }
    }
    setBusy(false)
    setDone(true)
  }

  if (done) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="text-5xl mb-4">📧</div>
      <h1 className="font-heading font-bold text-2xl mb-2">ইমেইল কনফার্ম করুন</h1>
      <p className="text-muted text-sm mb-6">আপনার ইমেইলে কনফার্মেশন লিংক পাঠানো হয়েছে। কনফার্ম করে লগইন করুন।</p>
      <Link to="/login" className="btn-primary">লগইন পেজে যান</Link>
    </div>
  )

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card p-8">
        <h1 className="font-heading font-bold text-2xl text-center mb-1">রেজিস্টার করুন</h1>
        <p className="text-sm text-muted text-center mb-5">ফ্রি অ্যাকাউন্ট খুলুন</p>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <button onClick={() => setRole('customer')} className={`pill text-center ${role === 'customer' ? 'pill-active' : ''}`}>🙋 কাস্টমার</button>
          <button onClick={() => setRole('photographer')} className={`pill text-center ${role === 'photographer' ? 'pill-active' : ''}`}>📸 ফটোগ্রাফার</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-heading font-medium">পুরো নাম</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" placeholder="আপনার নাম" />
          </div>
          <div>
            <label className="text-sm font-heading font-medium">ইমেইল</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-sm font-heading font-medium">পাসওয়ার্ড (৬+ অক্ষর)</label>
            <input type="password" required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} className="input mt-1" placeholder="••••••••" />
          </div>
          {role === 'photographer' && (
            <div>
              <label className="text-sm font-heading font-medium">শহর</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="input mt-1">
                <option value="">— নির্বাচন —</option>
                <option>ঢাকা</option><option>চট্টগ্রাম</option><option>সিলেট</option><option>খুলনা</option><option>বরিশাল</option>
              </select>
            </div>
          )}
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button disabled={busy} className="btn-primary w-full disabled:opacity-60">{busy ? 'তৈরি হচ্ছে…' : 'অ্যাকাউন্ট খুলুন'}</button>
        </form>
        <p className="text-sm text-center mt-5 text-muted">
          অ্যাকাউন্ট আছে? <Link to="/login" className="text-golddark font-semibold hover:underline">লগইন</Link>
        </p>
        {role === 'photographer' && <p className="text-xs text-muted text-center mt-3">⚠️ ফটোগ্রাফার প্রোফাইল অ্যাডমিন অনুমোদনের পর পাবলিক হবে</p>}
      </div>
    </div>
  )
}

export function Join() {
  const nav = useNavigate()
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="font-heading font-bold text-3xl md:text-4xl">PicLagbe-তে ফটোগ্রাফার হন 📸</h1>
        <p className="text-muted mt-2 max-w-2xl mx-auto">হাজারো ক্লায়েন্ট প্রতিদিন ফটোগ্রাফার খোঁজে। আপনার পোর্টফোলিও দেখান, প্যাকেজ সাজান, সরাসরি বুকিং নিন — কোনো কমিশন ছাড়াই সম্পূর্ণ ফ্রি।</p>
      </div>
      <div className="grid md:grid-cols-3 gap-5 mb-10">
        {[
          ['🪪', 'ভেরিফাইড ব্যাজ', 'অ্যাডমিন রিভিউয়ের পর ভেরিফাইড ব্যাজ পান — ক্লায়েন্টের আস্থা বাড়ে'],
          ['📈', 'ড্যাশবোর্ড', 'বুকিং, রেটিং, ভিউ — সব এক জায়গায় ট্র্যাক করুন'],
          ['💯', '০% কমিশন', 'আপনার আয় সম্পূর্ণ আপনার — প্ল্যাটফর্ম ফি নেই'],
        ].map(([i, t, d]) => (
          <div key={t} className="card p-6 text-center">
            <div className="text-3xl mb-2">{i}</div>
            <h3 className="font-heading font-bold">{t}</h3>
            <p className="text-sm text-muted mt-1">{d}</p>
          </div>
        ))}
      </div>
      <div className="text-center">
        <button onClick={() => nav('/register?role=photographer')} className="btn-primary text-base">ফ্রি প্রোফাইল খুলুন →</button>
      </div>
    </div>
  )
}
