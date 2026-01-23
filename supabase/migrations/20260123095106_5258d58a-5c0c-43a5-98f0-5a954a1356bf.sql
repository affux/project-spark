-- The top_dropshippers_public view is intentionally a public view that hides sensitive data
-- This is expected behavior - the view only exposes public-safe columns
-- Adding a comment to document this security decision
COMMENT ON VIEW public.top_dropshippers_public IS 'Public view of top dropshippers leaderboard. Intentionally accessible to all users. Contains only public-safe data (display_name, rank, earnings, orders count). No sensitive user information exposed.';