-- ═══ V17: site_settings — admin-controlled feature switches (public read) ═══
create table if not exists public.site_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

-- সবাই পড়তে পারবে (public site features)
drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read"
  on public.site_settings for select
  using (true);

-- শুধু admin বদলাতে পারবে
drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write"
  on public.site_settings for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "site_settings_admin_update" on public.site_settings;
create policy "site_settings_admin_update"
  on public.site_settings for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ডিফল্ট: স্পট পেজের মিনি ম্যাপ BAND (ব্লগ ফ্লো থেকে hide — admin চাইলে চালু করবে)
insert into public.site_settings (key, value)
values ('spot_minimap', 'off')
on conflict (key) do nothing;
