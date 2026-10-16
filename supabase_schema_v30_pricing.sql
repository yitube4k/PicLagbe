-- ═══════════════════════════════════════════════════════════
-- PICLAGBE V30 — package pricing units (per hour / per photo /
--                 total package) + included photo count
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS pricing_unit text NOT NULL DEFAULT 'event',
  ADD COLUMN IF NOT EXISTS photo_count integer;

-- constrain values
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'packages_pricing_unit_ck') THEN
    ALTER TABLE public.packages
      ADD CONSTRAINT packages_pricing_unit_ck CHECK (pricing_unit IN ('event','hour','photo'));
  END IF;
END $$;

-- sane bounds: photo_count 1..500 when set
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'packages_photo_count_ck') THEN
    ALTER TABLE public.packages
      ADD CONSTRAINT packages_photo_count_ck CHECK (photo_count IS NULL OR (photo_count >= 1 AND photo_count <= 500));
  END IF;
END $$;

COMMENT ON COLUMN public.packages.pricing_unit IS 'event = মোট প্যাকেজ দাম; hour = প্রতি ঘণ্টা দাম; photo = প্রতি ছবি দাম';
COMMENT ON COLUMN public.packages.photo_count IS 'প্যাকেজে অন্তর্ভুক্ত ছবির সংখ্যা (event/hour প্যাকেজে ঐচ্ছিক)';
