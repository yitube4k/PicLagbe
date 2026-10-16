-- ═══════════════════════════════════════════════════════════════
-- PicLagbe V16 — অডিট লগ ও সেভ করা রিপোর্ট
-- Supabase SQL Editor-এ পুরো ফাইলটি রান করুন (আগের স্কিমার পরে, নিরাপদে বারবার চালানো যায়)
-- ═══════════════════════════════════════════════════════════════

-- ১) AUDIT LOGS — অ্যাডমিনের প্রতিটি কাজের রেকর্ড
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id) on delete set null,
  actor_email text,
  action      text not null,              -- create/update/delete/approve/reject/verify/role_change/...
  entity      text not null,              -- user/photographer/post/booking/review/blog/category/kyc/role_request
  entity_id   text,
  title       text,                       -- মানুষের পড়া সংক্ষিপ্ত নাম ("রাকিব ফটোগ্রাফার")
  details     jsonb default '{}'::jsonb,  -- {note, before, after, meta}
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx  on public.audit_logs (entity, action);
create index if not exists audit_logs_actor_idx   on public.audit_logs (actor_id);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_read_admin" on public.audit_logs;
create policy "audit_logs_read_admin"
  on public.audit_logs for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "audit_logs_insert_auth" on public.audit_logs;
create policy "audit_logs_insert_auth"
  on public.audit_logs for insert
  with check (auth.uid() is not null);

-- লগ কেউ বদলাতে/মুছতে পারবে না (শুধু যোগ ও পড়া) — ইমিউটেবল অডিট ট্রেইল
-- (আপডেট/ডিলিট পলিসি ইচ্ছাকৃতভাবে নেই)

-- ২) AUDIT REPORTS — সেভ করা রিপোর্ট স্ন্যাপশট
create table if not exists public.audit_reports (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id) on delete set null,
  actor_email text,
  title       text not null,
  period_from timestamptz,
  period_to   timestamptz,
  filters     jsonb default '{}'::jsonb,   -- কোন ফিল্টারে বানানো হয়েছিল
  entries     jsonb default '[]'::jsonb,   -- লগ এন্ট্রির স্ন্যাপশট (রিপোর্ট স্থায়ী)
  entry_count integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.audit_reports enable row level security;

drop policy if exists "audit_reports_all_admin" on public.audit_reports;
create policy "audit_reports_all_admin"
  on public.audit_reports for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ৩) (ঐচ্ছিক) পুরনো রিপোর্ট ৬ মাস পর অটো-পরিষ্কার — চাইলে নিচের কমেন্ট খুলুন
-- select cron.schedule('cleanup-old-audit-reports', '0 4 * * *',
--   $$delete from public.audit_reports where created_at < now() - interval '180 days'$$);
