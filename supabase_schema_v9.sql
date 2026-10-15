-- ═══════════ PhotoLagbe V9 — community chat + blog + Cox's Bazar locations ═══════════

-- ─── 1. COMMUNITY MESSAGES ───
create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null default 'সদস্য',
  avatar_url text,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists idx_community_created on public.community_messages (created_at desc);
alter table public.community_messages enable row level security;
drop policy if exists "community_read" on public.community_messages;
create policy "community_read" on public.community_messages for select using (true);
drop policy if exists "community_insert_own" on public.community_messages;
create policy "community_insert_own" on public.community_messages for insert with check (auth.uid() = user_id);
drop policy if exists "community_delete_own" on public.community_messages;
create policy "community_delete_own" on public.community_messages for delete using (auth.uid() = user_id or public.is_admin());
alter publication supabase_realtime add table public.community_messages;

insert into public.community_messages (user_id, display_name, body)
select p.id, 'ফটোলাগবে টিম',
  '🌊 সবাইকে স্বাগতম! এই কমিউনিটিতে কক্সবাজার ভ্রমণ, ফটোশুট টিপস আর ফটোগ্রাফার খোঁজা নিয়ে আলোচনা করুন। স্প্যাম ছাড়া সব পোস্ট স্বাগত!'
from public.profiles p where p.email = 'yitube4k@gmail.com'
and not exists (select 1 from public.community_messages limit 1);

-- ─── 2. BLOG POSTS ───
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null,
  cover_url text,
  content text not null,
  author text not null default 'ফটোলাগবে টিম',
  tags text[] not null default '{}',
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_blog_published on public.blog_posts (published, created_at desc);
alter table public.blog_posts enable row level security;
drop policy if exists "blog_read_published" on public.blog_posts;
create policy "blog_read_published" on public.blog_posts for select using (published = true or public.is_admin());
drop policy if exists "blog_admin_write" on public.blog_posts;
create policy "blog_admin_write" on public.blog_posts for all using (public.is_admin()) with check (public.is_admin());

