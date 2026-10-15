-- ═══════════════════════════════════════════════════════════
-- PICLAGBE V11 — profile edit + whatsapp, schedule calendar (note+timestamp),
--                photographer migration (role_requests), role-escalation fix
-- ═══════════════════════════════════════════════════════════

-- 1) PROFILES: whatsapp + bio (profile edit ফর্মের জন্য)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

-- 1b) SECURITY: সাধারণ user নিজের role বদলাতে পারবে না (admin ছাড়া)
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_profile_role_protect ON public.profiles;
CREATE TRIGGER on_profile_role_protect
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- 2) SCHEDULE SLOTS — ফটোগ্রাফারের সময়সূচি ক্যালেন্ডার (তারিখ + টাইম + নোট)
CREATE TABLE IF NOT EXISTS public.schedule_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  start_time text NOT NULL DEFAULT '09:00',
  end_time text NOT NULL DEFAULT '18:00',
  note text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','booked','unavailable')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_schedule_slots_ph ON public.schedule_slots(photographer_id, slot_date);

DROP POLICY IF EXISTS "schedule_read_all" ON public.schedule_slots;
CREATE POLICY "schedule_read_all" ON public.schedule_slots FOR SELECT USING (true);

DROP POLICY IF EXISTS "schedule_insert_own" ON public.schedule_slots;
CREATE POLICY "schedule_insert_own" ON public.schedule_slots FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = schedule_slots.photographer_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "schedule_update_own" ON public.schedule_slots;
CREATE POLICY "schedule_update_own" ON public.schedule_slots FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = schedule_slots.photographer_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "schedule_delete_own" ON public.schedule_slots;
CREATE POLICY "schedule_delete_own" ON public.schedule_slots FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = schedule_slots.photographer_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "schedule_admin_all" ON public.schedule_slots;
CREATE POLICY "schedule_admin_all" ON public.schedule_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
);

-- 3) ROLE REQUESTS — user → ফটোগ্রাফার migration আবেদন
CREATE TABLE IF NOT EXISTS public.role_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  phone text,
  whatsapp text,
  city text,
  experience_years int DEFAULT 0,
  equipment text,
  portfolio_url text,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_role_requests_status ON public.role_requests(status, created_at DESC);

DROP POLICY IF EXISTS "rr_select_own" ON public.role_requests;
CREATE POLICY "rr_select_own" ON public.role_requests FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
);

DROP POLICY IF EXISTS "rr_insert_own" ON public.role_requests;
CREATE POLICY "rr_insert_own" ON public.role_requests FOR INSERT WITH CHECK (
  user_id = auth.uid() AND status = 'pending'
);

DROP POLICY IF EXISTS "rr_admin_update" ON public.role_requests;
CREATE POLICY "rr_admin_update" ON public.role_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
);

-- 4) APPROVE / REJECT RPC (security definer — admin RLS bypass ছাড়াই নিরাপদে)
CREATE OR REPLACE FUNCTION public.approve_role_request(req_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req public.role_requests%ROWTYPE;
  base text;
  vslug text;
  n int := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO req FROM public.role_requests WHERE id = req_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND_OR_HANDLED';
  END IF;

  base := lower(regexp_replace(req.display_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base := btrim(base, '-');
  IF base IS NULL OR base = '' THEN
    base := 'photographer-' || substr(replace(req.id::text, '-', ''), 1, 6);
  END IF;
  vslug := base;
  WHILE EXISTS (SELECT 1 FROM public.photographers WHERE slug = vslug) LOOP
    n := n + 1;
    vslug := base || '-' || n;
  END LOOP;

  INSERT INTO public.photographers (user_id, slug, display_name, city, experience_years, equipment, phone, profile_status, verified, languages)
  VALUES (req.user_id, vslug, req.display_name, req.city, COALESCE(req.experience_years, 0), req.equipment, req.phone, 'approved', false, 'বাংলা, English');

  UPDATE public.profiles SET role = 'photographer' WHERE id = req.user_id;
  UPDATE public.role_requests SET status = 'approved', reviewed_at = now() WHERE id = req_id;

  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (req.user_id, 'role_request', '🎉 আপনার ফটোগ্রাফার আবেদন অনুমোদিত হয়েছে! স্টুডিও ড্যাশবোর্ড থেকে প্রোফাইল সাজান।', '/studio');
END $$;

CREATE OR REPLACE FUNCTION public.reject_role_request(req_id uuid, note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  UPDATE public.role_requests
  SET status = 'rejected', review_note = NULLIF(note, ''), reviewed_at = now()
  WHERE id = req_id AND status = 'pending';
END $$;

-- 5) Realtime (schedule slots — ভবিষ্যতে লাইভ আপডেটের জন্য)
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_slots;
