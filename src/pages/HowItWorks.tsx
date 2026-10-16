import React from 'react';
import { Link } from 'react-router-dom';
import { toBn } from '../lib/utils';

/**
 * ═══ কীভাবে কাজ করে — ডেডিকেটেড গাইড পেজ ═══
 * ফটোগ্রাফার কীভাবে বুক করবেন — শুরু থেকে শেষ পর্যন্ত পূর্ণ বিবরণ,
 * যেন যে-কেউ পড়ে পুরোপুরি বুঝতে পারে। (হোমপেজের বড় সেকশনটি এখানে সরানো হয়েছে)
 */

const STEPS: { num: number; title: string; icon: React.ReactNode; body: string[]; tips?: string[] }[] = [
  {
    num: 1,
    title: 'ফটোগ্রাফার খুঁজে বের করুন',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    body: [
      'হেডারের সার্চ বারে (অ্যাভাটার মেনুর ঠিক পাশে, কীবোর্ডে " / " চাপলেও খোলে) আপনি যা চান তা লিখুন — যেমন "বিয়ে", "প্রি-ওয়েডিং", "ড্রোন" বা "ট্রাভেল শুট"। সার্চের সাথে স্পট (লাবণী, ইনানী, হিমছড়ি…) আর ক্যাটাগরি ফিল্টারও দিতে পারবেন।',
      'অথবা সরাসরি "ফটোগ্রাফার খুঁজুন" পেজে গিয়ে সব ভেরিফায়েড ফটোগ্রাফারের তালিকা দেখুন। প্রত্যেক কার্ডে দাম শুরু কত থেকে, রেটিং কত আর কোন স্পটে কাজ করেন — এক নজরে লেখা থাকে।',
      'কোনো নির্দিষ্ট ট্যুর পয়েন্টে ছবি তুলতে চাইলে সেই স্পটের পেজে ঢুকুন (হোমপেজের "সব ট্যুর পয়েন্ট" থেকে ক্লিক করুন) — সেই স্পটে কাজ করা ফটোগ্রাফাররা আগে দেখাবে।',
    ],
    tips: [
      '১৯টি স্পটের যে-কোনোটিতে স্পট ফিল্টার দিয়ে খুঁজুন — ফটোগ্রাফারের হোম-স্পট অনুযায়ী সাজানো থাকে।',
      'ভেরিফায়েড (নীল টিক) প্রোফাইল মানে KYC-যাচাই করা ফটোগ্রাফার — নিরাপদ পছন্দ।',
    ],
  },
  {
    num: 2,
    title: 'প্রোফাইল ভালো করে যাচাই করুন',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
    body: [
      'ফটোগ্রাফারের নামে ক্লিক করলে তাঁর সম্পূর্ণ প্রোফাইল খুলবে। এখানে তাঁর পোর্টফোলিও (আসল কাজের ছবি), অভিজ্ঞতার বছর, ব্যবহৃত যন্ত্রপাতি, ভাষা আর সার্ভিস এরিয়া — সব দেখতে পাবেন।',
      'নিচের দিকে প্যাকেজ লিস্ট থাকে — কোন প্যাকেজে কত ঘণ্টা, কত ছবি ডেলিভারি, কী কী অন্তর্ভুক্ত (ড্রোন, ভিডিও, অ্যালবাম) আর দাম কত। আপনার বাজেট আর প্রয়োজন মিলিয়ে প্যাকেজ বেছে নিন।',
      'রিভিউ সেকশনে আগের গ্রাহকদের আসল অভিজ্ঞতা পড়ুন — সময়মতো এসেছিল কি না, ছবির কোয়ালিটি কেমন ছিল, ব্যবহার ঠিক ছিল কি না। রেটিং যত বেশি রিভিউ দিয়ে অর্জিত, তত নির্ভরযোগ্য।',
    ],
    tips: [
      'শুধু দাম দেখে সিদ্ধান্ত নেবেন না — পোর্টফোলিওর ছবি আর রিভিউ মিলিয়ে দেখুন।',
      'ফটোগ্রাফারের পোস্ট (কাজের নতুন ছবি) নিয়মিত আপলোড হলে বুঝবেন তিনি সক্রিয়।',
    ],
  },
  {
    num: 3,
    title: 'ম্যাপে লোকেশন ও দূরত্ব দেখুন',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
    body: [
      '"ম্যাপে দেখুন" পেজে ১৯টি ট্যুর পয়েন্ট এক ম্যাপে দেখা যায় — প্রতিটি পয়েন্টে কতজন ফটোগ্রাফার রেজিস্টার্ড, সংখ্যা লেখা থাকে। ক্যামেরা আইকনে ফটোগ্রাফারের নাম ও রেটিং দেখা যায়, ক্লিক করলে সরাসরি প্রোফাইল খোলে।',
      '"আমার লোকেশন নিন" বাটনে চাপ দিলে আপনার থেকে প্রতিটি স্পট কত কিমি দূরে — তা দেখিয়ে দূরত্ব অনুযায়ী সাজিয়ে দেয়। স্যাটেলাইট ভিউতে স্পটের আসল চেহারাও দেখা যায়।',
      'যেকোনো স্পটে ক্লিক করলে নতুন ট্যাবে গুগল ম্যাপ ডিরেকশন খুলে — কীভাবে যাবেন তা-ও এক ক্লিকে বের করা যায়।',
    ],
  },
  {
    num: 4,
    title: 'প্যাকেজ বেছে বুকিং দিন',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M9 16l2 2 4-4" />
      </svg>
    ),
    body: [
      'প্রোফাইলে পছন্দের প্যাকেজে "বুক করুন" চাপুন। ফর্মে দিন (তারিখ), সময়, শুট হবে কোথায় (লোকেশন) আর একটি ছোট নোট দিন — কী ধরনের শুট, কতজন মানুষ, বিশেষ কোনো চাহিদা আছে কি না।',
      'লগইন না থাকলে আগে দ্রুত সাইন-আপ করুন (গুগল বা ইমেইল-পাসওয়ার্ড দিয়ে) — বুকিং ট্র্যাক করতে অ্যাকাউন্ট লাগে।',
      'বুকিং পাঠানোর পর ফটোগ্রাফার সেটি "গৃহীত / বাতিল" করবেন — সিদ্ধান্ত হলেই আপনার ড্যাশবোর্ডে স্ট্যাটাস আপডেট হবে এবং নোটিফিকেশন পাবেন।',
    ],
    tips: [
      'জনপ্রিয় সিজনে (নভেম্বর–ফেব্রুয়ারি) ৩–৫ দিন আগে বুক করা নিরাপদ।',
      'সূর্যাস্তের সময় (বিকেল ৪:৩০–৬:০০) সবচেয়ে সুন্দর আলো পাওয়া যায় — নোটে লিখে দিন।',
    ],
  },
  {
    num: 5,
    title: 'WhatsApp-এ সরাসরি কথা বলুন',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
    body: [
      'বুকিং গৃহীত হলে আপনার ড্যাশবোর্ডের বুকিং কার্ডে ফটোগ্রাফারের WhatsApp আর ফোন বাটন সক্রিয় হয় — এক ক্লিকে সরাসরি কথা বলতে পারবেন।',
      'WhatsApp-এ শুটের আগে বিস্তারিত ঠিক করে নিন: কোথায় দেখা হবে, কয়টায়, কী কী স্টাইলের ছবি চান (সলো-শট, ক্যান্ডিড, ড্রোন), ছবি কত দিনে হাতে পাবেন।',
      'সাইটের ভেতরের চ্যাট ব্যবহার করলে পুরো কথোপকথনের রেকর্ড থাকে — ভবিষ্যতে কোনো বিভ্রান্তি হলে প্রমাণ হিসেবে কাজে লাগে।',
    ],
  },
  {
    num: 6,
    title: 'শুট ডে — আরামে ছবি তুলুন',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    body: [
      'সময়মতো স্পটে পৌঁছান, মোবাইল চার্জড রাখুন, আর পানি সাথে রাখুন — সমুদ্রতীরে রোদে ক্লান্তি বেশি লাগে। ভালো পোশাক আর এক সেট বদলের পোশাক নিলে ভিন্ন ভাবের ছবি পাবেন।',
      'ফটোগ্রাফার পোজ নেওয়ায় সাহায্য করবেন — আরামে থাকলে ছবি স্বাভাবিক আসে। কোনো নির্দিষ্ট ভাব বা ফ্রেম চাইলে শুটের মাঝেই বলে নিন।',
      'টিকিট লাগে এমন স্পটে (সেন্ট মার্টিন, মহেশখালী ফেরি ইত্যাদি) আগে থেকে জেনে নিন — স্পট গাইড ব্লগে প্রতিটি পয়েন্টের ভাড়া-টিকিট-রুট বিস্তারিত লেখা আছে।',
    ],
  },
  {
    num: 7,
    title: 'ছবি বুঝে নিন, রিভিউ দিন',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
      </svg>
    ),
    body: [
      'শুট শেষে এডিটেড ছবি সাধারণত ২–৭ দিনের মধ্যে ডেলিভারি দেওয়া হয় (প্যাকেজভেদে) — Google Drive / WhatsApp-এ লিংক পাবেন।',
      'ছবি পেয়ে সন্তুষ্ট হলে ফটোগ্রাফারের প্রোফাইলে রিভিউ দিন — রেটিং আর লেখা রিভিউ পরের গ্রাহকের ভরসার ভিত্তি, আর ভালো কাজের প্রশংসা ফটোগ্রাফারকে আরও ভালো করতে উৎসাহ দেয়।',
      'কোনো সমস্যা হলে রিভিউ দেওয়ার আগে একবার ফটোগ্রাফারের সাথে কথা বলুন — বেশিরভাগ সমস্যাই কথা বলেই মিটে যায়।',
    ],
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'বুকিংয়ের জন্য টাকা আগে দিতে হয়?',
    a: 'ফটোলাগবে নিজে কোনো অর্থ নেয় না — পেমেন্ট ফটোগ্রাফারের সাথে সরাসরি ঠিক হয় (বিকাশ/নগদ/ক্যাশ)। অনেক ফটোগ্রাফার ডেট বুকিং রাখতে ২০–৩০% অ্যাডভান্স নেন, বাকিটা শুটের দিনে। অ্যাডভান্স দেওয়ার আগে বুকিং গৃহীত হয়েছে কি না ড্যাশবোর্ডে দেখে নিন।',
  },
  {
    q: 'ভেরিফায়েড ব্যাজের মানে কী?',
    a: 'ভেরিফায়েড ফটোগ্রাফার অর্থ তাঁর NID আর সেলফি যাচাই করা হয়েছে (KYC)। অ্যাডমিন ম্যানুয়ালি রিভিউ করে তবেই ব্যাজ দেয়। ভেরিফায়েড প্রোফাইল বেছে নিলে প্রতারণার ঝুঁকি অনেক কমে।',
  },
  {
    q: 'বুকিং বাতিল করতে চাইলে কী করব?',
    a: 'ড্যাশবোর্ডের বুকিং কার্ডে "বাতিল" অপশন আছে। যত আগে বাতিল করবেন, ফটোগ্রাফারের সময় তত ফেরত পাবেন — অ্যাডভান্স ফেরতের নিয়ম ফটোগ্রাফারভেদে ভিন্ন হতে পারে, তাই WhatsApp-এ কথা বলে নিন।',
  },
  {
    q: 'ফটোগ্রাফার হিসেবে যোগ দিতে চাই — কীভাবে?',
    a: 'সাইন-আপ করে প্রোফাইল মেনু থেকে "ফটোগ্রাফার হিসেবে যোগ দিন" আবেদন করুন। অভিজ্ঞতা, যন্ত্রপাতি আর পোর্টফোলিও লিংক দিলে অ্যাডমিন রিভিউ করে অনুমোদন দেবে। অনুমোদনের পর আপনার স্টুডিও ড্যাশবোর্ড খুলে যাবে — প্যাকেজ, পোস্ট, শিডিউল সব সাজাতে পারবেন।',
  },
  {
    q: 'স্পটের টিকিট, ভাড়া বা রুট জানতে চাই?',
    a: 'ব্লগ সেকশনে ১৯টি ট্যুর পয়েন্টের প্রতিটির জন্য আলাদা গাইড আছে — আসল ছবি, টিকিট দাম, ভাড়া, কোথায় কী খাবেন আর ঢাকা থেকে কীভাবে যাবেন — সব বাংলায় লেখা।',
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen pb-24">
      {/* Hero */}
      <section className="relative pt-32 pb-14 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(251,191,36,0.14),transparent_45%)] pointer-events-none" />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <span className="chip mb-5 inline-flex">📖 সম্পূর্ণ গাইড — শুরু থেকে শেষ</span>
          <h1 className="text-[clamp(2rem,5vw,3.2rem)] font-extrabold leading-tight text-white tracking-tight">
            কীভাবে <span className="grad-text">ফটোগ্রাফার বুক</span> করবেন
          </h1>
          <p className="text-white/65 mt-4 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            মাত্র ৭টি ধাপে কক্সবাজারের ভেরিফায়েড ফটোগ্রাফার বুক করুন — খোঁজা থেকে ছবি হাতে পাওয়া পর্যন্ত পুরো প্রক্রিয়া এখানেই ব্যাখ্যা করা। যে-কেউ পড়ে বুঝতে পারবেন।
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
            <Link to="/photographers" className="btn-primary px-7">ফটোগ্রাফার খুঁজুন</Link>
            <Link to="/finder" className="btn-ghost px-7">ম্যাপে দেখুন</Link>
          </div>
        </div>
      </section>

      {/* Step timeline */}
      <section className="max-w-3xl mx-auto px-6">
        <div className="space-y-6">
          {STEPS.map((s) => (
            <article key={s.num} className="glass-card rounded-xl3 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-14 h-14 rounded-2xl glass grid place-items-center relative">
                  {s.icon}
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-sunset-gradient text-[#1A0E06] text-xs font-extrabold grid place-items-center">
                    {toBn(s.num)}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug pt-1.5">
                  {s.title}
                </h2>
              </div>

              <div className="mt-4 space-y-3">
                {s.body.map((p, i) => (
                  <p key={i} className="text-white/75 text-base sm:text-lg leading-[1.85]">
                    {p}
                  </p>
                ))}
              </div>

              {s.tips && (
                <div className="mt-5 rounded-xl2 border border-sunset-gold/25 bg-sunset-soft/60 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-sunset-gold mb-2">💡 টিপস</p>
                  <ul className="space-y-1.5">
                    {s.tips.map((t, i) => (
                      <li key={i} className="text-sm text-white/75 leading-relaxed flex gap-2">
                        <span className="text-sunset-gold shrink-0">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="section-head text-center">সাধারণ প্রশ্ন (FAQ)</h2>
          <p className="section-sub text-center mt-2">
            যে প্রশ্নগুলো নতুন গ্রাহকদের মাথায় আসে — সরাসরি উত্তর
          </p>

          <div className="space-y-3 mt-8">
            {FAQS.map((f, i) => (
              <details key={i} className="glass rounded-xl2 p-5 group">
                <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
                  <span className="font-bold text-white text-[16.5px] leading-snug">{f.q}</span>
                  <span className="text-sunset-gold text-lg shrink-0 group-open:rotate-45 transition-transform">＋</span>
                </summary>
                <p className="text-white/70 text-[16.5px] leading-[1.85] mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 glass-card rounded-xl3 p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="w-56 h-56 rounded-full bg-sunset-gold/20 blur-3xl absolute -top-16 -right-16 pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-xl sm:text-2xl font-extrabold text-white">প্রস্তুত? আপনার ফটোগ্রাফার অপেক্ষা করছে</h3>
            <p className="text-white/60 text-sm sm:text-base mt-2 max-w-lg mx-auto leading-relaxed">
              এখনই খুঁজে দেখুন — লাবণী থেকে সেন্ট মার্টিন, প্রতিটি স্পটে ভেরিফায়েড ফটোগ্রাফার রেডি।
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <Link to="/photographers" className="btn-primary px-7">ফটোগ্রাফার খুঁজুন</Link>
              <Link to="/blog" className="btn-ghost px-7">স্পট গাইড পড়ুন</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
