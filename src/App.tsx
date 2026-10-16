import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Outlet, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Site pages
import Home from './pages/Home';
import Search from './pages/Search';
import PhotographerProfile from './pages/PhotographerProfile';
import Finder from './pages/Finder';
import SpotPage from './pages/SpotPage';
import Community from './pages/Community';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Auth from './pages/Auth';
import CustomerDash from './pages/CustomerDash';
import StudioDash from './pages/StudioDash';
import ChatPage from './pages/ChatPage';
import HowItWorks from './pages/HowItWorks';

// V18 modular admin — one route per file in src/admin/
import AdminLayout from './admin/layout';
import AdminDashboard from './admin/dashboard';
import AdminNotification from './admin/notification';
import AdminUser from './admin/user';
import AdminPhotographer from './admin/photographer';
import AdminPost from './admin/post';
import AdminBooking from './admin/booking';
import AdminReview from './admin/review';
import AdminBlog from './admin/blog';
import AdminCategory from './admin/category';
import AdminKyc from './admin/kyc';
import AdminRequests from './admin/requests';
import AdminChat from './admin/chat';
import AdminAudit from './admin/audit';
import AdminSettings from './admin/settings';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/* Site chrome (navbar + footer) wraps everything EXCEPT /admin,
   which is a full-screen app-like shell (V18). */
function SiteLayout() {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Perf: .aurora এখন শুধু static radial-gradient (CSS) — blur blob spans সরানো হয়েছে (লো-এন্ড ডিভাইসে GPU ল্যাগ) */}
      <div className="aurora" aria-hidden="true" />

      <Navbar />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

function NotFound() {
  return (
    <div className="max-w-md mx-auto px-6 pt-40 pb-24 text-center">
      <div className="glass-card p-12 rounded-xl3 space-y-4">
        <h2 className="text-4xl font-extrabold grad-text">৪০৪</h2>
        <h3 className="text-xl font-bold text-white">পৃষ্ঠা পাওয়া যায়নি</h3>
        <p className="text-sm text-white/60 mb-6">আপনি যে পৃষ্ঠায় প্রবেশ করতে চেয়েছেন তা বিদ্যমান নয়।</p>
        <Link to="/" className="btn-primary">
          হোমে ফিরে যান
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* ═══ V18 modular admin — full-screen shell, own URL per section ═══ */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="notification" element={<AdminNotification />} />
            <Route path="user" element={<AdminUser />} />
            <Route path="photographer" element={<AdminPhotographer />} />
            <Route path="post" element={<AdminPost />} />
            <Route path="booking" element={<AdminBooking />} />
            <Route path="review" element={<AdminReview />} />
            <Route path="blog" element={<AdminBlog />} />
            <Route path="category" element={<AdminCategory />} />
            <Route path="kyc" element={<AdminKyc />} />
            <Route path="requests" element={<AdminRequests />} />
            <Route path="chat" element={<AdminChat />} />
            <Route path="audit" element={<AdminAudit />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* ═══ Site pages (navbar + footer chrome) ═══ */}
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/photographers" element={<Search />} />
            <Route path="/photographer/:id" element={<PhotographerProfile />} />
            <Route path="/finder" element={<Finder />} />
            <Route path="/spot/:key" element={<SpotPage />} />
            <Route path="/community" element={<Community />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<CustomerDash />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/studio" element={<StudioDash />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}
