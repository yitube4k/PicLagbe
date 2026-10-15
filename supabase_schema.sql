-- ═══════════════════════════════════════════════
-- PICLAGBE V8 — COMPLETE DATABASE SCHEMA
-- Photographer Marketplace for Bangladesh
-- ═══════════════════════════════════════════════

-- PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer','photographer','admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CATEGORIES
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique,
  icon text default '📸',
  created_at timestamptz default now()
);

-- PHOTOGRAPHERS
create table if not exists public.photographers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  bio text,
  city text,
  full_location text,
  experience_years int default 0,
  equipment text,
  languages text default 'বাংলা, English',
  starting_price int default 3000,
  profile_photo_url text,
  cover_photo_url text,
  profile_status text not null default 'pending' check (profile_status in ('pending','approved','blocked','banned')),
  verified boolean default false,
  rating_avg numeric(3,2) default 0,
  rating_count int default 0,
  profile_views int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PHOTOGRAPHER <-> CATEGORY
create table if not exists public.photographer_categories (
  photographer_id uuid references public.photographers(id) on delete cascade,
  category_id bigint references public.categories(id) on delete cascade,
  primary key (photographer_id, category_id)
);

-- PACKAGES
create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.photographers(id) on delete cascade,
  name text not null,
  description text,
  price int not null,
  duration_hours int default 4,
  features jsonb default '[]',
  created_at timestamptz default now()
);

-- PORTFOLIO IMAGES
create table if not exists public.portfolio_images (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.photographers(id) on delete cascade,
  url text not null,
  caption text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- AVAILABILITY (blocked/unavailable dates)
create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.photographers(id) on delete cascade,
  date date not null,
  status text not null default 'available' check (status in ('available','booked','unavailable')),
  unique(photographer_id, date)
);

-- BOOKINGS
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.photographers(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid references public.packages(id),
  event_date date not null,
  event_time text,
  event_location text,
  notes text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled','completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- REVIEWS (one per completed booking)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  photographer_id uuid not null references public.photographers(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- FAVORITES
create table if not exists public.favorites (
  customer_id uuid references public.profiles(id) on delete cascade,
  photographer_id uuid references public.photographers(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (customer_id, photographer_id)
);

-- REPORTS
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id),
  target_type text check (target_type in ('photographer','review','user')),
  target_id uuid,
  reason text,
  status text default 'open' check (status in ('open','resolved')),
  created_at timestamptz default now()
);

-- NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text,
  message text,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);

-- ═══════════ TRIGGERS ═══════════

-- Auto-create profile on signup; yitube4k@gmail.com = admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    case when new.email in ('yitube4k@gmail.com','admin@piclagbe.com') then 'admin' else 'customer' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Review counter updater
create or replace function public.update_photographer_rating()
returns trigger language plpgsql security definer as $$
begin
  update public.photographers p set
    rating_avg = (select round(avg(rating)::numeric,2) from public.reviews where photographer_id = new.photographer_id),
    rating_count = (select count(*) from public.reviews where photographer_id = new.photographer_id)
  where p.id = new.photographer_id;
  return new;
end $$;

drop trigger if exists on_review_created on public.reviews;
create trigger on_review_created
  after insert on public.reviews
  for each row execute function public.update_photographer_rating();

-- Booking notification helper
create or replace function public.notify_booking_change()
returns trigger language plpgsql security definer as $$
declare
  ph_user uuid;
