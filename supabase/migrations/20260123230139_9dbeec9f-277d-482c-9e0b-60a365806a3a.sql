-- Create table for user-specific payment method settings
CREATE TABLE public.user_payment_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  enabled_methods JSONB NOT NULL DEFAULT '{"upi": true, "wallet": true, "bank_transfer": true, "usd_wallet": true}'::jsonb,
  custom_upi_id TEXT,
  custom_upi_qr_url TEXT,
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_payment_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage all user payment settings
CREATE POLICY "Admins can manage user payment settings"
ON public.user_payment_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own payment settings
CREATE POLICY "Users can view their own payment settings"
ON public.user_payment_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_payment_settings_updated_at
BEFORE UPDATE ON public.user_payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();