insert into public.blog_posts (slug, title, excerpt, cover_url, content, tags) values
('cox-bazar-photography-guide', 'কক্সবাজারে ফটোশুটের সেরা গাইড ২০২৬', 'বিশ্বের দীর্ঘতম সমুদ্র সৈকতে লাইফটাইম শট পেতে যা জানা দরকার — সময়, স্পট, টাইড চার্ট আর বাজেট।', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80',
'## কেন কক্সবাজার?\n১২০ কিলোমিটার লম্বা প্রাকৃতিক সমুদ্র সৈকত — লাবণী থেকে ইনানী পর্যন্ত প্রতিটি পয়েন্টে আলাদা মুড।\n\n## সেরা সময়\n- **গোল্ডেন আওয়ার**: ভোর ৫:৩০–৬:৩০, বিকেল ৪:৩০–৫:৪৫\n- **ব্লু আওয়ার**: সূর্যাস্তের ২০ মিনিট পর — লাবণীতে সিলুয়েট শট\n\n## স্পট রিকমেন্ডেশন\n- প্রি-ওয়েডিং: হিমছড়ি ঝর্ণা, রেডিও পার্ক\n- ফ্যামিলি: সুগন্ধা পয়েন্ট\n- অ্যাডভেঞ্চার: কলাতলী সার্ফিং\n- ডকুমেন্টারি: পাটুয়ারটেক জেলেপাড়া\n\n## টাইড চার্ট\nভরাট টাইডে ইনানীর পাথর ডুবে যায় — রিফ্লেকশন শটের জন্য নামা টাইড নিন।\n\n## বাজেট\nফটোগ্রাফার ৩৫০০–১২০০০৳/সেশন, লন্ডনি রাইড ৩০০৳, মেরিন ড্রাইভ বাইক রেন্ট ৮০০৳।',
'{"গাইড","কক্সবাজার","টিপস"}'),
('inani-himchari-secret-spots', 'ইনানী থেকে হিমছড়ি — লোকালরা যেসব সিক্রেট স্পট জানে', 'মেরিন ড্রাইভ ধরে ৭টি এমন জায়গা যেখানে ক্রাউড নেই, কিন্তু ফ্রেম আপনার।', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1600&q=80',
'## মেরিন ড্রাইভ রুট\nকক্সবাজার → হিমছড়ি → মেরিন ড্রাইভ → পাটুয়ারটেক → ইনানী (৩২ কিমি)।\n\n## সিক্রেট স্পট লিস্ট\n1. **হিমছড়ি উপরের ঝর্ণা** — সকালে মেঘ নামে\n2. **পাটুয়ারটেক লাল নৌকা ঘাট** — বিকেলে লাল আলো\n3. **ইনানী রিফ পুল** — নামা টাইডে মিরর রিফ্লেকশন\n4. **রেইনবো ভ্যালি ব্রিজ** — ড্রোন টপ শট\n5. **ডাকাতিয়া নদী মোহনা** — সানসেট সিলুয়েট\n\n## কখন যাবেন\nনভেম্বর–ফেব্রুয়ারি: পরিষ্কার আকাশ। জুন–আগস্ট: ড্রামাটিক মনসুন ক্লাউড (ড্রোনের জন্য ঝুঁকিপূর্ণ)।',
'{"ইনানী","হিমছড়ি","মেরিন ড্রাইভ"}'),
('pre-wedding-cox-bazar', 'কক্সবাজারে প্রি-ওয়েডিং শুট: প্যাকেজ, বাজেট ও চেকলিস্ট', '৩৫০০ টাকা থেকে ১২ হাজার টাকা — কোন বাজেটে কী পাবেন, বিস্তারিত ভাঙামাল।', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80',
'## বাজেট ব্রেকডাউন\n- **বেসিক (৩৫০০–৫০০০৳)**: ২ ঘণ্টা, ১ স্পট, ৫০+ এডিটেড ছবি\n- **স্ট্যান্ডার্ড (৬০০০–৮০০০৳)**: ৩ ঘণ্টা, ২ স্পট, ড্রোন, ৮০+ ছবি\n- **প্রিমিয়াম (১০০০০–১২০০০৳)**: ফুল ডে, ৩ স্পট, ড্রোন + ভিডিও টিজার\n\n## চেকলিস্ট\n- টাইড চার্ট চেক\n- পোশাক স্পট অনুযায়ী (লাল/হোয়াইট = সমুদ্রে সেরা)\n- ব্যাকআপ ব্যাটারি — লবণাক্ত বাতাসে চার্জ কমে\n- শেষ মুহূর্তের ক্রাউড এড়াতে বিকেল ৪টার আগে পৌঁছান',
'{"প্রি-ওয়েডিং","বাজেট","চেকলিস্ট"}'),
('saint-martin-trip-photography', 'সেন্ট মার্টিন ফটোগ্রাফি ট্রিপ — প্ল্যানিং ফ্রম কক্সবাজার', 'করাল দ্বীপে অ্যাস্ট্রো ফটোগ্রাফি আর ছেড়া দ্বীপে মিল্কি ওয়ে — সম্পূর্ণ প্ল্যান।', 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1600&q=80',
'## যাত্রা\nকক্সবাজার টেকনাফ (৩ ঘণ্টা বাস) → টেকনাফ–সেন্ট মার্টিন শিপ (২ ঘণ্টা, সকাল ৯টা)।\n\n## শুট প্ল্যান\n- **দিন ১**: করাল রিফ স্নোর্কেলিং শট, সানসেট পশ্চিম বিচ\n- **রাত**: ছেড়া দ্বীপে মিল্কি ওয়ে (নতুন চাঁদের সময় যান)\n- **দিন ২**: সানরাইজ পয়েন্ট, জেলে ভিলেজ লাইফ\n\n## গিয়ার টিপস\nট্রাইপড বাধ্যতামূলক, ওয়াইড অ্যাপারচার লেন্স (f/1.4–2.8), হেডল্যাম্প — দ্বীপে বিদ্যুৎ সীমিত।',
'{"সেন্ট মার্টিন","অ্যাস্ট্রো","ট্রিপ প্ল্যান"}')
on conflict (slug) do nothing;

