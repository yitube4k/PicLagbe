-- ═══════════════════════════════════════════════════════════════════
-- PicLagbe V20 — Admin Notifications (dedicated section, realtime)
-- Adapted from Gemini 4 Argon spec to REAL schema:
--   bookings.customer_id (not user_id) · posts.photographer_id/title
--   kyc_submissions.photographer_id · role_requests has no requested_role
--   messages.body (not content) · reviews.customer_id
--   admin routes: /admin/booking /admin/post /admin/kyc /admin/photographer
--                 /admin/requests /admin/user /admin/review /admin/chat
-- ═══════════════════════════════════════════════════════════════════

-- 1. TABLE + INDEXES
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in (
    'new_booking','post_pending','kyc_submitted','photographer_signup',
    'role_request','user_signup','new_review','new_chat','admin_action'
  )),
  title text not null,
  body text not null default '',
  target_section text not null,
  entity_id text,
  actor_id uuid,
  is_read boolean not null default false,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_notif_unread_created
  on public.admin_notifications (is_read, created_at desc);
create index if not exists idx_admin_notif_type_created
  on public.admin_notifications (type, created_at desc);

alter publication supabase_realtime add table public.admin_notifications;

-- 2. RLS
alter table public.admin_notifications enable row level security;

create or replace function public.is_admin_user()
returns boolean language sql security definer stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

drop policy if exists "admin_notif_select" on public.admin_notifications;
create policy "admin_notif_select" on public.admin_notifications
  for select to authenticated
  using (public.is_admin_user());

drop policy if exists "admin_notif_update" on public.admin_notifications;
create policy "admin_notif_update" on public.admin_notifications
  for update to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "admin_notif_insert" on public.admin_notifications;
create policy "admin_notif_insert" on public.admin_notifications
  for insert to authenticated
  with check (public.is_admin_user());

drop policy if exists "admin_notif_delete" on public.admin_notifications;
create policy "admin_notif_delete" on public.admin_notifications
  for delete to authenticated
  using (public.is_admin_user());

