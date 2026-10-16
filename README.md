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
cp dist/index.html dist/404.html   # Cloudflare SPA fallback (repo-র 404.html শুধু GitHub-Pages redirect)
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npx wrangler pages deploy dist --project-name=photolagbe --branch=main
```
Build config: build command `npm run build`, output `dist`। Live: **https://photolagbe.pages.dev**

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

## ☁️ Cloudinary Setup (ছবি/ভিডিও হোস্টিং — ফ্রি)
সব পোর্টফোলিও ছবি/ভিডিও, প্রোফাইল/কভার ফটো ও KYC ডকুমেন্ট **Cloudinary**-তে হোস্ট হয় — Supabase-এ শুধু URL (text) থাকে। Delivery স্বয়ংক্রিয়ভাবে **WebP/AVIP-তে কনভার্ট** (`f_auto,q_auto`) হয় এবং মোবাইলের জন্য responsive `srcSet` তৈরি হয়।

1. [cloudinary.com](https://cloudinary.com)-এ ফ্রি অ্যাকাউন্ট খুলুন
2. Dashboard থেকে **Cloud name** কপি করুন
3. Settings → Upload → **Add upload preset** → Signing mode: **Unsigned** → সেভ করুন
4. `.env`-এ দিন:
```env
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
```
সেটআপ না থাকলেও পুরনো লিংক-পেস্ট পদ্ধতি কাজ করবে; ফাইল-আপলোড বাটন ব্যবহারের জন্য এই কনফিগ লাগবে।

## 🗺️ ম্যাপ (API key ছাড়া ফ্রি)
Leaflet + **Esri World Imagery** (স্যাটেলাইট) ও **Esri Dark Gray Canvas** (ম্যাপ) — কোনো API key ছাড়াই ফ্রি। "আমার লোকেশন নিন" চাপলে প্রতিটি স্পটের **দূরত্ব (কিমি)** দেখায় ও দূরত্ব অনুযায়ী সাজায়।

## 📱 WhatsApp কন্টাক্ট
ফটোগ্রাফার Studio Dashboard → প্রোফাইল সেটিংসে ফোন নম্বর দিলে প্রোফাইল পেজে **WhatsApp-এ মেসেজ** বাটন দেখাবে (pre-filled Bengali message সহ)।