begin
  select user_id into ph_user from public.photographers where id = new.photographer_id;
  if (TG_OP = 'INSERT') then
    insert into public.notifications (user_id, type, message, link)
    values (ph_user, 'booking', 'নতুন বুকিং রিকোয়েস্ট এসেছে', '/dashboard/bookings');
  elsif (TG_OP = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.notifications (user_id, type, message, link)
    values (new.customer_id, 'booking', 'বুকিং স্ট্যাটাস: ' || new.status, '/dashboard/bookings');
  end if;
  return new;
end $$;

drop trigger if exists on_booking_change on public.bookings;
create trigger on_booking_change
  after insert or update on public.bookings
  for each row execute function public.notify_booking_change();

-- ═══════════ INDEXES ═══════════
create index if not exists idx_photographers_status on public.photographers(profile_status);
create index if not exists idx_photographers_city on public.photographers(city);
create index if not exists idx_bookings_photographer on public.bookings(photographer_id);
create index if not exists idx_bookings_customer on public.bookings(customer_id);
create index if not exists idx_reviews_photographer on public.reviews(photographer_id);
create index if not exists idx_portfolio_photographer on public.portfolio_images(photographer_id);
create index if not exists idx_notifications_user on public.notifications(user_id, read);

-- ═══════════ RLS ═══════════
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.photographers enable row level security;
alter table public.photographer_categories enable row level security;
alter table public.packages enable row level security;
alter table public.portfolio_images enable row level security;
alter table public.availability enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

-- helper: is admin
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- PROFILES policies
drop policy if exists "profiles_all_admin" on public.profiles;
create policy "profiles_all_admin" on public.profiles for all using (public.is_admin());
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select using (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());

-- CATEGORIES: public read, admin write
drop policy if exists "categories_read" on public.categories;
create policy "categories_read" on public.categories for select using (true);

-- PHOTOGRAPHERS
drop policy if exists "photographers_read_approved" on public.photographers;
create policy "photographers_read_approved" on public.photographers for select using (
  profile_status = 'approved' or user_id = auth.uid() or public.is_admin()
);
drop policy if exists "photographers_insert_own" on public.photographers;
create policy "photographers_insert_own" on public.photographers for insert with check (user_id = auth.uid());
drop policy if exists "photographers_update_own" on public.photographers;
create policy "photographers_update_own" on public.photographers for update using (
  user_id = auth.uid() or public.is_admin()
);
drop policy if exists "photographers_delete_admin" on public.photographers;
create policy "photographers_delete_admin" on public.photographers for delete using (public.is_admin());

-- RELATED TABLES: public read, owner write (owner = photographer's user)
drop policy if exists "pc_read" on public.photographer_categories;
create policy "pc_read" on public.photographer_categories for select using (true);
drop policy if exists "pc_write" on public.photographer_categories;
create policy "pc_write" on public.photographer_categories for all using (
  exists (select 1 from public.photographers p where p.id = photographer_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.photographers p where p.id = photographer_id and p.user_id = auth.uid())
);

drop policy if exists "packages_read" on public.packages;
create policy "packages_read" on public.packages for select using (true);
drop policy if exists "packages_write" on public.packages;
create policy "packages_write" on public.packages for all using (
  exists (select 1 from public.photographers p where p.id = photographer_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.photographers p where p.id = photographer_id and p.user_id = auth.uid())
);

drop policy if exists "portfolio_read" on public.portfolio_images;
create policy "portfolio_read" on public.portfolio_images for select using (true);
drop policy if exists "portfolio_write" on public.portfolio_images;
create policy "portfolio_write" on public.portfolio_images for all using (
  exists (select 1 from public.photographers p where p.id = photographer_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.photographers p where p.id = photographer_id and p.user_id = auth.uid())
);

drop policy if exists "availability_read" on public.availability;
create policy "availability_read" on public.availability for select using (true);
drop policy if exists "availability_write" on public.availability;
create policy "availability_write" on public.availability for all using (
  exists (select 1 from public.photographers p where p.id = photographer_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.photographers p where p.id = photographer_id and p.user_id = auth.uid())
);

-- BOOKINGS: parties + admin
drop policy if exists "bookings_read_parties" on public.bookings;
create policy "bookings_read_parties" on public.bookings for select using (
  customer_id = auth.uid()
  or exists (select 1 from public.photographers p where p.id = photographer_id and p.user_id = auth.uid())
  or public.is_admin()
);
drop policy if exists "bookings_insert_customer" on public.bookings;
create policy "bookings_insert_customer" on public.bookings for insert with check (customer_id = auth.uid());
drop policy if exists "bookings_update_parties" on public.bookings;
create policy "bookings_update_parties" on public.bookings for update using (
  customer_id = auth.uid()
  or exists (select 1 from public.photographers p where p.id = photographer_id and p.user_id = auth.uid())
  or public.is_admin()
);

-- REVIEWS: public read, verified customers write
drop policy if exists "reviews_read" on public.reviews;
create policy "reviews_read" on public.reviews for select using (true);
drop policy if exists "reviews_insert_verified" on public.reviews;
create policy "reviews_insert_verified" on public.reviews for insert with check (
  customer_id = auth.uid()
  and exists (
    select 1 from public.bookings b
    where b.id = booking_id and b.customer_id = auth.uid() and b.status = 'completed'
  )
);

-- FAVORITES: own
drop policy if exists "favorites_own" on public.favorites;
create policy "favorites_own" on public.favorites for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- REPORTS
drop policy if exists "reports_insert" on public.reports;
create policy "reports_insert" on public.reports for insert with check (reporter_id = auth.uid());
drop policy if exists "reports_admin" on public.reports;
create policy "reports_admin" on public.reports for select using (public.is_admin());

-- NOTIFICATIONS: own
drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own" on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ═══════════ STORAGE ═══════════
insert into storage.buckets (id, name, public) values ('portfolio','portfolio', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('avatars','avatars', true) on conflict do nothing;

drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read" on storage.objects for select using (bucket_id in ('portfolio','avatars'));
drop policy if exists "storage_auth_upload" on storage.objects;
create policy "storage_auth_upload" on storage.objects for insert to authenticated with check (bucket_id in ('portfolio','avatars'));
drop policy if exists "storage_auth_delete" on storage.objects;
create policy "storage_auth_delete" on storage.objects for delete to authenticated using (bucket_id in ('portfolio','avatars'));

-- ═══════════ SEED: CATEGORIES ═══════════
insert into public.categories (name, slug, icon) values
  ('Wedding Photography','wedding','💍'),
  ('Pre-Wedding','pre-wedding','💕'),
  ('Birthday','birthday','🎂'),
  ('Event','event','🎉'),
  ('Portrait','portrait','🧑'),
  ('Fashion','fashion','👗'),
  ('Product','product','📦'),
  ('Travel','travel','✈️'),
  ('Corporate','corporate','💼'),
  ('Videography','videography','🎥')
on conflict (name) do nothing;

-- ═══════════ SEED: DEMO PHOTOGRAPHERS ═══════════
-- Demo photographers live without auth.users via NULL user_id trick is not possible (FK).
-- Instead: they attach to a shared demo profile created at runtime by the app seed.
insert into public.photographers (user_id, slug, display_name, bio, city, full_location, experience_years, equipment, starting_price, profile_status, verified, profile_photo_url, cover_photo_url)
select
  p.id, v.slug, v.name, v.bio, v.city, v.loc, v.years, v.equip, v.price, 'approved', true,
  'https://images.unsplash.com/' || v.avatar || '?w=400&h=400&fit=crop&crop=faces',
  'https://images.unsplash.com/' || v.cover || '?w=1600&h=600&fit=crop'
from (values
  ('rahul-photography','Rahul Ahmed','ঢাকার সেরা ওয়েডিং ফটোগ্রাফার। ১০ বছরের অভিজ্ঞতায় ৫০০+ বিয়ে ক্যাপচার করেছি। প্রাকৃতিক আলো ও candid মুহূর্ত ধরাই আমার নেশা।','ঢাকা','গুলশান, ঢাকা',10,'Canon R5, Sony A7III, DJI Drones',8000,'portrait-1507003211169-0a1dd7228f2d','photo-1519741497674-611481863552'),
  ('nadia-visuals','Nadia Rahman','Fashion ও portrait photography আমার ভাষা। নারী ফটোগ্রাফার হিসেবে মেয়েদের photoshoot-এ আরামদায়ক অভিজ্ঞতা নিশ্চিত করি।','ঢাকা','বনানী, ঢাকা',7,'Sony A7IV, 85mm f/1.4',12000,'portrait-1494790108377-be9c29b29330','photo-1529626455594-4ff0802cfb7e'),
  ('sabbir-lens','Sabbir Hossain','চট্টগ্রামের পাহাড় থেকে সমুদ্র পর্যন্ত — travel ও pre-wedding shoot এ বিশেষজ্ঞ।','চট্টগ্রাম','খুলশী, চট্টগ্রাম',5,'Nikon Z6II, Fuji XT4',5000,'portrait-1500648767791-00dcc994a43e','photo-1502920917128-1aa500764cbd'),
  ('mithila-studio','Mithila Studio','বরিশালের নদীর পাশে জন্ম নেওয়া স্টুডিও। জন্মদিন, আকিকা ও পারিবারিক অনুষ্ঠানের স্মৃতি রাখি চিরসবুজ।','বরিশাল','নথুল্লাবাদ, বরিশাল',8,'Canon R6, Godox Lights',4000,'portrait-1438761681033-6461ffad8d80','photo-1530103862676-de8c9debad1d'),
  ('tanvir-frames','Tanvir Islam','সিলেটের চা বাগান আমার স্টুডিও। Destination wedding ও corporate event এ ৬ বছরের অভিজ্ঞতা।','সিলেট','জিন্দাবাজার, সিলেট',6,'Sony A1, 24-70 GM',6000,'portrait-1472099645785-5658abf4ff4e','photo-1511285560929-80b456fea0bc'),
  ('farhan_clicks','Farhan Khan','খুলনার product ও corporate photography বিশেষজ্ঞ। E-commerce brand গুলোর বিশ্বস্ত পার্টনার।','খুলনা','সোনাডাঙ্গা, খুলনা',4,'Canon 90D, Macro Lens',3500,'portrait-1506794778202-cad84cf45f1d','photo-1554080353-a576cf803bda')
) as v(slug,name,bio,city,loc,years,equip,price,avatar,cover)
join public.profiles p on p.email = 'yitube4k@gmail.com'
on conflict (slug) do nothing;

-- attach categories to demo photographers
insert into public.photographer_categories (photographer_id, category_id)
select ph.id, c.id from public.photographers ph, public.categories c
where (ph.slug='rahul-photography' and c.slug in ('wedding','pre-wedding','event'))
   or (ph.slug='nadia-visuals' and c.slug in ('fashion','portrait','pre-wedding'))
   or (ph.slug='sabbir-lens' and c.slug in ('travel','pre-wedding','portrait'))
   or (ph.slug='mithila-studio' and c.slug in ('birthday','event','portrait'))
   or (ph.slug='tanvir-frames' and c.slug in ('wedding','corporate','videography'))
   or (ph.slug='farhan_clicks' and c.slug in ('product','corporate'))
on conflict do nothing;

-- demo packages
insert into public.packages (photographer_id, name, description, price, duration_hours, features)
select ph.id, v.name, v.descr, v.price, v.hrs, v.features::jsonb
from (values
  ('rahul-photography','Silver Package','৮ ঘণ্টা কভারেজ + ২০০ এডিটেড ছবি + অনলাইন গ্যালারি',8000,8,'["২০০+ edited photos","Online gallery","USB drive"]'),
  ('rahul-photography','Gold Package','ফুল ডে কভারেজ + ৪০০ ছবি + Same-day slideshow + ২ জন ফটোগ্রাফার',15000,12,'["৪০০+ edited photos","২ জন ফটোগ্রাফার","Same-day slideshow","Pre-wedding add-on"]'),
  ('nadia-visuals','Fashion Mini','২ ঘণ্টা shoot + ১৫ রিটাচ করা ছবি + স্টুডিও',12000,2,'["১৫ retouched photos","Studio included","Outfit change x2"]'),
  ('nadia-visuals','Bridal Full','শাড়ি-গয়না shoot + makeup artist + ৫০ ছবি',25000,6,'["Makeup artist","৫০ photos","Location of choice"]'),
  ('sabbir-lens','Hill Track Pre-Wedding','চট্টগ্রামের পাহাড়ে ১ দিনের pre-wedding + ১০০ ছবি + drone',18000,10,'["Drone shots","১০০ photos","Travel support"]'),
  ('mithila-studio','Birthday Basic','৩ ঘণ্টা জন্মদিন কভারেজ + ৮০ ছবি',4000,3,'["৮০ photos","Same-day 10 previews","Frame gift"]'),
  ('tanvir-frames','Tea Garden Wedding','সিলেট চা বাগানে destination wedding + ৩০০ ছবি + video teaser',20000,10,'["৩০০ photos","Video teaser","Drone"]'),
  ('farhan_clicks','Product Shoot 10','১০টি প্রোডাক্টের স্টুডিও shoot + white background + retouch',3500,4,'["১০ products","White background","Commercial license"]')
) as v(slug,name,descr,price,hrs,features)
join public.photographers ph on ph.slug = v.slug
where not exists (select 1 from public.packages pk where pk.photographer_id = ph.id and pk.name = v.name);

-- demo portfolio images
insert into public.portfolio_images (photographer_id, url, caption, sort_order)
select ph.id, 'https://images.unsplash.com/' || v.img || '?w=800&h=600&fit=crop', v.cap, v.ord
from (values
  ('rahul-photography','photo-1519741497674-611481863552','Wedding moment',1),
  ('rahul-photography','photo-1465495976277-4387d4b0b4c6','Bride entry',2),
  ('rahul-photography','photo-1511285560929-80b456fea0bc','Gay e holud',3),
  ('nadia-visuals','photo-1529626455594-4ff0802cfb7e','Fashion editorial',1),
  ('nadia-visuals','photo-1487412720507-e7ab37603c6f','Studio portrait',2),
  ('sabbir-lens','photo-1502920917128-1aa500764cbd','Hill track couple',1),
  ('sabbir-lens','photo-1476514525535-07fb3b4ae5f1','Travel shoot',2),
  ('mithila-studio','photo-1530103862676-de8c9debad1d','Birthday cake moment',1),
  ('tanvir-frames','photo-1583939003579-730e3918a45a','Tea garden wedding',1),
  ('farhan_clicks','photo-1554080353-a576cf803bda','Product flatlay',1)
) as v(slug,img,cap,ord)
join public.photographers ph on ph.slug = v.slug
where not exists (select 1 from public.portfolio_images pi where pi.photographer_id = ph.id);

-- demo reviews (need a completed booking chain; create demo customer-less reviews via admin pass is not allowed by RLS for anon)
-- Reviews will be added by real users after completed bookings. Skipping fake reviews to honor spec.

-- ═══════════ DONE ═══════════
