-- =============================================
-- DROPSHIP PLATFORM - COMPLETE DATABASE SCHEMA
-- Generated: 2026-01-22
-- Version: 3.1.0 (Security Hardened + Schema Sync)
-- =============================================
-- This file contains the complete database schema for the DropShip platform.
-- It can be imported directly into a new Supabase project or self-hosted instance.
-- 
-- CHANGELOG v3.1.0:
-- - Added read_at column to chat_messages table
-- - Fixed agent_chat_presence table structure (agent_id, viewing_user_id)
-- - Added work_types and work_type_categories tables
-- - Added top_dropshippers_public view
-- - All 49 tables with comprehensive RLS policies
-- - Complete functions, triggers, and indexes
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUM DEFINITIONS
-- =============================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.kyc_status AS ENUM ('not_submitted', 'submitted', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending_payment', 'paid_by_user', 'processing', 'completed', 'cancelled', 'postpaid_pending');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.user_level AS ENUM ('bronze', 'silver', 'gold');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('pending', 'approved', 'disabled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.chat_session_status AS ENUM ('active', 'user_left', 'waiting_for_support', 'closed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.chat_assignment_strategy AS ENUM ('least_active', 'round_robin', 'priority_based');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABLE DEFINITIONS
-- =============================================

-- Profiles table (user information)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  storefront_slug TEXT UNIQUE,
  storefront_name TEXT,
  storefront_banner TEXT,
  wallet_balance NUMERIC NOT NULL DEFAULT 0.00,
  commission_override NUMERIC,
  user_level public.user_level NOT NULL DEFAULT 'bronze',
  user_status public.user_status NOT NULL DEFAULT 'pending',
  is_active BOOLEAN NOT NULL DEFAULT true,
  saved_payment_details JSONB DEFAULT '{}'::jsonb,
  profile_image_url TEXT,
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_ip_address TEXT,
  email_2fa_enabled BOOLEAN DEFAULT false,
  postpaid_enabled BOOLEAN NOT NULL DEFAULT false,
  postpaid_credit_limit NUMERIC NOT NULL DEFAULT 0,
  postpaid_used NUMERIC NOT NULL DEFAULT 0,
  postpaid_due_cycle INTEGER,
  allow_payout_with_dues BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  theme TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indian names table (for random name generation)
CREATE TABLE IF NOT EXISTS public.indian_names (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  sku TEXT NOT NULL UNIQUE,
  image_url TEXT,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Product media table
CREATE TABLE IF NOT EXISTS public.product_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Storefront products table
CREATE TABLE IF NOT EXISTS public.storefront_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  selling_price NUMERIC NOT NULL,
  custom_description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- Product reviews table
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storefront_product_id UUID REFERENCES public.storefront_products(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  storefront_product_id UUID NOT NULL REFERENCES public.storefront_products(id),
  dropshipper_user_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  selling_price NUMERIC NOT NULL,
  base_price NUMERIC NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending_payment',
  payment_type TEXT NOT NULL DEFAULT 'prepaid',
  payment_link TEXT,
  payment_link_clicked_at TIMESTAMP WITH TIME ZONE,
  payment_link_updated_at TIMESTAMP WITH TIME ZONE,
  payment_link_updated_by UUID,
  payment_proof_url TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  postpaid_paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order status history table
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  changed_by_type TEXT NOT NULL DEFAULT 'system',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order customer names table
CREATE TABLE IF NOT EXISTS public.order_customer_names (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  indian_name_id UUID NOT NULL REFERENCES public.indian_names(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- KYC submissions table
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  aadhaar_number TEXT NOT NULL,
  pan_number TEXT NOT NULL,
  mobile_number TEXT,
  aadhaar_front_url TEXT NOT NULL,
  aadhaar_back_url TEXT NOT NULL,
  pan_document_url TEXT NOT NULL,
  face_image_url TEXT,
  bank_statement_url TEXT,
  status public.kyc_status NOT NULL DEFAULT 'submitted',
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  order_id UUID REFERENCES public.orders(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT wallet_transactions_type_check CHECK (type = ANY (ARRAY['credit'::text, 'debit'::text, 'order_value'::text, 'order_commission'::text, 'payout'::text, 'payout_approved'::text, 'admin_credit'::text, 'admin_debit'::text, 'reversal'::text, 'payment'::text, 'refund'::text]))
);

-- Postpaid transactions table
CREATE TABLE IF NOT EXISTS public.postpaid_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  balance_before NUMERIC NOT NULL DEFAULT 0,
  balance_after NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  admin_id UUID,
  admin_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payout requests table
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  payment_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payout status history table
CREATE TABLE IF NOT EXISTS public.payout_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payout_id UUID NOT NULL REFERENCES public.payout_requests(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat ratings table
CREATE TABLE IF NOT EXISTS public.chat_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat customer names table
CREATE TABLE IF NOT EXISTS public.chat_customer_names (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  indian_name_id UUID NOT NULL REFERENCES public.indian_names(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status public.chat_session_status NOT NULL DEFAULT 'active',
  assigned_agent_id UUID,
  previous_agent_id UUID,
  reassignment_count INTEGER NOT NULL DEFAULT 0,
  last_user_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_left_at TIMESTAMP WITH TIME ZONE,
  user_messages_cleared_at TIMESTAMP WITH TIME ZONE,
  grace_period_expires_at TIMESTAMP WITH TIME ZONE,
  close_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat reassignment logs table
CREATE TABLE IF NOT EXISTS public.chat_reassignment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_session_id UUID NOT NULL REFERENCES public.chat_sessions(id),
  user_id UUID NOT NULL,
  previous_agent_id UUID,
  new_agent_id UUID,
  trigger_reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agent chat presence table
CREATE TABLE IF NOT EXISTS public.agent_chat_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  viewing_user_id UUID NOT NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order chat messages table
CREATE TABLE IF NOT EXISTS public.order_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_user_id UUID,
  admin_id UUID,
  sender_type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- If this schema is applied on an older database, ensure newer columns exist
-- (CREATE TABLE IF NOT EXISTS will not add missing columns)
ALTER TABLE public.order_chat_messages
  ADD COLUMN IF NOT EXISTS sender_user_id UUID,
  ADD COLUMN IF NOT EXISTS admin_id UUID;

-- Order chat quick replies table
CREATE TABLE IF NOT EXISTS public.order_chat_quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order chat audit logs table
CREATE TABLE IF NOT EXISTS public.order_chat_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  message_id UUID REFERENCES public.order_chat_messages(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Backwards-compatible column add (for older installs)
ALTER TABLE public.order_chat_audit_logs
  ADD COLUMN IF NOT EXISTS admin_id UUID;

-- Platform settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  user_id UUID,
  admin_id UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Backwards-compatible column add (for older installs)
-- (CREATE TABLE IF NOT EXISTS will not add missing columns)
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS admin_id UUID;

-- IP logs table
CREATE TABLE IF NOT EXISTS public.ip_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ip_address TEXT NOT NULL,
  action_type TEXT NOT NULL,
  country TEXT,
  region TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Force logout events table
CREATE TABLE IF NOT EXISTS public.force_logout_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  triggered_by UUID,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- OTP verifications table
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mobile_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'kyc_mobile',
  attempts INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email MFA codes table
CREATE TABLE IF NOT EXISTS public.email_mfa_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  is_used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trusted devices table
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_token TEXT NOT NULL,
  device_name TEXT,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Support agent presence table
CREATE TABLE IF NOT EXISTS public.support_agent_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  active_chat_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crypto payments table
CREATE TABLE IF NOT EXISTS public.crypto_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  wallet_name TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  currency_symbol TEXT NOT NULL DEFAULT '$',
  amount NUMERIC NOT NULL,
  transaction_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_purpose TEXT DEFAULT 'order',
  admin_notes TEXT,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Video tutorial completions table
CREATE TABLE IF NOT EXISTS public.video_tutorial_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Proof of work table
CREATE TABLE IF NOT EXISTS public.proof_of_work (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  work_title TEXT NOT NULL,
  link_url TEXT NOT NULL,
  product_link TEXT,
  proof_images TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_remark TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Work types table
CREATE TABLE IF NOT EXISTS public.work_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Work type categories table
CREATE TABLE IF NOT EXISTS public.work_type_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Custom payment methods table
CREATE TABLE IF NOT EXISTS public.custom_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  method_type TEXT NOT NULL DEFAULT 'payment',
  icon_url TEXT,
  custom_message TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Dashboard messages table
CREATE TABLE IF NOT EXISTS public.dashboard_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'info',
  priority INTEGER NOT NULL DEFAULT 0,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_roles TEXT[] DEFAULT '{}'::text[],
  show_to_users BOOLEAN NOT NULL DEFAULT true,
  show_to_admins BOOLEAN NOT NULL DEFAULT true,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Dashboard message targets table
CREATE TABLE IF NOT EXISTS public.dashboard_message_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.dashboard_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Popup messages table
CREATE TABLE IF NOT EXISTS public.popup_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'info',
  priority INTEGER NOT NULL DEFAULT 0,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_roles TEXT[],
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  re_acknowledgment_mode TEXT NOT NULL DEFAULT 'once_only',
  re_ack_period_days INTEGER,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Popup message targets table
CREATE TABLE IF NOT EXISTS public.popup_message_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.popup_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Popup acknowledgments table
CREATE TABLE IF NOT EXISTS public.popup_acknowledgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.popup_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message_version INTEGER NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Top dropshippers table
CREATE TABLE IF NOT EXISTS public.top_dropshippers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(user_id),
  display_name TEXT NOT NULL,
  rank_position INTEGER NOT NULL,
  orders_count INTEGER,
  earnings_amount NUMERIC,
  badge_title TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_by_admin_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Top dropshippers public view (for leaderboard)
-- Drop view first to allow column changes
DROP VIEW IF EXISTS public.top_dropshippers_public;
CREATE VIEW public.top_dropshippers_public AS
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
FROM
  public.top_dropshippers
WHERE
  is_active = true;

-- User rank reference table
CREATE TABLE IF NOT EXISTS public.user_rank_reference (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(user_id),
  admin_defined_position INTEGER,
  updated_by_admin_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Login attempts table (for rate limiting)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  was_successful BOOLEAN NOT NULL DEFAULT false
);

-- =============================================
-- INDEX DEFINITIONS
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_storefront_slug ON public.profiles(storefront_slug);
CREATE INDEX IF NOT EXISTS idx_profiles_user_status ON public.profiles(user_status);
CREATE INDEX IF NOT EXISTS idx_profiles_postpaid_enabled ON public.profiles(postpaid_enabled);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_product_media_product_id ON public.product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_storefront_products_user_id ON public.storefront_products(user_id);
CREATE INDEX IF NOT EXISTS idx_storefront_products_product_id ON public.storefront_products(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_dropshipper_user_id ON public.orders(dropshipper_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_type ON public.orders(payment_type);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user_id ON public.kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_status ON public.kyc_submissions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_order_id ON public.wallet_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_postpaid_transactions_user_id ON public.postpaid_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_postpaid_transactions_order_id ON public.postpaid_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON public.payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_status_history_payout_id ON public.payout_status_history(payout_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON public.chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_reassignment_logs_session_id ON public.chat_reassignment_logs(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_order_chat_messages_order_id ON public.order_chat_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_logs_user_id ON public.ip_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_logs_created_at ON public.ip_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_mfa_codes_user_id ON public.email_mfa_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_support_agent_presence_user_id ON public.support_agent_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_user_id ON public.crypto_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_status ON public.crypto_payments(status);
CREATE INDEX IF NOT EXISTS idx_proof_of_work_user_id ON public.proof_of_work(user_id);
CREATE INDEX IF NOT EXISTS idx_proof_of_work_status ON public.proof_of_work(status);
CREATE INDEX IF NOT EXISTS idx_work_types_category ON public.work_types(category);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_custom_payment_methods_type ON public.custom_payment_methods(method_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_messages_enabled ON public.dashboard_messages(is_enabled);
CREATE INDEX IF NOT EXISTS idx_dashboard_message_targets_message_id ON public.dashboard_message_targets(message_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_message_targets_user_id ON public.dashboard_message_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_popup_messages_enabled ON public.popup_messages(is_enabled);
CREATE INDEX IF NOT EXISTS idx_popup_message_targets_message_id ON public.popup_message_targets(message_id);
CREATE INDEX IF NOT EXISTS idx_popup_message_targets_user_id ON public.popup_message_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_popup_acknowledgments_message_id ON public.popup_acknowledgments(message_id);
CREATE INDEX IF NOT EXISTS idx_popup_acknowledgments_user_id ON public.popup_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_top_dropshippers_rank ON public.top_dropshippers(rank_position);
CREATE INDEX IF NOT EXISTS idx_top_dropshippers_active ON public.top_dropshippers(is_active);
CREATE INDEX IF NOT EXISTS idx_user_rank_reference_user_id ON public.user_rank_reference(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON public.login_attempts(email, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON public.login_attempts(ip_address, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_chat_presence_admin_id ON public.agent_chat_presence(admin_id);
CREATE INDEX IF NOT EXISTS idx_agent_chat_presence_user_id ON public.agent_chat_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_video_tutorial_completions_user_id ON public.video_tutorial_completions(user_id);

-- =============================================
-- FUNCTION DEFINITIONS
-- =============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.order_number = 'ORD-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

-- Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auto_approve BOOLEAN;
  initial_status user_status;
BEGIN
  SELECT value::boolean INTO auto_approve 
  FROM public.platform_settings 
  WHERE key = 'auto_user_approval';
  
  IF auto_approve = true THEN
    initial_status := 'approved';
  ELSE
    initial_status := 'pending';
  END IF;

  INSERT INTO public.profiles (user_id, email, name, user_status, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    initial_status,
    true
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Get KYC status
CREATE OR REPLACE FUNCTION public.get_kyc_status(_user_id UUID)
RETURNS kyc_status
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT status FROM public.kyc_submissions WHERE user_id = _user_id),
    'not_submitted'::kyc_status
  )
$$;

-- Check if KYC is approved
CREATE OR REPLACE FUNCTION public.is_kyc_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kyc_submissions 
    WHERE user_id = _user_id 
    AND status = 'approved'
  )
$$;

-- Check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id 
    AND user_status = 'approved'
  )
$$;

-- Get user commission rate
CREATE OR REPLACE FUNCTION public.get_user_commission_rate(_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT commission_override FROM public.profiles WHERE user_id = _user_id),
    (SELECT value::numeric FROM public.platform_settings WHERE key = 'commission_rate'),
    100
  )
$$;

-- Get public storefront profile
CREATE OR REPLACE FUNCTION public.get_public_storefront_profile(_slug TEXT)
RETURNS TABLE(user_id UUID, storefront_name TEXT, storefront_slug TEXT, storefront_banner TEXT, display_name TEXT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.user_id,
    p.storefront_name,
    p.storefront_slug,
    p.storefront_banner,
    p.name as display_name
  FROM public.profiles p
  WHERE p.storefront_slug = _slug
  LIMIT 1
$$;

-- Get dropshipper orders with masked customer data
CREATE OR REPLACE FUNCTION public.get_dropshipper_orders_masked()
RETURNS TABLE(
  id UUID,
  order_number TEXT,
  status order_status,
  quantity INTEGER,
  selling_price NUMERIC,
  base_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  payment_link TEXT,
  payment_link_clicked_at TIMESTAMP WITH TIME ZONE,
  storefront_product_id UUID,
  dropshipper_user_id UUID,
  customer_name_masked TEXT,
  customer_email_masked TEXT,
  customer_phone_masked TEXT,
  customer_address_masked TEXT,
  payment_type TEXT,
  postpaid_paid_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.order_number,
    o.status,
    o.quantity,
    o.selling_price,
    o.base_price,
    o.created_at,
    o.updated_at,
    o.paid_at,
    o.completed_at,
    o.payment_link,
    o.payment_link_clicked_at,
    o.storefront_product_id,
    o.dropshipper_user_id,
    CASE 
      WHEN LENGTH(o.customer_name) > 2 THEN LEFT(o.customer_name, 2) || '***'
      ELSE '***'
    END as customer_name_masked,
    CASE 
      WHEN o.customer_email LIKE '%@%' THEN 
        LEFT(SPLIT_PART(o.customer_email, '@', 1), 3) || '***@' || SPLIT_PART(o.customer_email, '@', 2)
      ELSE '***'
    END as customer_email_masked,
    CASE 
      WHEN o.customer_phone IS NOT NULL AND LENGTH(o.customer_phone) > 4 THEN 
        '******' || RIGHT(o.customer_phone, 4)
      ELSE '******'
    END as customer_phone_masked,
    CASE 
      WHEN LENGTH(o.customer_address) > 10 THEN LEFT(o.customer_address, 10) || '***'
      ELSE '***'
    END as customer_address_masked,
    o.payment_type,
    o.postpaid_paid_at
  FROM orders o
  WHERE o.dropshipper_user_id = auth.uid();
END;
$$;

-- Get available agent for chat assignment
CREATE OR REPLACE FUNCTION public.get_available_agent(_exclude_agent_id UUID DEFAULT NULL, _strategy chat_assignment_strategy DEFAULT 'least_active')
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  selected_agent_id UUID;
  max_chats integer;
BEGIN
  SELECT COALESCE(
    (SELECT value::integer FROM platform_settings WHERE key = 'max_chats_per_agent'),
    10
  ) INTO max_chats;

  IF _strategy = 'least_active' THEN
    SELECT sap.user_id INTO selected_agent_id
    FROM support_agent_presence sap
    WHERE sap.is_online = true
      AND sap.active_chat_count < max_chats
      AND (_exclude_agent_id IS NULL OR sap.user_id != _exclude_agent_id)
    ORDER BY sap.active_chat_count ASC, sap.last_seen_at DESC
    LIMIT 1;
  ELSIF _strategy = 'round_robin' THEN
    SELECT sap.user_id INTO selected_agent_id
    FROM support_agent_presence sap
    WHERE sap.is_online = true
      AND sap.active_chat_count < max_chats
      AND (_exclude_agent_id IS NULL OR sap.user_id != _exclude_agent_id)
    ORDER BY sap.updated_at ASC
    LIMIT 1;
  ELSE
    SELECT sap.user_id INTO selected_agent_id
    FROM support_agent_presence sap
    WHERE sap.is_online = true
      AND sap.active_chat_count < max_chats
      AND (_exclude_agent_id IS NULL OR sap.user_id != _exclude_agent_id)
    ORDER BY sap.active_chat_count ASC
    LIMIT 1;
  END IF;

  RETURN selected_agent_id;
END;
$$;

-- Get assigned agent name
CREATE OR REPLACE FUNCTION public.get_assigned_agent_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.name 
  FROM profiles p
  JOIN chat_sessions cs ON cs.assigned_agent_id = p.user_id
  WHERE cs.user_id = p_user_id
    AND cs.status = 'active'
  LIMIT 1;
$$;

-- Get assigned agent info
CREATE OR REPLACE FUNCTION public.get_assigned_agent_info(p_user_id uuid)
RETURNS TABLE(agent_name text, is_online boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.name as agent_name,
    COALESCE(sap.is_online, false) as is_online
  FROM profiles p
  JOIN chat_sessions cs ON cs.assigned_agent_id = p.user_id
  LEFT JOIN support_agent_presence sap ON sap.user_id = p.user_id
  WHERE cs.user_id = p_user_id
    AND cs.status = 'active'
  LIMIT 1;
$$;

-- Create audit log entry
CREATE OR REPLACE FUNCTION public.create_audit_log(
  _action_type TEXT,
  _admin_id UUID,
  _entity_id UUID,
  _entity_type TEXT,
  _metadata JSONB DEFAULT '{}'::jsonb,
  _new_value JSONB DEFAULT NULL,
  _old_value JSONB DEFAULT NULL,
  _reason TEXT DEFAULT NULL,
  _user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Only administrators can create audit logs';
  END IF;
  
  log_id := gen_random_uuid();
  INSERT INTO public.audit_logs (id, action_type, admin_id, entity_id, entity_type, metadata, new_value, old_value, reason, user_id)
  VALUES (log_id, _action_type, _admin_id, _entity_id, _entity_type, _metadata, _new_value, _old_value, _reason, _user_id);
  RETURN log_id;
END;
$$;

-- Log IP action
CREATE OR REPLACE FUNCTION public.log_ip_action(
  _user_id uuid,
  _ip_address text,
  _action_type text,
  _country text DEFAULT NULL,
  _city text DEFAULT NULL,
  _region text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _log_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;
  
  IF _ip_address IS NULL OR _ip_address = '' THEN
    RAISE EXCEPTION 'ip_address is required';
  END IF;
  
  IF _action_type IS NULL OR _action_type = '' THEN
    RAISE EXCEPTION 'action_type is required';
  END IF;
  
  IF _action_type NOT IN ('login', 'logout', 'order_placed', 'payout_request', 'profile_update') THEN
    RAISE EXCEPTION 'Invalid action_type: %', _action_type;
  END IF;
  
  IF auth.uid() IS NOT NULL AND auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Cannot log IP action for another user';
  END IF;
  
  INSERT INTO ip_logs (user_id, ip_address, action_type, country, city, region)
  VALUES (_user_id, _ip_address, _action_type, _country, _city, _region)
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Protect profile fields from unauthorized modification
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF NEW.user_status IS DISTINCT FROM OLD.user_status THEN
    RAISE EXCEPTION 'You are not allowed to modify user_status';
  END IF;
  
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    RAISE EXCEPTION 'You are not allowed to modify wallet_balance';
  END IF;
  
  IF NEW.commission_override IS DISTINCT FROM OLD.commission_override THEN
    RAISE EXCEPTION 'You are not allowed to modify commission_override';
  END IF;
  
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'You are not allowed to modify is_active';
  END IF;
  
  IF NEW.postpaid_enabled IS DISTINCT FROM OLD.postpaid_enabled THEN
    RAISE EXCEPTION 'You are not allowed to modify postpaid_enabled';
  END IF;
  
  IF NEW.postpaid_credit_limit IS DISTINCT FROM OLD.postpaid_credit_limit THEN
    RAISE EXCEPTION 'You are not allowed to modify postpaid_credit_limit';
  END IF;
  
  IF NEW.postpaid_used IS DISTINCT FROM OLD.postpaid_used THEN
    RAISE EXCEPTION 'You are not allowed to modify postpaid_used';
  END IF;
  
  IF NEW.allow_payout_with_dues IS DISTINCT FROM OLD.allow_payout_with_dues THEN
    RAISE EXCEPTION 'You are not allowed to modify allow_payout_with_dues';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Validate KYC submission
CREATE OR REPLACE FUNCTION public.validate_kyc_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.aadhaar_number !~ '^[0-9]{12}$' THEN
    RAISE EXCEPTION 'Invalid Aadhaar number format. Must be exactly 12 digits.';
  END IF;
  
  IF NEW.pan_number !~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$' THEN
    RAISE EXCEPTION 'Invalid PAN format. Must be 5 uppercase letters, 4 digits, 1 uppercase letter.';
  END IF;
  
  IF NEW.date_of_birth >= CURRENT_DATE THEN
    RAISE EXCEPTION 'Date of birth must be in the past.';
  END IF;
  
  IF NEW.date_of_birth < '1900-01-01'::date THEN
    RAISE EXCEPTION 'Invalid date of birth.';
  END IF;
  
  IF LENGTH(TRIM(NEW.first_name)) < 1 OR LENGTH(NEW.first_name) > 100 THEN
    RAISE EXCEPTION 'First name must be between 1 and 100 characters.';
  END IF;
  
  IF LENGTH(TRIM(NEW.last_name)) < 1 OR LENGTH(NEW.last_name) > 100 THEN
    RAISE EXCEPTION 'Last name must be between 1 and 100 characters.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Credit wallet on order completion
CREATE OR REPLACE FUNCTION public.credit_wallet_on_order_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auto_credit_enabled text;
  order_total numeric;
  already_credited boolean;
BEGIN
  IF (TG_OP = 'UPDATE')
     AND (NEW.status = 'completed')
     AND (OLD.status IS DISTINCT FROM 'completed') THEN

    SELECT value
      INTO auto_credit_enabled
      FROM public.platform_settings
     WHERE key = 'auto_credit_on_complete';

    IF COALESCE(auto_credit_enabled, 'false') <> 'true' THEN
      RETURN NEW;
    END IF;

    SELECT EXISTS (
      SELECT 1
        FROM public.wallet_transactions wt
       WHERE wt.order_id = NEW.id
         AND wt.type = ANY (ARRAY['order_value'::text, 'order_commission'::text])
    ) INTO already_credited;

    IF already_credited THEN
      RETURN NEW;
    END IF;

    order_total := (NEW.selling_price * NEW.quantity);
    order_total := GREATEST(0, COALESCE(order_total, 0));

    IF order_total <= 0 THEN
      RETURN NEW;
    END IF;

    UPDATE public.profiles
       SET wallet_balance = COALESCE(wallet_balance, 0) + order_total
     WHERE user_id = NEW.dropshipper_user_id;

    INSERT INTO public.wallet_transactions (user_id, amount, type, description, order_id)
    VALUES (
      NEW.dropshipper_user_id,
      order_total,
      'order_value',
      'Order value for order ' || NEW.order_number,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Sync wallet on order status change
CREATE OR REPLACE FUNCTION public.sync_wallet_on_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auto_credit_enabled text;
  order_total numeric;
  current_net numeric;
  has_order_value boolean;
  delta numeric;
BEGIN
  IF TG_OP <> 'UPDATE' OR (NEW.status IS NOT DISTINCT FROM OLD.status) THEN
    RETURN NEW;
  END IF;

  SELECT value INTO auto_credit_enabled
    FROM public.platform_settings
   WHERE key = 'auto_credit_on_complete';

  IF COALESCE(auto_credit_enabled, 'false') <> 'true' THEN
    RETURN NEW;
  END IF;

  order_total := GREATEST(0, COALESCE(NEW.selling_price, 0) * COALESCE(NEW.quantity, 0));
  IF order_total <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO current_net
    FROM public.wallet_transactions wt
   WHERE wt.order_id = NEW.id
     AND wt.user_id = NEW.dropshipper_user_id
     AND wt.type = ANY (ARRAY['order_value'::text, 'order_commission'::text, 'credit'::text, 'debit'::text, 'reversal'::text]);

  SELECT EXISTS (
    SELECT 1 FROM public.wallet_transactions wt
     WHERE wt.order_id = NEW.id
       AND wt.user_id = NEW.dropshipper_user_id
       AND wt.type = 'order_value'
       AND wt.amount > 0
  ) INTO has_order_value;

  IF OLD.status IS DISTINCT FROM 'completed'::public.order_status
     AND NEW.status = 'completed'::public.order_status THEN

    delta := order_total - current_net;

    IF delta > 0 THEN
      UPDATE public.profiles
         SET wallet_balance = COALESCE(wallet_balance, 0) + delta
       WHERE user_id = NEW.dropshipper_user_id;

      INSERT INTO public.wallet_transactions (user_id, amount, type, description, order_id)
      VALUES (
        NEW.dropshipper_user_id,
        delta,
        CASE WHEN has_order_value THEN 'credit' ELSE 'order_value' END,
        CASE
          WHEN has_order_value THEN 'Order re-completed - credit restored for ' || NEW.order_number
          ELSE 'Order value for order ' || NEW.order_number
        END,
        NEW.id
      );
    ELSIF delta < 0 THEN
      UPDATE public.profiles
         SET wallet_balance = COALESCE(wallet_balance, 0) + delta
       WHERE user_id = NEW.dropshipper_user_id;

      INSERT INTO public.wallet_transactions (user_id, amount, type, description, order_id)
      VALUES (
        NEW.dropshipper_user_id,
        delta,
        'debit',
        'Order completed - over-credit correction for ' || NEW.order_number,
        NEW.id
      );
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status = 'completed'::public.order_status
     AND NEW.status IS DISTINCT FROM 'completed'::public.order_status THEN

    delta := 0 - current_net;

    IF delta <> 0 THEN
      UPDATE public.profiles
         SET wallet_balance = COALESCE(wallet_balance, 0) + delta
       WHERE user_id = NEW.dropshipper_user_id;

      INSERT INTO public.wallet_transactions (user_id, amount, type, description, order_id)
      VALUES (
        NEW.dropshipper_user_id,
        delta,
        CASE WHEN delta < 0 THEN 'debit' ELSE 'credit' END,
        'Order status reverted from completed to ' || NEW.status::text || ' for ' || NEW.order_number,
        NEW.id
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Log order status change
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by_type)
    VALUES (NEW.id, OLD.status::text, NEW.status::text, 'system');
  END IF;
  RETURN NEW;
END;
$$;

-- Cleanup expired MFA data
CREATE OR REPLACE FUNCTION public.cleanup_expired_mfa_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.email_mfa_codes WHERE expires_at < now() OR is_used = true;
  DELETE FROM public.trusted_devices WHERE expires_at < now();
END;
$$;

-- Permanently delete cleared messages
CREATE OR REPLACE FUNCTION public.permanently_delete_cleared_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_messages_cleared_at IS NOT NULL AND 
     (OLD.user_messages_cleared_at IS NULL OR NEW.user_messages_cleared_at > OLD.user_messages_cleared_at) THEN
    DELETE FROM public.chat_messages 
    WHERE user_id = NEW.user_id 
    AND created_at < NEW.user_messages_cleared_at;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure single default work type
CREATE OR REPLACE FUNCTION public.ensure_single_default_work_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.work_types SET is_default = false WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Get public order status
CREATE OR REPLACE FUNCTION public.get_public_order_status(p_order_number text)
RETURNS TABLE(order_number text, status text, created_at timestamp with time zone, updated_at timestamp with time zone, product_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.order_number,
    o.status::text,
    o.created_at,
    o.updated_at,
    p.name as product_name
  FROM orders o
  JOIN storefront_products sp ON o.storefront_product_id = sp.id
  JOIN products p ON sp.product_id = p.id
  WHERE o.order_number = p_order_number;
END;
$$;

-- Get public order status history
CREATE OR REPLACE FUNCTION public.get_public_order_status_history(p_order_number text)
RETURNS TABLE(new_status text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    osh.new_status,
    osh.created_at
  FROM order_status_history osh
  JOIN orders o ON osh.order_id = o.id
  WHERE o.order_number = p_order_number
  ORDER BY osh.created_at DESC;
END;
$$;

-- Check login rate limit
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(_email text, _ip_address text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_attempts integer := 5;
  window_minutes integer := 15;
  lockout_minutes integer := 30;
  email_attempts integer;
  ip_attempts integer;
  last_attempt timestamptz;
  retry_after integer;
BEGIN
  SELECT COUNT(*), MAX(attempted_at) INTO email_attempts, last_attempt
  FROM login_attempts
  WHERE email = lower(_email)
    AND was_successful = false
    AND attempted_at > (now() - (window_minutes || ' minutes')::interval);
  
  IF email_attempts >= max_attempts THEN
    retry_after := EXTRACT(EPOCH FROM (last_attempt + (lockout_minutes || ' minutes')::interval - now()))::integer;
    IF retry_after > 0 THEN
      RETURN jsonb_build_object(
        'blocked', true,
        'remaining_attempts', 0,
        'retry_after_seconds', retry_after,
        'reason', 'Too many failed login attempts. Please try again later.'
      );
    END IF;
  END IF;
  
  IF _ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO ip_attempts
    FROM login_attempts
    WHERE ip_address = _ip_address
      AND was_successful = false
      AND attempted_at > (now() - (window_minutes || ' minutes')::interval);
    
    IF ip_attempts >= 10 THEN
      SELECT MAX(attempted_at) INTO last_attempt
      FROM login_attempts
      WHERE ip_address = _ip_address
        AND was_successful = false
        AND attempted_at > (now() - (window_minutes || ' minutes')::interval);
      
      retry_after := EXTRACT(EPOCH FROM (last_attempt + (lockout_minutes || ' minutes')::interval - now()))::integer;
      IF retry_after > 0 THEN
        RETURN jsonb_build_object(
          'blocked', true,
          'remaining_attempts', 0,
          'retry_after_seconds', retry_after,
          'reason', 'Too many login attempts from this location. Please try again later.'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'blocked', false,
    'remaining_attempts', max_attempts - email_attempts,
    'retry_after_seconds', 0,
    'reason', NULL
  );
END;
$$;

-- Record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(_email text, _ip_address text DEFAULT NULL, _was_successful boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO login_attempts (email, ip_address, was_successful)
  VALUES (lower(_email), _ip_address, _was_successful);
  
  IF _was_successful THEN
    DELETE FROM login_attempts
    WHERE email = lower(_email)
      AND was_successful = false
      AND attempted_at < now();
  END IF;
END;
$$;

-- Cleanup old login attempts
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM login_attempts
  WHERE attempted_at < (now() - interval '24 hours');
END;
$$;

-- Get postpaid available credit
CREATE OR REPLACE FUNCTION public.get_postpaid_available_credit(_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  credit_limit numeric;
  used_amount numeric;
BEGIN
  SELECT postpaid_credit_limit, postpaid_used 
  INTO credit_limit, used_amount
  FROM public.profiles 
  WHERE user_id = _user_id;
  
  RETURN COALESCE(credit_limit, 0) - COALESCE(used_amount, 0);
END;
$$;

-- Can request payout
CREATE OR REPLACE FUNCTION public.can_request_payout(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  postpaid_due numeric;
  allow_payout boolean;
BEGIN
  SELECT postpaid_used, allow_payout_with_dues 
  INTO postpaid_due, allow_payout
  FROM public.profiles 
  WHERE user_id = _user_id;
  
  IF COALESCE(allow_payout, false) THEN
    RETURN true;
  END IF;
  
  RETURN COALESCE(postpaid_due, 0) = 0;
END;
$$;

-- Process postpaid payment
CREATE OR REPLACE FUNCTION public.process_postpaid_payment(_user_id uuid, _order_id uuid, _amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_used numeric;
  current_limit numeric;
  available_credit numeric;
  new_used numeric;
  order_record record;
  result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'You can only process payments for your own orders';
  END IF;
  
  SELECT postpaid_credit_limit, postpaid_used INTO current_limit, current_used
  FROM profiles WHERE user_id = _user_id FOR UPDATE;
  
  IF current_limit IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  
  available_credit := COALESCE(current_limit, 0) - COALESCE(current_used, 0);
  
  IF current_limit <= 0 THEN
    RAISE EXCEPTION 'Postpaid credit is not enabled for your account. Please contact admin.';
  END IF;
  
  IF _amount > available_credit THEN
    RAISE EXCEPTION 'Insufficient postpaid limit. Your limit is $%, but the order value is $%. Available credit: $%. Please choose another payment method or reduce the order value.',
      current_limit, _amount, available_credit;
  END IF;
  
  SELECT id, order_number, base_price, quantity, status, dropshipper_user_id INTO order_record
  FROM orders WHERE id = _order_id AND dropshipper_user_id = _user_id FOR UPDATE;
  
  IF order_record IS NULL THEN
    RAISE EXCEPTION 'Order not found or access denied';
  END IF;
  
  IF order_record.status != 'pending_payment' THEN
    RAISE EXCEPTION 'Order is not in pending_payment status. Current status: %', order_record.status;
  END IF;
  
  IF _amount != (order_record.base_price * order_record.quantity) THEN
    RAISE EXCEPTION 'Amount mismatch. Expected $% but received $%', 
      (order_record.base_price * order_record.quantity), _amount;
  END IF;
  
  new_used := COALESCE(current_used, 0) + _amount;
  
  IF new_used > current_limit THEN
    RAISE EXCEPTION 'Insufficient postpaid limit after validation. This should not happen - please contact support.';
  END IF;
  
  UPDATE orders SET status = 'postpaid_pending', payment_type = 'postpaid', paid_at = now(), updated_at = now()
  WHERE id = _order_id;
  
  UPDATE profiles SET postpaid_used = new_used, updated_at = now() WHERE user_id = _user_id;
  
  INSERT INTO postpaid_transactions (user_id, order_id, amount, transaction_type, description, balance_before, balance_after, status)
  VALUES (_user_id, _order_id, _amount, 'credit_used', 'Order ' || order_record.order_number || ' - Postpaid payment', current_used, new_used, 'completed');
  
  INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, changed_by_type, notes)
  VALUES (_order_id, 'pending_payment', 'postpaid_pending', _user_id, 'user', 'Paid using postpaid credit');
  
  result := jsonb_build_object(
    'success', true,
    'order_number', order_record.order_number,
    'amount', _amount,
    'new_postpaid_used', new_used,
    'available_credit', current_limit - new_used,
    'credit_limit', current_limit
  );
  
  RETURN result;
END;
$$;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.check_login_rate_limit(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_login_attempts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_order_status(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_order_status_history(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_storefront_profile(text) TO anon, authenticated;

-- =============================================
-- TRIGGER DEFINITIONS
-- =============================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_storefront_products_updated_at ON public.storefront_products;
CREATE TRIGGER update_storefront_products_updated_at BEFORE UPDATE ON public.storefront_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_kyc_submissions_updated_at ON public.kyc_submissions;
CREATE TRIGGER update_kyc_submissions_updated_at BEFORE UPDATE ON public.kyc_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payout_requests_updated_at ON public.payout_requests;
CREATE TRIGGER update_payout_requests_updated_at BEFORE UPDATE ON public.payout_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON public.platform_settings;
CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_chat_quick_replies_updated_at ON public.order_chat_quick_replies;
CREATE TRIGGER update_order_chat_quick_replies_updated_at BEFORE UPDATE ON public.order_chat_quick_replies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_agent_presence_updated_at ON public.support_agent_presence;
CREATE TRIGGER update_support_agent_presence_updated_at BEFORE UPDATE ON public.support_agent_presence FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crypto_payments_updated_at ON public.crypto_payments;
CREATE TRIGGER update_crypto_payments_updated_at BEFORE UPDATE ON public.crypto_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_proof_of_work_updated_at ON public.proof_of_work;
CREATE TRIGGER update_proof_of_work_updated_at BEFORE UPDATE ON public.proof_of_work FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_types_updated_at ON public.work_types;
CREATE TRIGGER update_work_types_updated_at BEFORE UPDATE ON public.work_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_type_categories_updated_at ON public.work_type_categories;
CREATE TRIGGER update_work_type_categories_updated_at BEFORE UPDATE ON public.work_type_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_custom_payment_methods_updated_at ON public.custom_payment_methods;
CREATE TRIGGER update_custom_payment_methods_updated_at BEFORE UPDATE ON public.custom_payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_media_updated_at ON public.product_media;
CREATE TRIGGER update_product_media_updated_at BEFORE UPDATE ON public.product_media FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON public.product_reviews;
CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_dashboard_messages_updated_at ON public.dashboard_messages;
CREATE TRIGGER update_dashboard_messages_updated_at BEFORE UPDATE ON public.dashboard_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_popup_messages_updated_at ON public.popup_messages;
CREATE TRIGGER update_popup_messages_updated_at BEFORE UPDATE ON public.popup_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_top_dropshippers_updated_at ON public.top_dropshippers;
CREATE TRIGGER update_top_dropshippers_updated_at BEFORE UPDATE ON public.top_dropshippers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_rank_reference_updated_at ON public.user_rank_reference;
CREATE TRIGGER update_user_rank_reference_updated_at BEFORE UPDATE ON public.user_rank_reference FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_chat_presence_updated_at ON public.agent_chat_presence;
CREATE TRIGGER update_agent_chat_presence_updated_at BEFORE UPDATE ON public.agent_chat_presence FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS generate_order_number_trigger ON public.orders;
CREATE TRIGGER generate_order_number_trigger BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

DROP TRIGGER IF EXISTS protect_profile_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_fields_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

DROP TRIGGER IF EXISTS validate_kyc_submission_trigger ON public.kyc_submissions;
CREATE TRIGGER validate_kyc_submission_trigger BEFORE INSERT OR UPDATE ON public.kyc_submissions FOR EACH ROW EXECUTE FUNCTION public.validate_kyc_submission();

DROP TRIGGER IF EXISTS credit_wallet_on_order_completed_trigger ON public.orders;
CREATE TRIGGER credit_wallet_on_order_completed_trigger AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.credit_wallet_on_order_completed();

DROP TRIGGER IF EXISTS sync_wallet_on_order_status_change_trigger ON public.orders;
CREATE TRIGGER sync_wallet_on_order_status_change_trigger AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_on_order_status_change();

DROP TRIGGER IF EXISTS log_order_status_change_trigger ON public.orders;
CREATE TRIGGER log_order_status_change_trigger AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

DROP TRIGGER IF EXISTS permanently_delete_cleared_messages_trigger ON public.chat_sessions;
CREATE TRIGGER permanently_delete_cleared_messages_trigger AFTER UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION public.permanently_delete_cleared_messages();

DROP TRIGGER IF EXISTS ensure_single_default_work_type_trigger ON public.work_types;
CREATE TRIGGER ensure_single_default_work_type_trigger BEFORE INSERT OR UPDATE ON public.work_types FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_work_type();

-- =============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_customer_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postpaid_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_customer_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reassignment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_chat_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indian_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_chat_quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_chat_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.force_logout_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_mfa_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_agent_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_tutorial_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_of_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_type_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_message_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_message_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.top_dropshippers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rank_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts FORCE ROW LEVEL SECURITY;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can update their own profile safely" ON public.profiles;
CREATE POLICY "Users can update their own profile safely" ON public.profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- User roles policies
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User preferences policies
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- Products policies
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Product media policies
DROP POLICY IF EXISTS "Public can view product media" ON public.product_media;
CREATE POLICY "Public can view product media" ON public.product_media FOR SELECT USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_media.product_id AND p.is_active = true));

DROP POLICY IF EXISTS "Admins can manage product media" ON public.product_media;
CREATE POLICY "Admins can manage product media" ON public.product_media FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Product reviews policies
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.product_reviews;
CREATE POLICY "Anyone can view approved reviews" ON public.product_reviews FOR SELECT USING (is_approved = true);

DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.product_reviews;
CREATE POLICY "Admins can manage all reviews" ON public.product_reviews FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can submit reviews with validation" ON public.product_reviews;
CREATE POLICY "Users can submit reviews with validation" ON public.product_reviews FOR INSERT WITH CHECK (product_id IS NOT NULL);

-- Storefront products policies
DROP POLICY IF EXISTS "Users can manage their own storefront products" ON public.storefront_products;
CREATE POLICY "Users can manage their own storefront products" ON public.storefront_products FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all storefront products" ON public.storefront_products;
CREATE POLICY "Admins can view all storefront products" ON public.storefront_products FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public can view active storefront products safely" ON public.storefront_products;
CREATE POLICY "Public can view active storefront products safely" ON public.storefront_products FOR SELECT USING (is_active = true AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = storefront_products.user_id AND p.is_active = true AND p.user_status = 'approved'));

-- Orders policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = dropshipper_user_id);

DROP POLICY IF EXISTS "Users can create orders for their products" ON public.orders;
CREATE POLICY "Users can create orders for their products" ON public.orders FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM storefront_products sp WHERE sp.id = orders.storefront_product_id AND sp.user_id = orders.dropshipper_user_id));

DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = dropshipper_user_id) WITH CHECK (auth.uid() = dropshipper_user_id);

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Order status history policies
DROP POLICY IF EXISTS "Users can view status history for their orders" ON public.order_status_history;
CREATE POLICY "Users can view status history for their orders" ON public.order_status_history FOR SELECT USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_status_history.order_id AND o.dropshipper_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert status history for their orders" ON public.order_status_history;
CREATE POLICY "Users can insert status history for their orders" ON public.order_status_history FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_status_history.order_id AND o.dropshipper_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all order status history" ON public.order_status_history;
CREATE POLICY "Admins can manage all order status history" ON public.order_status_history FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Order customer names policies
DROP POLICY IF EXISTS "Users can view order customer names for their orders" ON public.order_customer_names;
CREATE POLICY "Users can view order customer names for their orders" ON public.order_customer_names FOR SELECT USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_customer_names.order_id AND o.dropshipper_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert order customer names for their orders" ON public.order_customer_names;
CREATE POLICY "Users can insert order customer names for their orders" ON public.order_customer_names FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_customer_names.order_id AND o.dropshipper_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage order customer names" ON public.order_customer_names;
CREATE POLICY "Admins can manage order customer names" ON public.order_customer_names FOR ALL USING (has_role(auth.uid(), 'admin'));

-- KYC submissions policies
DROP POLICY IF EXISTS "Users can view their own KYC" ON public.kyc_submissions;
CREATE POLICY "Users can view their own KYC" ON public.kyc_submissions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can submit KYC" ON public.kyc_submissions;
CREATE POLICY "Users can submit KYC" ON public.kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update rejected KYC" ON public.kyc_submissions;
CREATE POLICY "Users can update rejected KYC" ON public.kyc_submissions FOR UPDATE USING (auth.uid() = user_id AND status = 'rejected');

DROP POLICY IF EXISTS "Admins can view all KYC" ON public.kyc_submissions;
CREATE POLICY "Admins can view all KYC" ON public.kyc_submissions FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update KYC" ON public.kyc_submissions;
CREATE POLICY "Admins can update KYC" ON public.kyc_submissions FOR UPDATE USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete KYC" ON public.kyc_submissions;
CREATE POLICY "Admins can delete KYC" ON public.kyc_submissions FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Wallet transactions policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can create their own transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can insert wallet transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- Postpaid transactions policies
DROP POLICY IF EXISTS "Users can view their own postpaid transactions" ON public.postpaid_transactions;
CREATE POLICY "Users can view their own postpaid transactions" ON public.postpaid_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own postpaid transactions" ON public.postpaid_transactions;
CREATE POLICY "Users can insert their own postpaid transactions" ON public.postpaid_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all postpaid transactions" ON public.postpaid_transactions;
CREATE POLICY "Admins can manage all postpaid transactions" ON public.postpaid_transactions FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Payout requests policies
DROP POLICY IF EXISTS "Users can view their own payout requests" ON public.payout_requests;
CREATE POLICY "Users can view their own payout requests" ON public.payout_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own payout requests" ON public.payout_requests;
CREATE POLICY "Users can create their own payout requests" ON public.payout_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pending payout requests" ON public.payout_requests;
CREATE POLICY "Users can update their own pending payout requests" ON public.payout_requests FOR UPDATE USING (auth.uid() = user_id AND status = 'pending') WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own pending payout requests" ON public.payout_requests;
CREATE POLICY "Users can delete their own pending payout requests" ON public.payout_requests FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Admins can manage all payout requests" ON public.payout_requests;
CREATE POLICY "Admins can manage all payout requests" ON public.payout_requests FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Payout status history policies
DROP POLICY IF EXISTS "Users can view their own payout history" ON public.payout_status_history;
CREATE POLICY "Users can view their own payout history" ON public.payout_status_history FOR SELECT USING (EXISTS (SELECT 1 FROM payout_requests pr WHERE pr.id = payout_status_history.payout_id AND pr.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all payout history" ON public.payout_status_history;
CREATE POLICY "Admins can view all payout history" ON public.payout_status_history FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert payout history" ON public.payout_status_history;
CREATE POLICY "Admins can insert payout history" ON public.payout_status_history FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- Chat messages policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;
CREATE POLICY "Users can view their own messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;
CREATE POLICY "Users can send messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id AND sender_role = 'user');

DROP POLICY IF EXISTS "Users can update their messages" ON public.chat_messages;
CREATE POLICY "Users can update their messages" ON public.chat_messages FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all messages" ON public.chat_messages;
CREATE POLICY "Admins can view all messages" ON public.chat_messages FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can send messages" ON public.chat_messages;
CREATE POLICY "Admins can send messages" ON public.chat_messages FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') AND sender_role = 'admin');

DROP POLICY IF EXISTS "Admins can update messages" ON public.chat_messages;
CREATE POLICY "Admins can update messages" ON public.chat_messages FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Chat ratings policies
DROP POLICY IF EXISTS "Users can view their own ratings" ON public.chat_ratings;
CREATE POLICY "Users can view their own ratings" ON public.chat_ratings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own ratings" ON public.chat_ratings;
CREATE POLICY "Users can create their own ratings" ON public.chat_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all ratings" ON public.chat_ratings;
CREATE POLICY "Admins can view all ratings" ON public.chat_ratings FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Chat customer names policies
DROP POLICY IF EXISTS "Users can view their own chat name" ON public.chat_customer_names;
CREATE POLICY "Users can view their own chat name" ON public.chat_customer_names FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own chat name" ON public.chat_customer_names;
CREATE POLICY "Users can insert their own chat name" ON public.chat_customer_names FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all chat names" ON public.chat_customer_names;
CREATE POLICY "Admins can view all chat names" ON public.chat_customer_names FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert chat names" ON public.chat_customer_names;
CREATE POLICY "Admins can insert chat names" ON public.chat_customer_names FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update chat names" ON public.chat_customer_names;
CREATE POLICY "Admins can update chat names" ON public.chat_customer_names FOR UPDATE USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete chat names" ON public.chat_customer_names;
CREATE POLICY "Admins can delete chat names" ON public.chat_customer_names FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Chat sessions policies
DROP POLICY IF EXISTS "Users can view their own session" ON public.chat_sessions;
CREATE POLICY "Users can view their own session" ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert their own session" ON public.chat_sessions;
CREATE POLICY "Users can upsert their own session" ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own session" ON public.chat_sessions;
CREATE POLICY "Users can update their own session" ON public.chat_sessions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all chat sessions" ON public.chat_sessions;
CREATE POLICY "Admins can manage all chat sessions" ON public.chat_sessions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Chat reassignment logs policies
DROP POLICY IF EXISTS "Admins can view all reassignment logs" ON public.chat_reassignment_logs;
CREATE POLICY "Admins can view all reassignment logs" ON public.chat_reassignment_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert reassignment logs" ON public.chat_reassignment_logs;
CREATE POLICY "Admins can insert reassignment logs" ON public.chat_reassignment_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- Agent chat presence policies
DROP POLICY IF EXISTS "Admins can manage their own presence" ON public.agent_chat_presence;
CREATE POLICY "Admins can manage their own presence" ON public.agent_chat_presence FOR ALL USING (agent_id = auth.uid()) WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS "Users can view agent presence for their chat" ON public.agent_chat_presence;
CREATE POLICY "Users can view agent presence for their chat" ON public.agent_chat_presence FOR SELECT USING (viewing_user_id = auth.uid());

-- Indian names policies
DROP POLICY IF EXISTS "Anyone can read active indian names" ON public.indian_names;
CREATE POLICY "Anyone can read active indian names" ON public.indian_names FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage indian names" ON public.indian_names;
CREATE POLICY "Admins can manage indian names" ON public.indian_names FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Order chat messages policies
DROP POLICY IF EXISTS "Users can view order chat messages" ON public.order_chat_messages;
CREATE POLICY "Users can view order chat messages" ON public.order_chat_messages FOR SELECT USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_chat_messages.order_id AND o.dropshipper_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can send order chat messages" ON public.order_chat_messages;
CREATE POLICY "Users can send order chat messages" ON public.order_chat_messages FOR INSERT WITH CHECK (sender_type = 'user' AND sender_user_id = auth.uid() AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_chat_messages.order_id AND o.dropshipper_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can mark messages as read" ON public.order_chat_messages;
CREATE POLICY "Users can mark messages as read" ON public.order_chat_messages FOR UPDATE USING (sender_type = 'customer' AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_chat_messages.order_id AND o.dropshipper_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all order chat messages" ON public.order_chat_messages;
CREATE POLICY "Admins can view all order chat messages" ON public.order_chat_messages FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can send customer messages" ON public.order_chat_messages;
CREATE POLICY "Admins can send customer messages" ON public.order_chat_messages FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND sender_type = 'customer');

DROP POLICY IF EXISTS "Admins can update order chat messages" ON public.order_chat_messages;
CREATE POLICY "Admins can update order chat messages" ON public.order_chat_messages FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Order chat quick replies policies
DROP POLICY IF EXISTS "Users can view active quick replies" ON public.order_chat_quick_replies;
CREATE POLICY "Users can view active quick replies" ON public.order_chat_quick_replies FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage quick replies" ON public.order_chat_quick_replies;
CREATE POLICY "Admins can manage quick replies" ON public.order_chat_quick_replies FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Order chat audit logs policies
DROP POLICY IF EXISTS "Admins can view order chat audit logs" ON public.order_chat_audit_logs;
CREATE POLICY "Admins can view order chat audit logs" ON public.order_chat_audit_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert order chat audit logs" ON public.order_chat_audit_logs;
CREATE POLICY "Admins can insert order chat audit logs" ON public.order_chat_audit_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- Platform settings policies
DROP POLICY IF EXISTS "Public can read whitelisted settings only" ON public.platform_settings;
CREATE POLICY "Public can read whitelisted settings only" ON public.platform_settings FOR SELECT USING (
  key = ANY (ARRAY[
    'site_name', 'site_logo_url', 'site_tagline', 
    'landing_page_title', 'landing_page_subtitle', 'landing_page_hero_image',
    'landing_page_cta_text', 'landing_page_cta_link',
    'primary_color', 'secondary_color', 'accent_color',
    'footer_text', 'contact_email', 'contact_phone',
    'social_facebook', 'social_twitter', 'social_instagram', 'social_linkedin',
    'enable_registration', 'enable_storefront', 'enable_kyc', 'enable_crypto_payments',
    'maintenance_mode', 'currency_code', 'currency_symbol',
    'date_format', 'timezone', 'language',
    'faq_items', 'help_center_url', 'terms_of_service_url', 'privacy_policy_url',
    'storefront_greeting_message', 'storefront_ordering_enabled', 'storefront_ordering_disabled_message',
    'payout_enabled', 'payout_disabled_message', 'chat_greeting_message',
    'payout_methods_enabled', 'storefront_payment_icons',
    'storefront_contact_email', 'storefront_contact_phone', 'storefront_contact_address',
    'storefront_contact_whatsapp', 'storefront_business_hours',
    'usd_wallet_id', 'usd_wallet_currency_name', 'usd_wallet_currency_symbol',
    'usd_wallet_qr_url', 'usd_wallet_icon_url', 'usd_wallet_enabled',
    'crypto_wallets', 'payment_method_usd_wallet_enabled', 'payment_method_usd_wallet_message'
  ])
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.platform_settings;
CREATE POLICY "Admins can manage settings" ON public.platform_settings FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Audit logs policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- IP logs policies
DROP POLICY IF EXISTS "Users can view their own IP logs" ON public.ip_logs;
CREATE POLICY "Users can view their own IP logs" ON public.ip_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own IP logs" ON public.ip_logs;
CREATE POLICY "Users can insert their own IP logs" ON public.ip_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all IP logs" ON public.ip_logs;
CREATE POLICY "Admins can view all IP logs" ON public.ip_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Force logout events policies
DROP POLICY IF EXISTS "Users can view their own logout events" ON public.force_logout_events;
CREATE POLICY "Users can view their own logout events" ON public.force_logout_events FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can insert force logout events" ON public.force_logout_events;
CREATE POLICY "Admins can insert force logout events" ON public.force_logout_events FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- OTP verifications policies
DROP POLICY IF EXISTS "Users can create OTP verifications" ON public.otp_verifications;
CREATE POLICY "Users can create OTP verifications" ON public.otp_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own OTP verifications" ON public.otp_verifications;
CREATE POLICY "Users can view own OTP verifications" ON public.otp_verifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own OTP verifications" ON public.otp_verifications;
CREATE POLICY "Users can update own OTP verifications" ON public.otp_verifications FOR UPDATE USING (auth.uid() = user_id);

-- Email MFA codes policies
DROP POLICY IF EXISTS "Users can view their own email MFA codes" ON public.email_mfa_codes;
CREATE POLICY "Users can view their own email MFA codes" ON public.email_mfa_codes FOR SELECT USING (auth.uid() = user_id);

-- Trusted devices policies
DROP POLICY IF EXISTS "Users can manage their own devices" ON public.trusted_devices;
CREATE POLICY "Users can manage their own devices" ON public.trusted_devices FOR ALL USING (auth.uid() = user_id);

-- Support agent presence policies
DROP POLICY IF EXISTS "Admins can manage agent presence" ON public.support_agent_presence;
CREATE POLICY "Admins can manage agent presence" ON public.support_agent_presence FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view online agents" ON public.support_agent_presence;
CREATE POLICY "Users can view online agents" ON public.support_agent_presence FOR SELECT USING (is_online = true);

-- Crypto payments policies
DROP POLICY IF EXISTS "Users can view own crypto payments" ON public.crypto_payments;
CREATE POLICY "Users can view own crypto payments" ON public.crypto_payments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create crypto payments" ON public.crypto_payments;
CREATE POLICY "Users can create crypto payments" ON public.crypto_payments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pending payments" ON public.crypto_payments;
CREATE POLICY "Users can update own pending payments" ON public.crypto_payments FOR UPDATE USING (auth.uid() = user_id AND status = 'pending') WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all crypto payments" ON public.crypto_payments;
CREATE POLICY "Admins can view all crypto payments" ON public.crypto_payments FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update crypto payments" ON public.crypto_payments;
CREATE POLICY "Admins can update crypto payments" ON public.crypto_payments FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Video tutorial completions policies
DROP POLICY IF EXISTS "Users can manage their own completions" ON public.video_tutorial_completions;
CREATE POLICY "Users can manage their own completions" ON public.video_tutorial_completions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all completions" ON public.video_tutorial_completions;
CREATE POLICY "Admins can view all completions" ON public.video_tutorial_completions FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Proof of work policies
DROP POLICY IF EXISTS "Users can view their own proofs" ON public.proof_of_work;
CREATE POLICY "Users can view their own proofs" ON public.proof_of_work FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own proofs" ON public.proof_of_work;
CREATE POLICY "Users can create their own proofs" ON public.proof_of_work FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their pending proofs" ON public.proof_of_work;
CREATE POLICY "Users can update their pending proofs" ON public.proof_of_work FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Admins can manage all proofs" ON public.proof_of_work;
CREATE POLICY "Admins can manage all proofs" ON public.proof_of_work FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Work types policies
DROP POLICY IF EXISTS "Authenticated users can view active work types" ON public.work_types;
CREATE POLICY "Authenticated users can view active work types" ON public.work_types FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage work types" ON public.work_types;
CREATE POLICY "Admins can manage work types" ON public.work_types FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Work type categories policies
DROP POLICY IF EXISTS "Authenticated users can view active categories" ON public.work_type_categories;
CREATE POLICY "Authenticated users can view active categories" ON public.work_type_categories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage work type categories" ON public.work_type_categories;
CREATE POLICY "Admins can manage work type categories" ON public.work_type_categories FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.user_notifications;
CREATE POLICY "Users can view their own notifications" ON public.user_notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.user_notifications;
CREATE POLICY "Users can update their own notifications" ON public.user_notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.user_notifications;
CREATE POLICY "Users can delete their own notifications" ON public.user_notifications FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.user_notifications;
CREATE POLICY "Users can insert their own notifications" ON public.user_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.user_notifications;
CREATE POLICY "Admins can manage all notifications" ON public.user_notifications FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Custom payment methods policies
DROP POLICY IF EXISTS "Anyone can read enabled payment methods" ON public.custom_payment_methods;
CREATE POLICY "Anyone can read enabled payment methods" ON public.custom_payment_methods FOR SELECT USING (is_enabled = true);

DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.custom_payment_methods;
CREATE POLICY "Admins can manage payment methods" ON public.custom_payment_methods FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Dashboard messages policies
DROP POLICY IF EXISTS "Users can view enabled messages" ON public.dashboard_messages;
CREATE POLICY "Users can view enabled messages" ON public.dashboard_messages FOR SELECT USING (is_enabled = true AND show_to_users = true AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS "Admins can manage dashboard messages" ON public.dashboard_messages;
CREATE POLICY "Admins can manage dashboard messages" ON public.dashboard_messages FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Dashboard message targets policies
DROP POLICY IF EXISTS "Users can view their own message targets" ON public.dashboard_message_targets;
CREATE POLICY "Users can view their own message targets" ON public.dashboard_message_targets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage message targets" ON public.dashboard_message_targets;
CREATE POLICY "Admins can manage message targets" ON public.dashboard_message_targets FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Popup messages policies
DROP POLICY IF EXISTS "Users can view their targeted popup messages" ON public.popup_messages;
CREATE POLICY "Users can view their targeted popup messages" ON public.popup_messages FOR SELECT USING (
  is_enabled = true
  AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
    OR target_type = 'all'
    OR (target_type = 'specific' AND EXISTS (SELECT 1 FROM popup_message_targets WHERE popup_message_targets.message_id = popup_messages.id AND popup_message_targets.user_id = auth.uid()))
    OR (target_type = 'role' AND target_roles IS NOT NULL AND EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role::text = ANY(popup_messages.target_roles)))
  )
);

DROP POLICY IF EXISTS "Admins can manage popup messages" ON public.popup_messages;
CREATE POLICY "Admins can manage popup messages" ON public.popup_messages FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Popup message targets policies
DROP POLICY IF EXISTS "Users can view their own popup targets" ON public.popup_message_targets;
CREATE POLICY "Users can view their own popup targets" ON public.popup_message_targets FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage popup message targets" ON public.popup_message_targets;
CREATE POLICY "Admins can manage popup message targets" ON public.popup_message_targets FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Popup acknowledgments policies
DROP POLICY IF EXISTS "Users can view their own acknowledgments" ON public.popup_acknowledgments;
CREATE POLICY "Users can view their own acknowledgments" ON public.popup_acknowledgments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own acknowledgments" ON public.popup_acknowledgments;
CREATE POLICY "Users can create their own acknowledgments" ON public.popup_acknowledgments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all acknowledgments" ON public.popup_acknowledgments;
CREATE POLICY "Admins can view all acknowledgments" ON public.popup_acknowledgments FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Top dropshippers policies
DROP POLICY IF EXISTS "Anyone can view active top dropshippers" ON public.top_dropshippers;
CREATE POLICY "Anyone can view active top dropshippers" ON public.top_dropshippers FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage top dropshippers" ON public.top_dropshippers;
CREATE POLICY "Admins can manage top dropshippers" ON public.top_dropshippers FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User rank reference policies
DROP POLICY IF EXISTS "Users can view their own rank" ON public.user_rank_reference;
CREATE POLICY "Users can view their own rank" ON public.user_rank_reference FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all ranks" ON public.user_rank_reference;
CREATE POLICY "Admins can manage all ranks" ON public.user_rank_reference FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Login attempts policies (restricted access)
DROP POLICY IF EXISTS "No direct access to login_attempts" ON public.login_attempts;
CREATE POLICY "No direct access to login_attempts" ON public.login_attempts FOR ALL USING (false);

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_agent_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proof_of_work;
ALTER PUBLICATION supabase_realtime ADD TABLE public.postpaid_transactions;

-- =============================================
-- DEFAULT PLATFORM SETTINGS
-- =============================================

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('site_name', 'DropShip', 'Platform name'),
  ('site_title', 'DropShip', 'Site title for browser tab'),
  ('site_favicon_url', '/favicon.ico', 'Favicon URL'),
  ('site_logo_url', '', 'Logo URL'),
  ('commission_rate', '100', 'Default commission rate for dropshippers'),
  ('auto_user_approval', 'false', 'Automatically approve new user registrations'),
  ('minimum_payout_amount', '500', 'Minimum amount for payout requests'),
  ('notification_sound_enabled', 'true', 'Enable notification sounds'),
  ('notification_sound_volume', '0.5', 'Notification sound volume (0-1)'),
  ('landing_page_enabled', 'true', 'Enable landing page'),
  ('landing_page_title', 'Launch Your Dropshipping Empire', 'Landing page headline'),
  ('landing_page_subtitle', 'The all-in-one dropshipping platform', 'Landing page subtitle'),
  ('postpaid_enabled', 'false', 'Enable postpaid system globally'),
  ('auto_credit_on_complete', 'false', 'Auto credit wallet on order completion'),
  ('email_notifications_enabled', 'true', 'Enable email notifications'),
  ('admin_email', '', 'Admin email for notifications'),
  ('sender_email', 'onboarding@resend.dev', 'Email sender address'),
  ('resend_api_key', '', 'Resend API key for email sending'),
  ('currency_symbol', '₹', 'Currency symbol for display'),
  ('footer_text', '© {year} {site_name}. All rights reserved.', 'Footer text'),
  ('contact_email', '', 'Contact email'),
  ('contact_phone', '', 'Contact phone')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- AUTH TRIGGER (Run in Supabase SQL Editor)
-- =============================================
-- 
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STORAGE BUCKETS
-- =============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('kyc-documents', 'kyc-documents', false),
  ('branding', 'branding', true),
  ('videos', 'videos', true),
  ('payout-documents', 'payout-documents', false),
  ('payment-proofs', 'payment-proofs', false),
  ('product-media', 'product-media', true),
  ('profile-images', 'profile-images', true),
  ('proof-images', 'proof-images', true),
  ('admin-media', 'admin-media', true),
  ('proof-of-work', 'proof-of-work', false),
  ('storefront-assets', 'storefront-assets', true),
  ('order-proofs', 'order-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STORAGE POLICIES (RESET AND RECREATE)
-- =============================================

-- DROP ALL EXISTING STORAGE POLICIES FIRST (GUARANTEED CLEANUP)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop every policy on storage.objects
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
    
    -- Also explicitly drop by known names (fallback)
    EXECUTE 'DROP POLICY IF EXISTS "admin_media_public_read" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "admin_media_admin_all" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "product_media_public_read" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "product_media_admin_all" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "kyc_user_upload" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "kyc_user_read_own" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "kyc_admin_all" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "branding_public_read" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "branding_admin_all" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "videos_public_read" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "videos_admin_all" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "payout_docs_user_upload" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "payout_docs_user_read_own" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "payout_docs_admin_all" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "payment_proofs_user_upload" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "payment_proofs_user_read_own" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "payment_proofs_admin_all" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "profile_images_public_read" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "profile_images_user_manage" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "proof_images_public_read" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "proof_images_user_upload" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "proof_images_admin_all" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "proof_of_work_user_upload" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "proof_of_work_user_read_own" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "proof_of_work_admin_all" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "storefront_assets_public_read" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "storefront_assets_user_manage" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "order_proofs_user_upload" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "order_proofs_user_read_own" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "order_proofs_admin_all" ON storage.objects';
END $$;

-- =============================================
-- ADMIN-MEDIA: Public read, admins can manage
-- =============================================
CREATE POLICY "admin_media_public_read" ON storage.objects FOR SELECT
USING (bucket_id = 'admin-media');

CREATE POLICY "admin_media_admin_all" ON storage.objects FOR ALL
USING (bucket_id = 'admin-media' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- =============================================
-- PRODUCT-MEDIA: Public read, admins can manage
-- =============================================
CREATE POLICY "product_media_public_read" ON storage.objects FOR SELECT
USING (bucket_id = 'product-media');

CREATE POLICY "product_media_admin_all" ON storage.objects FOR ALL
USING (bucket_id = 'product-media' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- =============================================
-- KYC-DOCUMENTS: Users upload to their folder, admins can read all
-- =============================================
CREATE POLICY "kyc_user_upload" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "kyc_user_read_own" ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "kyc_admin_all" ON storage.objects FOR ALL
USING (bucket_id = 'kyc-documents' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- =============================================
-- BRANDING: Public read, admins can manage
-- =============================================
CREATE POLICY "branding_public_read" ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "branding_admin_all" ON storage.objects FOR ALL
USING (bucket_id = 'branding' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- =============================================
-- VIDEOS: Public read, admins can manage
-- =============================================
CREATE POLICY "videos_public_read" ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "videos_admin_all" ON storage.objects FOR ALL
USING (bucket_id = 'videos' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- =============================================
-- PAYOUT-DOCUMENTS: Users upload to their folder, admins can read all
-- =============================================
CREATE POLICY "payout_docs_user_upload" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payout-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "payout_docs_user_read_own" ON storage.objects FOR SELECT
USING (bucket_id = 'payout-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "payout_docs_admin_all" ON storage.objects FOR ALL
USING (bucket_id = 'payout-documents' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- =============================================
-- PAYMENT-PROOFS: Users upload to their folder, admins can read all
-- =============================================
CREATE POLICY "payment_proofs_user_upload" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "payment_proofs_user_read_own" ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "payment_proofs_admin_all" ON storage.objects FOR ALL
USING (bucket_id = 'payment-proofs' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- =============================================
-- PROFILE-IMAGES: Public read, users can manage their own folder
-- =============================================
CREATE POLICY "profile_images_public_read" ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

CREATE POLICY "profile_images_user_manage" ON storage.objects FOR ALL
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- PROOF-IMAGES: Public read, users can upload to their folder
-- =============================================
CREATE POLICY "proof_images_public_read" ON storage.objects FOR SELECT
USING (bucket_id = 'proof-images');

CREATE POLICY "proof_images_user_upload" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'proof-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "proof_images_admin_all" ON storage.objects FOR ALL
USING (bucket_id = 'proof-images' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- =============================================
-- PROOF-OF-WORK: Users upload to their folder, admins can read all
-- =============================================
CREATE POLICY "proof_of_work_user_upload" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'proof-of-work' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "proof_of_work_user_read_own" ON storage.objects FOR SELECT
USING (bucket_id = 'proof-of-work' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "proof_of_work_admin_all" ON storage.objects FOR ALL
USING (bucket_id = 'proof-of-work' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- =============================================
-- STOREFRONT-ASSETS: Public read, users can manage their own folder
-- =============================================
CREATE POLICY "storefront_assets_public_read" ON storage.objects FOR SELECT
USING (bucket_id = 'storefront-assets');

CREATE POLICY "storefront_assets_user_manage" ON storage.objects FOR ALL
USING (bucket_id = 'storefront-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- ORDER-PROOFS: Users upload to their folder, admins can read all
-- =============================================
CREATE POLICY "order_proofs_user_upload" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'order-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "order_proofs_user_read_own" ON storage.objects FOR SELECT
USING (bucket_id = 'order-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "order_proofs_admin_all" ON storage.objects FOR ALL
USING (bucket_id = 'order-proofs' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- =============================================
-- END OF SCHEMA
-- =============================================
