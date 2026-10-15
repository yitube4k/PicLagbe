import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const { session, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const nav = useNavigate()

  const logout = async () => {
    await supabase.auth.signOut()
    setMenu(false)
    nav('/')
  }

  const dashLink =
    profile?.role === 'admin' ? '/dashboard/admin'
    : profile?.role === 'photographer' ? '/dashboard/photographer'
    : '/dashboard/customer'

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="w-9 h-9 rounded-full bg-ink text-gold flex items-center justify-center font-heading font-bold text-lg">P</span>
          <span className="font-heading font-bold text-xl">Pic<span className="text-golddark">Lagbe</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-heading font-medium text-gray-700">
          <Link to="/photographers" className="hover:text-golddark transition">ফটোগ্রাফার খুঁজুন</Link>
          <Link to="/photographers?cat=wedding" className="hover:text-golddark transition">বিয়ের ফটোগ্রাফি</Link>
          <Link to="/join" className="hover:text-golddark transition">ফটোগ্রাফার হন</Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <div className="relative">
              <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 btn-outline !py-2 !px-3">
                <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&background=D4AF37&color=121316`} className="w-7 h-7 rounded-full" alt="" />
                <span className="text-sm font-medium max-w-24 truncate">{profile?.full_name || 'Profile'}</span>
              </button>
              {menu && (
                <div className="absolute right-0 mt-2 w-48 card p-2 !rounded-lg z-50">
                  <Link to={dashLink} onClick={() => setMenu(false)} className="block px-3 py-2 rounded hover:bg-gray-50 text-sm">ড্যাশবোর্ড</Link>
                  {profile?.role === 'admin' && <Link to="/dashboard/admin" onClick={() => setMenu(false)} className="block px-3 py-2 rounded hover:bg-gray-50 text-sm">অ্যাডমিন প্যানেল</Link>}
                  <button onClick={logout} className="block w-full text-left px-3 py-2 rounded hover:bg-red-50 text-red-600 text-sm">লগআউট</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-outline !py-2">লগইন</Link>
              <Link to="/register?role=customer" className="btn-primary !py-2">রেজিস্টার</Link>
            </>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-2">
          <Link to="/photographers" onClick={() => setOpen(false)} className="block py-2 font-heading">ফটোগ্রাফার খুঁজুন</Link>
          <Link to="/join" onClick={() => setOpen(false)} className="block py-2 font-heading">ফটোগ্রাফার হন</Link>
          {session ? (
            <>
              <Link to={dashLink} onClick={() => setOpen(false)} className="block py-2 font-heading">ড্যাশবোর্ড</Link>
              <button onClick={logout} className="block py-2 text-red-600 font-heading">লগআউট</button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link to="/login" onClick={() => setOpen(false)} className="btn-outline flex-1 !py-2">লগইন</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="btn-primary flex-1 !py-2">রেজিস্টার</Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
