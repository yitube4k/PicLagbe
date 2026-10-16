-- ═══════════════════════════════════════════════════════════
-- PICLAGBE V21 — package reference media + caps, blog travel_data,
--                 photographer details, booking snapshots
-- ═══════════════════════════════════════════════════════════

-- 1) PACKAGES: reference media [{url,type:'image'|'video',thumb_url?}], sort, popular
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false;

-- hard cap: max 8 media items per package
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'packages_media_cap') THEN
    ALTER TABLE public.packages
      ADD CONSTRAINT packages_media_cap CHECK (jsonb_array_length(media) <= 8);
  END IF;
END $$;

-- MAX 6 PACKAGES per photographer (BEFORE INSERT)
CREATE OR REPLACE FUNCTION public.enforce_max_6_packages() RETURNS trigger AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.packages WHERE photographer_id = NEW.photographer_id) >= 6 THEN
    RAISE EXCEPTION 'MAX_6_PACKAGES';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- admin can manage every photographer's packages (owner already could)
DROP POLICY IF EXISTS "packages_admin_write" ON public.packages;
CREATE POLICY "packages_admin_write" ON public.packages FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS trg_max_6_packages ON public.packages;
CREATE TRIGGER trg_max_6_packages
  BEFORE INSERT ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_6_packages();

-- single popular package per photographer (BEFORE INSERT OR UPDATE)
CREATE OR REPLACE FUNCTION public.enforce_single_popular() RETURNS trigger AS $$
BEGIN
  IF NEW.is_popular = true THEN
    UPDATE public.packages
       SET is_popular = false
     WHERE photographer_id = NEW.photographer_id
       AND id <> NEW.id
       AND is_popular = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_single_popular ON public.packages;
CREATE TRIGGER trg_single_popular
  BEFORE INSERT OR UPDATE OF is_popular ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_popular();

-- 2) BLOG: structured travel guide data ( Cox's Bazar guides )
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS travel_data jsonb;

-- 3) PHOTOGRAPHERS: detail density bundle
ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 4) BOOKINGS: immutability + timeline
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS package_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS shoot_spot text,
  ADD COLUMN IF NOT EXISTS shoot_time_slot text,
  ADD COLUMN IF NOT EXISTS status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;
