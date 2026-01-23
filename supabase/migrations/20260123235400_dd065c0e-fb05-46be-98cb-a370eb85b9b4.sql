-- Fix: Change top_dropshippers_public view from SECURITY DEFINER to SECURITY INVOKER
-- This ensures RLS policies of the querying user are enforced, not the view creator

DROP VIEW IF EXISTS public.top_dropshippers_public;

CREATE VIEW public.top_dropshippers_public 
WITH (security_invoker = true) AS
SELECT 
    id,
    display_name,
    rank_position,
    orders_count,
    earnings_amount,
    badge_title,
    is_active,
    created_at,
    updated_at
FROM top_dropshippers
WHERE is_active = true;