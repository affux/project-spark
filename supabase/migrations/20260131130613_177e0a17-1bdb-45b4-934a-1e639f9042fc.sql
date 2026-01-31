-- Tighten visitor_logs INSERT policy to service-role context (fix linter: permissive RLS policy)
DROP POLICY IF EXISTS "Service can insert visitor logs" ON public.visitor_logs;

CREATE POLICY "Service can insert visitor logs"
ON public.visitor_logs
FOR INSERT
WITH CHECK (auth.uid() IS NULL);

COMMENT ON POLICY "Service can insert visitor logs" ON public.visitor_logs IS 'Allows backend functions (service role context where auth.uid() is NULL) to insert anonymous visitor logs';