-- 3. CENTRAL EMIT (security definer — triggers bypass RLS)
create or replace function public.emit_admin_notification(
  p_type text, p_title text, p_body text, p_target_section text,
  p_entity_id text default null, p_actor_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer
as $$
begin
  insert into public.admin_notifications
    (type, title, body, target_section, entity_id, actor_id, metadata)
  values
    (p_type, p_title, p_body, p_target_section, p_entity_id, p_actor_id, p_metadata);
end;
$$;

-- (a) new booking → /admin/booking
create or replace function public.trg_fn_notif_new_booking()
returns trigger language plpgsql security definer as $$
begin
  perform public.emit_admin_notification(
    'new_booking',
    'নতুন বুকিং এসেছে',
    coalesce(NEW.notes, 'একটি নতুন বুকিং অনুমোদনের অপেক্ষায় আছে।'),
    '/admin/booking',
    NEW.id::text,
    NEW.customer_id,
    jsonb_build_object('status', NEW.status, 'event_date', NEW.event_date)
  );
  return new;
end;
$$;
drop trigger if exists trg_notif_new_booking on public.bookings;
create trigger trg_notif_new_booking
  after insert on public.bookings
  for each row execute function public.trg_fn_notif_new_booking();

-- (b) new pending post → /admin/post
create or replace function public.trg_fn_notif_post_pending()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'pending' then
    perform public.emit_admin_notification(
      'post_pending',
      'নতুন পোস্ট অনুমোদনের অপেক্ষায়',
      coalesce(new.title, 'একটি নতুন পোস্ট জমা পড়েছে।'),
      '/admin/post',
      new.id::text,
      null,
      jsonb_build_object('photographer_id', new.photographer_id)
    );
  end if;
  return new;
end;
$$;
drop trigger if exists trg_notif_post_pending on public.posts;
create trigger trg_notif_post_pending
  after insert on public.posts
  for each row execute function public.trg_fn_notif_post_pending();

-- (c) new KYC submission → /admin/kyc
create or replace function public.trg_fn_notif_kyc()
returns trigger language plpgsql security definer as $$
begin
  perform public.emit_admin_notification(
    'kyc_submitted',
    'নতুন KYC জমা পড়েছে',
    coalesce(new.phone, 'একজন ফটোগ্রাফার KYC ডকুমেন্ট জমা দিয়েছেন।'),
    '/admin/kyc',
    new.id::text,
    null,
    jsonb_build_object('photographer_id', new.photographer_id, 'status', new.status)
  );
  return new;
end;
$$;
drop trigger if exists trg_notif_kyc on public.kyc_submissions;
create trigger trg_notif_kyc
  after insert on public.kyc_submissions
  for each row when (new.status = 'pending')
  execute function public.trg_fn_notif_kyc();

-- (d) new user signup → /admin/user
create or replace function public.trg_fn_notif_user_signup()
returns trigger language plpgsql security definer as $$
begin
  perform public.emit_admin_notification(
    'user_signup',
    'নতুন ইউজার রেজিস্ট্রেশন',
    coalesce(new.full_name, 'নতুন ইউজার') || ' PicLagbe-তে যোগ দিয়েছেন।',
    '/admin/user',
    new.id::text,
    new.id,
    jsonb_build_object('role', new.role, 'email', new.email)
  );
  return new;
end;
$$;
drop trigger if exists trg_notif_user_signup on public.profiles;
create trigger trg_notif_user_signup
  after insert on public.profiles
  for each row execute function public.trg_fn_notif_user_signup();

-- (e) new photographer record → /admin/photographer
create or replace function public.trg_fn_notif_photographer()
returns trigger language plpgsql security definer as $$
begin
  perform public.emit_admin_notification(
    'photographer_signup',
    'নতুন ফটোগ্রাফার প্রোফাইল',
    coalesce(new.display_name, 'নতুন ফটোগ্রাফার') || ' ফটোগ্রাফার হিসেবে যুক্ত হয়েছেন।',
    '/admin/photographer',
    new.id::text,
    new.user_id,
    jsonb_build_object('profile_status', new.profile_status)
  );
  return new;
end;
$$;
drop trigger if exists trg_notif_photographer on public.photographers;
create trigger trg_notif_photographer
  after insert on public.photographers
  for each row execute function public.trg_fn_notif_photographer();

-- (f) new role request → /admin/requests
create or replace function public.trg_fn_notif_role_request()
returns trigger language plpgsql security definer as $$
begin
  perform public.emit_admin_notification(
    'role_request',
    'ফটোগ্রাফার হওয়ার আবেদন',
    coalesce(new.display_name, 'একজন ইউজার') || ' ফটোগ্রাফার রোলের জন্য আবেদন করেছেন।',
    '/admin/requests',
    new.id::text,
    new.user_id,
    jsonb_build_object('status', new.status, 'phone', new.phone)
  );
  return new;
end;
$$;
drop trigger if exists trg_notif_role_request on public.role_requests;
create trigger trg_notif_role_request
  after insert on public.role_requests
  for each row execute function public.trg_fn_notif_role_request();

-- (g) new review → /admin/review
create or replace function public.trg_fn_notif_new_review()
returns trigger language plpgsql security definer as $$
begin
  perform public.emit_admin_notification(
    'new_review',
    'নতুন রিভিউ (' || new.rating::text || '★)',
    coalesce(left(new.comment, 80), 'নতুন রেটিং যুক্ত হয়েছে।'),
    '/admin/review',
    new.id::text,
    new.customer_id,
    jsonb_build_object('rating', new.rating, 'photographer_id', new.photographer_id)
  );
  return new;
end;
$$;
drop trigger if exists trg_notif_new_review on public.reviews;
create trigger trg_notif_new_review
  after insert on public.reviews
  for each row execute function public.trg_fn_notif_new_review();

-- (h) new chat message → /admin/chat
create or replace function public.trg_fn_notif_new_chat()
returns trigger language plpgsql security definer as $$
begin
  perform public.emit_admin_notification(
    'new_chat',
    'নতুন চ্যাট মেসেজ',
    coalesce(left(new.body, 80), 'একটি নতুন মেসেজ এসেছে।'),
    '/admin/chat',
    new.conversation_id::text,
    new.sender_id,
    jsonb_build_object('message_id', new.id::text)
  );
  return new;
end;
$$;
drop trigger if exists trg_notif_new_chat on public.messages;
create trigger trg_notif_new_chat
  after insert on public.messages
  for each row execute function public.trg_fn_notif_new_chat();