-- ─── 3. PHOTOGRAPHERS → COX'S BAZAR ONLY ───
alter table public.photographers add column if not exists home_spot text;

update public.photographers set
  city = 'কক্সবাজার',
  slug = v.new_slug,
  full_location = v.new_loc,
  bio = v.new_bio,
  home_spot = v.new_spot
from (values
  ('rahul-photography', 'rahul-photography', 'লাবণী পয়েন্ট, কক্সবাজার', 'কক্সবাজারে ১০ বছরে ৫০০+ ওয়েডিং ক্যাপচার। লাবণী-সুগন্ধায় সানসেট ক্যান্ডিড আমার সিগনেচার — প্রাকৃতিক আলো, সত্যিকারের হাসি।', 'laboni'),
  ('nadia-visuals', 'nadia-visuals', 'রেডিও পার্ক, কক্সবাজার', 'মেয়েদের জন্য আরামদায়ক ফিমেল ফটোশুট স্পেশালিস্ট। রেডিও পার্ক ও হিমছড়ি ঝর্ণায় প্রি-ওয়েডিং পোর্ট্রেটে ৭ বছরের অভিজ্ঞতা।', 'radiopark'),
  ('sabbir-lens', 'sabbir-lens', 'ইনানী সমুদ্র সৈকত', 'মেরিন ড্রাইভ–ইনানী রুটের ট্রাভেল ও প্রি-ওয়েডিং এক্সপার্ট। ইনানীর রিফ পুল রিফ্লেকশন শট আমার হাতের জাদু।', 'inani'),
  ('mithila-studio', 'mithila-studio', 'সুগন্ধা পয়েন্ট, কক্সবাজার', 'ফ্যামিলি ও জন্মদিন শুটে ৮ বছর। সুগন্ধা পয়েন্টের বিকেলের আলোয় শিশুর মুহূর্ত ধরা আমার নেশা।', 'sugandha'),
  ('tanvir-frames', 'tanvir-frames', 'সেন্ট মার্টিন দ্বীপ', 'সেন্ট মার্টিন–ছেড়া দ্বীপ ডেস্টিনেশন শুট স্পেশালিস্ট। করাল রিফ, মিল্কি ওয়ে অ্যাস্ট্রো — ৬ বছরে ১২০+ আইল্যান্ড ট্রিপ।', 'saintmartin'),
  ('farhan_clicks', 'farhan_clicks', 'হিমছড়ি, কক্সবাজার', 'হিমছড়ি ঝর্ণা ও মেরিন ড্রাইভে ড্রোন সিনেমাটোগ্রাফি বিশেষজ্ঞ। FPV ড্রোনে সমুদ্রের ওয়েভ এখন আমার ভাষা।', 'himchari')
) as v(old_slug, new_slug, new_loc, new_bio, new_spot)
where photographers.slug = v.old_slug;

-- ─── 4. PORTFOLIO: photo / video / demo prefixes (per photographer) ───
-- assign captions by sort_order cycle: 1-2 photo, 3 video, 4 demo, 5 photo, 6 video...
update public.portfolio_images pi
set caption = v.new_caption
from (
  select id, (
    case
      when sort_order % 4 = 3 then 'video: কক্সবাজার শুট ফুটেজ — ' || coalesce(nullif(caption,''), 'ওয়েভ ও গোল্ডেন আওয়ার')
      when sort_order % 4 = 0 then 'demo: ডেমো শুট স্যাম্পল — ' || coalesce(nullif(caption,''), 'মিনি সেশন প্রিভিউ')
      else coalesce(nullif(caption,''), 'কক্সবাজার সৈকত শুট')
    end
  ) as new_caption
  from public.portfolio_images
) v
where pi.id = v.id;
