import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import SearchPage from './pages/Search'
import PhotographerProfile from './pages/PhotographerProfile'
import { Login, Register, Join } from './pages/Auth'
import { CustomerDash, NotificationBell } from './dashboard/CustomerDash'
import { PhotographerDash } from './dashboard/PhotographerDash'
import { AdminDash } from './dashboard/AdminDash'
import { EmptyState } from './components/States'
import { useLocation } from 'react-router-dom'

function RouteGuard({ allow, children }: { allow: ('customer' | 'photographer' | 'admin')[]; children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <div className="py-24" />
  if (!session) return <Link to="/login" className="btn-primary">লগইন করুন</Link>
  if (!profile || !allow.includes(profile.role))
    return <div className="py-16"><EmptyState icon="🔒" title="প্রবেশাধিকার নেই" sub="এই পেজের জন্য আপনার অনুমতি নেই" /></div>
  return <>{children}</>
}

function Shell() {
  const { profile } = useAuth()
  const loc = useLocation()
  const hideNav = loc.pathname.startsWith('/dashboard')
  return (
    <div className="min-h-screen flex flex-col">
      {!hideNav && <Navbar />}
      {hideNav && (
        <header className="sticky top-0 z-50 bg-ink text-white">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-gold text-ink flex items-center justify-center font-heading font-bold">P</span>
              <span className="font-heading font-bold">PicLagbe <span className="text-gold text-xs font-normal">Dashboard</span></span>
            </Link>
            <div className="flex items-center gap-3">
              {profile && <NotificationBell />}
              <Link to="/" className="text-sm text-gray-300 hover:text-gold transition">← সাইটে ফিরুন</Link>
            </div>
          </div>
        </header>
      )}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/photographers" element={<SearchPage />} />
          <Route path="/photographer/:slug" element={<PhotographerProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/join" element={<Join />} />
          <Route path="/dashboard/customer" element={<RouteGuard allow={['customer', 'admin']}><CustomerDash /></RouteGuard>} />
          <Route path="/dashboard/photographer" element={<RouteGuard allow={['photographer', 'admin']}><PhotographerDash /></RouteGuard>} />
          <Route path="/dashboard/admin" element={<RouteGuard allow={['admin']}><AdminDash /></RouteGuard>} />
          <Route path="*" element={<div className="py-20"><EmptyState icon="🚧" title="পেজটি খুঁজে পাওয়া যায়নি (404)" sub="ঠিকানা একবার দেখে নিন" /></div>} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Shell />
      </Router>
    </AuthProvider>
  )
}
