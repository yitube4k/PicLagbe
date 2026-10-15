import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
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
import AdminDash from './pages/AdminDash';
import ChatPage from './pages/ChatPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
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
        <div className="min-h-screen flex flex-col relative">
          {/* Perf: .aurora এখন শুধু static radial-gradient (CSS) — blur blob spans সরানো হয়েছে (লো-এন্ড ডিভাইসে GPU ল্যাগ) */}
          <div className="aurora" aria-hidden="true" />

          <Navbar />

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/photographers" element={<Search />} />
              <Route path="/photographer/:id" element={<PhotographerProfile />} />
              <Route path="/finder" element={<Finder />} />
              <Route path="/spot/:key" element={<SpotPage />} />
              <Route path="/community" element={<Community />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<CustomerDash />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/studio" element={<StudioDash />} />
              <Route path="/admin" element={<AdminDash />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}
