-- ═══ V24 — photographer gallery (photo+video) admin management ═══
-- portfolio_images is the data source of the public profile gallery.
-- The owning photographer could already write (portfolio_write).
-- Admin needs the same bypass that packages got in V21.

DROP POLICY IF EXISTS "portfolio_admin_write" ON public.portfolio_images;
CREATE POLICY "portfolio_admin_write" ON public.portfolio_images FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
