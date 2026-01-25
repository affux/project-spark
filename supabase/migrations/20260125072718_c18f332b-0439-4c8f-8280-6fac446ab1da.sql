-- Create visitor_logs table for anonymous visitor tracking
CREATE TABLE public.visitor_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address text NOT NULL,
  action_type text NOT NULL,
  page_url text,
  referrer text,
  user_agent text,
  country text,
  region text,
  city text,
  link_clicked text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for performance
CREATE INDEX idx_visitor_logs_created_at ON public.visitor_logs(created_at DESC);
CREATE INDEX idx_visitor_logs_action_type ON public.visitor_logs(action_type);
CREATE INDEX idx_visitor_logs_ip_address ON public.visitor_logs(ip_address);

-- Enable RLS
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all visitor logs
CREATE POLICY "Admins can view all visitor logs" 
ON public.visitor_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow inserts from anyone (for anonymous tracking via edge function)
-- This will be controlled by the edge function with service role
CREATE POLICY "Service can insert visitor logs" 
ON public.visitor_logs 
FOR INSERT 
WITH CHECK (true);