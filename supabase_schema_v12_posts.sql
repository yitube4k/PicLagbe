-- ═══════════════════════════════════════════════════════════
-- PICLAGBE V12 — photographer POSTS (task details, price, photo, video)
--                  + admin approval + public likes
-- নিয়ম: মিডিয়া শুধু Cloudinary URL (Supabase-এ কোনো ফাইল নয়)
-- ═══════════════════════════════════════════════════════════

-- 1) POSTS — ফটোগ্রাফারের কাজের পোস্ট (image-post ফরম্যাট)
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  price numeric CHECK (price IS NULL OR price >= 0),
  media jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{url, type:'image'|'video'}]
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_note text,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_posts_ph ON public.posts(photographer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status, created_at DESC);

-- সবাই অ্যাপ্রুভড পোস্ট দেখবে; নিজের পোস্ট ফটোগ্রাফার সব স্টেটাস দেখবে
DROP POLICY IF EXISTS "posts_read" ON public.posts;
CREATE POLICY "posts_read" ON public.posts FOR SELECT USING (
  status = 'approved'
  OR EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = posts.photographer_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
);

-- ফটোগ্রাফার নিজের পোস্ট বানাতে পারবে (pending দিয়ে শুরু)
DROP POLICY IF EXISTS "posts_insert_own" ON public.posts;
CREATE POLICY "posts_insert_own" ON public.posts FOR INSERT WITH CHECK (
  status = 'pending'
  AND EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = posts.photographer_id AND p.user_id = auth.uid())
);

-- ফটোগ্রাফার নিজের pending/rejected পোস্ট এডিট করতে পারবে (অ্যাপ্রুভডটা এডিট করলে আবার pending হবে অ্যাডমিন চাইলে; এখানে শুধু pending/rejected অনুমতি)
DROP POLICY IF EXISTS "posts_update_own" ON public.posts;
CREATE POLICY "posts_update_own" ON public.posts FOR UPDATE USING (
  (
    status IN ('pending','rejected')
    AND EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = posts.photographer_id AND p.user_id = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
);

DROP POLICY IF EXISTS "posts_delete_own" ON public.posts;
CREATE POLICY "posts_delete_own" ON public.posts FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = posts.photographer_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
);

-- 2) POST LIKES — লগইন করা user-এর লাইক (একজন এক পোস্টে একবার)
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_read" ON public.post_likes;
CREATE POLICY "likes_read" ON public.post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "likes_insert_own" ON public.post_likes;
CREATE POLICY "likes_insert_own" ON public.post_likes FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "likes_delete_own" ON public.post_likes;
CREATE POLICY "likes_delete_own" ON public.post_likes FOR DELETE USING (user_id = auth.uid());

-- লাইক কাউন্টার ট্রিগার
CREATE OR REPLACE FUNCTION public.bump_post_like_count() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS on_like_bump ON public.post_likes;
CREATE TRIGGER on_like_bump
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_like_count();

-- 3) updated_at অটো-টাচ
CREATE OR REPLACE FUNCTION public.touch_posts_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_posts_touch ON public.posts;
CREATE TRIGGER on_posts_touch
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_posts_updated_at();

-- 4) FULL ADMIN CONTROL — categories লেখা + reviews মডারেশন
DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "reviews_admin_delete" ON public.reviews;
CREATE POLICY "reviews_admin_delete" ON public.reviews FOR DELETE USING (public.is_admin());
