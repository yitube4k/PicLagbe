# PicLagbe 📸 — বাংলাদেশের ফটোগ্রাফার মার্কেটপ্লেস (V8)

**Live:** https://photolagbe.pages.dev

PicLagbe একটি photographer marketplace — কাস্টমাররা ফটোগ্রাফার খুঁজে পোর্টফোলিও দেখে, প্যাকেজ তুলনা করে, বুকিং দেয়; ফটোগ্রাফাররা প্রোফাইল সাজিয়ে বুকিং ম্যানেজ করে; অ্যাডমিন অনুমোদন দেয়।

## ✨ Features
- 🔍 শহর/ক্যাটাগরি/বাজেট/রেটিং ফিল্টার + ৫টি সর্টিং
- 📸 Photographer profile: cover, avatar, packages, portfolio gallery (lightbox), reviews
- 📅 Booking system: pending → accepted → completed (+ reject/cancel), double-booking guard
- ⭐ Reviews: শুধু completed booking-এর ক্লায়েন্ট, unique per booking, auto rating trigger
- ❤️ Favorites, 🔔 Realtime notifications (booking events)
- 📊 তিনটি ড্যাশবোর্ড: Customer / Photographer (profile+packages+portfolio+bookings) / Admin (stats, approve/block/ban, users, bookings)
- 🇧🇩 পূর্ণ বাংলা UI + বাংলা সংখ্যা (৳১৫,০০০)
- 🔒 Supabase Auth + Row Level Security সব টেবিলে

## 🛠 Tech Stack
React 18 + TypeScript + Vite + Tailwind CSS + Supabase (Postgres/Auth/Storage/Realtime) + Cloudflare Pages

## 🚀 Local Development
```bash
npm install
cp .env.example .env   # আপনার Supabase keys দিন
npm run dev
```

## 🗄 Database Setup
`supabase/schema.sql` (বা repo-র SQL ফাইল) Supabase SQL Editor-এ চালান — tables, RLS, triggers, seed data সব একসাথে।

## ☁️ Deploy (Cloudflare Pages)
```bash
npm run build   # dist/ তৈরি হবে
npx wrangler pages deploy dist --project-name=photolagbe
```
Build config: build command `npm run build`, output `dist`। SPA fallback `public/_redirects` এ আছে।

## 🔐 Admin
প্রথম signup: `yitube4k@gmail.com` দিয়ে করলে trigger স্বয়ংক্রিয়ভাবে admin role দেবে (`handle_new_user` ফাংশনে তালিকাভুক্ত)।

## 📁 Structure
```
src/
├── lib/          supabase client, auth context, types, utils (বাংলা সংখ্যা)
├── components/   Navbar, Footer, PhotographerCard, StarRating, States
├── pages/        Home, Search, PhotographerProfile, Auth (Login/Register/Join)
└── dashboard/    CustomerDash (+NotificationBell), PhotographerDash, AdminDash
```
