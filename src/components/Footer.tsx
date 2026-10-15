import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-ink text-gray-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-full bg-gold text-ink flex items-center justify-center font-heading font-bold text-lg">P</span>
            <span className="font-heading font-bold text-xl text-white">Pic<span className="text-gold">Lagbe</span></span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">স্মৃতি বাঁধুন ফ্রেমে। বাংলাদেশের যাচাইকৃত সেরা ফটোগ্রাফার — এক জায়গায়।</p>
        </div>
        <div>
          <h4 className="text-white font-heading font-semibold mb-3">জনপ্রিয় ক্যাটাগরি</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/photographers?cat=wedding" className="hover:text-gold transition">বিয়ের ফটোগ্রাফি</Link></li>
            <li><Link to="/photographers?cat=pre-wedding" className="hover:text-gold transition">প্রি-ওয়েডিং</Link></li>
            <li><Link to="/photographers?cat=birthday" className="hover:text-gold transition">জন্মদিন</Link></li>
            <li><Link to="/photographers?cat=product" className="hover:text-gold transition">প্রোডাক্ট শুট</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-heading font-semibold mb-3">শহর</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/photographers?city=ঢাকা" className="hover:text-gold transition">ঢাকা</Link></li>
            <li><Link to="/photographers?city=চট্টগ্রাম" className="hover:text-gold transition">চট্টগ্রাম</Link></li>
            <li><Link to="/photographers?city=সিলেট" className="hover:text-gold transition">সিলেট</Link></li>
            <li><Link to="/photographers?city=খুলনা" className="hover:text-gold transition">খুলনা</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-heading font-semibold mb-3">PicLagbe নিয়ে</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/join" className="hover:text-gold transition">ফটোগ্রাফার হন</Link></li>
            <li><Link to="/photographers" className="hover:text-gold transition">ফটোগ্রাফার খুঁজুন</Link></li>
            <li><span className="text-gray-500">সাপোর্ট: yitube4k@gmail.com</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} PicLagbe — বাংলাদেশের ফটোগ্রাফার মার্কেটপ্লেস
      </div>
    </footer>
  )
}
