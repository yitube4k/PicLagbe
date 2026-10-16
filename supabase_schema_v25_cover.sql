-- ═══════════════════════════════════════════════════════════
-- PicLagbe V25 — Facebook-style cover photo for customer profiles
-- profiles.cover_url = কভার ফটো (Cloudinary URL)
-- ফটোগ্রাফারদের জন্য photographers.cover_photo_url আগে থেকেই আছে
-- ═══════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url text;

-- কভার কলাম যাচাই
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'cover_url';
