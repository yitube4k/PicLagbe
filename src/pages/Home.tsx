import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Category, Photographer } from '../lib/types'
import PhotographerCard from '../components/PhotographerCard'
import { SkeletonCard } from '../components/States'
import { toBn } from '../lib/utils'

export default function Home() {
  const [cats, setCats] = useState<Category[]>([])
  const [photogs, setPhotogs] = useState<Photographer[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState({ city: '', cat: '' })
  const nav = useNavigate()

  useEffect(() => {
    ;(async () => {
      const [c, p] = await Promise.all([
        supabase.from('categories').select('*').order('id'),
        supabase
          .from('photographers')
          .select('*, photographer_categories(category_id, categories(name, slug, icon))')
          .eq('profile_status', 'approved')
          .order('rating_avg', { ascending: false })
          .limit(6),
      ])
      setCats(c.data || [])
      setPhotogs((p.data as Photographer[]) || [])
      setLoading(false)
    })()
  }, [])

  const search = () => {
    const params = new URLSearchParams()
    if (q.city) params.set('city', q.city)
    if (q.cat) params.set('cat', q.cat)
    nav('/photographers?' + params.toString())
  }

  return (
    <div>
      {/* ── HERO: Editorial split ── */}
      <section className="bg-ink text-white">
        <div className="max-w-7xl mx-auto px-4 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="badge bg-gold/15 text-gold mb-4">🇧🇩 বাংলাদেশের #১ ফটোগ্রাফার মার্কেটপ্লেস</span>
            <h1 className="font-heading font-bold text-4xl md:text-5xl leading-tight mb-4">
              স্মৃতি বাঁধুন <span className="text-gold">ফ্রেমে</span>
            </h1>
            <p className="text-gray-300 mb-7 max-w-md">বিয়ে, জন্মদিন, ইভেন্ট বা প্রোডাক্ট — আপনার শহরের যাচাইকৃত সেরা ফটোগ্রাফার, পোর্টফোলিওসহ। পছন্দ করুন, বুক করুন, মুহূর্ত ধরে রাখুন।</p>

            {/* search pills */}
            <div className="bg-white/5 border border-white/10 rounded-xl2 p-3 backdrop-blur flex flex-col sm:flex-row gap-2">
              <select value={q.city} onChange={(e) => setQ({ ...q, city: e.target.value })} className="input !bg-white/95 text-gray-800 flex-1">
                <option value="">সব শহর</option>
                <option>ঢাকা</option><option>চট্টগ্রাম</option><option>সিলেট</option><option>খুলনা</option><option>বরিশাল</option>
              </select>
              <select value={q.cat} onChange={(e) => setQ({ ...q, cat: e.target.value })} className="input !bg-white/95 text-gray-800 flex-1">
                <option value="">সব ক্যাটাগরি</option>
                {cats.map((c) => <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>)}
              </select>
              <button onClick={search} className="btn-primary shrink-0">🔍 খুঁজুন</button>
            </div>

            <div className="mt-7 flex flex-wrap gap-6 text-sm">
              <div><p className="font-heading font-bold text-gold text-xl">{toBn(150)}+</p><p className="text-gray-400">ফটোগ্রাফার</p></div>
              <div><p className="font-heading font-bold text-gold text-xl">{toBn(2000)}+</p><p className="text-gray-400">সফল শুট</p></div>
              <div><p className="font-heading font-bold text-gold text-xl">{toBn(64)}</p><p className="text-gray-400">জেলা কভারেজ</p></div>
            </div>
          </div>

          {/* staggered photo grid */}
          <div className="hidden md:grid grid-cols-2 gap-3">
            <img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=760&fit=crop" alt="বিয়ের ফটোগ্রাফি" className="rounded-xl2 object-cover w-full h-72 shadow-cardhover" loading="eager" />
            <div className="space-y-3 pt-10">
              <img src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=400&fit=crop" alt="ফ্যাশন পোর্ট্রেট" className="rounded-xl2 object-cover w-full h-40 shadow-card" loading="eager" />
              <img src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&h=300&fit=crop" alt="জন্মদিন" className="rounded-xl2 object-cover w-full h-32 shadow-card" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <h2 className="font-heading font-bold text-2xl md:text-3xl text-center mb-2">জনপ্রিয় ক্যাটাগরি</h2>
        <p className="text-muted text-center text-sm mb-8">আপনার প্রয়োজন অনুযায়ী ফটোগ্রাফি বেছে নিন</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {cats.map((c) => (
            <Link key={c.id} to={`/photographers?cat=${c.slug}`} className="card p-5 text-center hover:border-gold hover:shadow-cardhover transition-all duration-200 hover:-translate-y-0.5">
              <div className="text-3xl mb-2">{c.icon}</div>
              <p className="font-heading font-semibold text-sm">{c.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FEATURED PHOTOGRAPHERS ── */}
      <section className="max-w-7xl mx-auto px-4 pb-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-heading font-bold text-2xl md:text-3xl">ফিচার্ড ফটোগ্রাফার</h2>
            <p className="text-muted text-sm mt-1">সবচেয়ে বেশি রেটিং পাওয়া প্রফেশনালরা</p>
          </div>
          <Link to="/photographers" className="btn-outline !py-2 text-sm">সব দেখুন →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : photogs.map((p) => <PhotographerCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-white border-y border-gray-100 py-14">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-center mb-10">কীভাবে PicLagbe কাজ করে</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              ['🔍', 'খুঁজুন', 'শহর ও ক্যাটাগরি দিয়ে ফিল্টার করে সেরা ফটোগ্রাফার বেছে নিন'],
              ['🧐', 'যাচাই করুন', 'পোর্টফোলিও, প্যাকেজ, রেটিং ও রিভিউ মিলিয়ে সিদ্ধান্ত নিন'],
              ['📅', 'বুক করুন', 'তারিখ ও প্যাকেজ ঠিক করে বুকিং রিকোয়েস্ট পাঠান'],
              ['📸', 'মুহূর্ত ধরুন', 'শুট শেষে রিভিউ দিন, স্মৃতি চিরদিনের জন্য রাখুন'],
            ].map(([icon, title, desc], i) => (
              <div key={i} className="text-center px-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-gold/10 text-2xl flex items-center justify-center mb-3">{icon}</div>
                <span className="text-xs font-heading text-golddark font-bold">ধাপ {toBn(i + 1)}</span>
                <h3 className="font-heading font-bold mt-1">{title}</h3>
                <p className="text-sm text-muted mt-1.5 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="bg-gradient-to-r from-ink to-slate2 rounded-xl2 p-8 md:p-12 text-center text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold/10 rounded-full" />
          <div className="absolute -bottom-14 -left-8 w-52 h-52 bg-gold/5 rounded-full" />
          <h2 className="font-heading font-bold text-2xl md:text-3xl mb-3">আপনি কি ফটোগ্রাফার?</h2>
          <p className="text-gray-300 mb-6 max-w-lg mx-auto">PicLagbe-তে প্রোফাইল খুলুন — হাজারো ক্লায়েন্টের কাছে পৌঁছান। পোর্টফোলিও দেখান, বুকিং নিন, ব্যবসা বাড়ান।</p>
          <Link to="/register?role=photographer" className="btn-primary">ফ্রি প্রোফাইল খুলুন →</Link>
        </div>
      </section>
    </div>
  )
}
