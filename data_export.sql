-- ============================================
-- DROPSHIP DATA EXPORT
-- Generated: 2026-01-18
-- Version: 2.1.0
-- Run this AFTER DATABASE_SCHEMA.sql
-- ============================================

-- ============================================
-- IMPORTANT: AUTH USERS SETUP
-- ============================================
-- You need to manually create these users in your new Supabase project:
--
-- 1. Admin User:
--    Email: admin@dropship.com
--    Password: Admin@123 (or your preferred password)
--    After creation, note the user_id from auth.users
--
-- 2. Regular User:
--    Email: john@gmail.com
--    Password: (set your preferred password)
--    After creation, note the user_id from auth.users
--
-- Then update the UUIDs below with the new user_ids from your Supabase project

-- ============================================
-- PLACEHOLDER USER IDs (UPDATE THESE!)
-- ============================================
-- Replace these with actual user_ids from your new Supabase auth.users table:
-- 
-- OLD admin user_id: 86e78021-5953-4a85-abe6-b993fc593a77
-- OLD john user_id:  bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b
--
-- After creating users in Supabase Auth, run:
-- SELECT id, email FROM auth.users;
-- Then use find/replace in this file to update the UUIDs

-- ============================================
-- PROFILES
-- ============================================
INSERT INTO public.profiles (id, user_id, name, email, user_status, user_level, wallet_balance, commission_override, is_active, storefront_name, storefront_slug, storefront_banner, created_at, updated_at)
VALUES
  -- Admin Profile
  ('564cbe33-52c3-4318-b158-60abb9cd8e5e', '86e78021-5953-4a85-abe6-b993fc593a77', 'Super Admin', 'admin@dropship.com', 'approved', 'bronze', 0.00, NULL, true, NULL, NULL, 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=400&fit=crop', '2025-12-21 23:52:07.2579+00', '2025-12-22 00:48:25.815021+00'),
  -- John Profile
  ('585503d4-7394-48d2-81fb-ee9aa458dca5', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b', 'John', 'john@gmail.com', 'approved', 'gold', 3.60, 5, true, 'NEW STORE', 'new-store', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=400&fit=crop', '2025-12-29 11:55:59.323164+00', '2026-01-01 18:20:54.781803+00')
ON CONFLICT (user_id) DO UPDATE SET
  name = EXCLUDED.name,
  user_status = EXCLUDED.user_status,
  user_level = EXCLUDED.user_level,
  wallet_balance = EXCLUDED.wallet_balance,
  commission_override = EXCLUDED.commission_override,
  storefront_name = EXCLUDED.storefront_name,
  storefront_slug = EXCLUDED.storefront_slug;

-- ============================================
-- USER ROLES
-- ============================================
INSERT INTO public.user_roles (id, user_id, role, created_at)
VALUES
  ('04a19342-f016-4ef3-bcdd-f28ae08a7400', '86e78021-5953-4a85-abe6-b993fc593a77', 'admin', '2025-12-21 23:52:07.2579+00'),
  ('33333087-1e50-4858-b4ed-77726f06d969', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b', 'user', '2025-12-29 11:55:59.323164+00')
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- ============================================
-- PRODUCTS
-- ============================================
INSERT INTO public.products (id, name, description, category, sku, base_price, stock, image_url, is_active, created_at, updated_at)
VALUES
  ('6cbb8bc3-4c89-422b-8a5e-026a55e1a611', 'Premium Wireless Headphones', 'High-quality wireless headphones with noise cancellation and 30-hour battery life.', 'Electronics', 'WH-001', 89.99, 150, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', true, '2025-12-21 22:59:02.790585+00', '2025-12-21 22:59:02.790585+00'),
  
  ('586a9550-1356-4c4e-aab7-418610df8134', 'Smart Fitness Watch', 'Track your health and fitness with this advanced smartwatch featuring heart rate monitoring.', 'Electronics', 'SW-002', 149.99, 75, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', true, '2025-12-21 22:59:02.790585+00', '2025-12-21 22:59:02.790585+00'),
  
  ('b7eafbda-8b5b-4d74-a737-4076b7a52b35', 'Leather Laptop Bag', 'Genuine leather laptop bag with multiple compartments and padded protection.', 'Accessories', 'LB-003', 79.99, 200, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', true, '2025-12-21 22:59:02.790585+00', '2025-12-21 22:59:02.790585+00'),
  
  ('39175c80-1410-47d6-b6df-acbc70fb2b0f', 'Organic Coffee Blend', 'Premium organic coffee beans sourced from sustainable farms.', 'Food & Beverage', 'CB-004', 24.99, 500, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop', true, '2025-12-21 22:59:02.790585+00', '2025-12-21 22:59:02.790585+00'),
  
  ('dea80adf-66ee-45ab-a0cb-36cfb475cffb', 'Minimalist Desk Lamp', 'Modern LED desk lamp with adjustable brightness and color temperature.', 'Home & Office', 'DL-005', 45.99, 120, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop', true, '2025-12-21 22:59:02.790585+00', '2025-12-21 22:59:02.790585+00'),
  
  ('2b8af66c-e5fd-47ab-b9b8-d7689ab16ca2', 'Yoga Mat Pro', 'Extra thick, non-slip yoga mat perfect for all types of exercises.', 'Sports & Fitness', 'YM-006', 34.99, 300, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', true, '2025-12-21 22:59:02.790585+00', '2025-12-21 22:59:02.790585+00'),
  
  ('fa7e7914-01b7-4977-b942-654d17ae1ccc', '32 Inch Monitor', '32-inch 4K (3840 x 2160) QD-OLED gaming monitor with 240 Hz refresh rate and 0.03 ms (GTG) response time for immersive gaming. Highly efficient custom heatsink, advanced airflow design, and graphene film for better heat management to reduce the risk of burn-in.', NULL, '\', 120.00, 1000, 'https://m.media-amazon.com/images/I/91t16+g29KL._AC_SX679_.jpg', true, '2025-12-22 00:19:06.535193+00', '2025-12-22 00:19:55.234919+00')
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price,
  stock = EXCLUDED.stock,
  image_url = EXCLUDED.image_url;

-- ============================================
-- STOREFRONT PRODUCTS
-- ============================================
INSERT INTO public.storefront_products (id, user_id, product_id, selling_price, custom_description, is_active, created_at, updated_at)
VALUES
  ('27335c9a-dc25-45b2-9ab2-e19104ecf020', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b', 'fa7e7914-01b7-4977-b942-654d17ae1ccc', 156.00, NULL, true, '2025-12-29 13:56:21.255231+00', '2025-12-29 13:56:21.255231+00'),
  ('878151cd-648a-4ee7-8138-dfad2bb8519f', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b', '586a9550-1356-4c4e-aab7-418610df8134', 194.99, NULL, true, '2025-12-29 13:56:27.123741+00', '2025-12-29 13:56:27.123741+00')
ON CONFLICT (user_id, product_id) DO UPDATE SET
  selling_price = EXCLUDED.selling_price,
  is_active = EXCLUDED.is_active;

-- ============================================
-- ORDERS
-- ============================================
-- Note: order_number is auto-generated, so we insert without it and let trigger handle it
-- Or we can insert with explicit order_number

INSERT INTO public.orders (id, order_number, storefront_product_id, dropshipper_user_id, customer_name, customer_email, customer_phone, customer_address, quantity, selling_price, base_price, status, payment_link, payment_link_clicked_at, payment_link_updated_by, payment_link_updated_at, paid_at, completed_at, created_at, updated_at)
VALUES
  ('a53edcbe-9e8e-47a2-bbfa-ee46e258f140', 'ORD-463875', '27335c9a-dc25-45b2-9ab2-e19104ecf020', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b', 'Leo', 'Leo@gmail.com', '1234567890', '123 LEO Street 23658', 1, 156.00, 120.00, 'completed', 'https://lovable.dev/', NULL, '86e78021-5953-4a85-abe6-b993fc593a77', '2026-01-01 18:19:37.474+00', NULL, '2026-01-01 18:20:58.721+00', '2026-01-01 18:18:06.792296+00', '2026-01-01 18:20:54.272722+00'),
  
  ('68b782af-8184-4b62-ad6a-971d6446b122', 'ORD-388618', '878151cd-648a-4ee7-8138-dfad2bb8519f', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b', 'LEO', 'LEO@gmail.com', '1236547899', '12555 assfagvfavbfabvdfab', 1, 194.99, 149.99, 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-30 17:36:39.112061+00', '2025-12-30 17:36:39.112061+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- KYC SUBMISSIONS
-- ============================================
INSERT INTO public.kyc_submissions (id, user_id, first_name, last_name, date_of_birth, aadhaar_number, pan_number, aadhaar_front_url, aadhaar_back_url, pan_document_url, bank_statement_url, face_image_url, status, rejection_reason, submitted_at, reviewed_at, reviewed_by, created_at, updated_at)
VALUES
  ('1caa6dd5-d9c9-41cf-a834-4c6c878f47f1', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b', 'John', 'F', '1998-05-01', '123456789987', 'HNXXK5438H', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b/aadhaar_front_1767009499632', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b/aadhaar_back_1767009499632', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b/pan_1767009499632', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b/bank_statement_1767009499632', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b/face_image_1767009499632', 'approved', NULL, '2025-12-29 11:58:22.744+00', '2025-12-29 11:58:38.861+00', '86e78021-5953-4a85-abe6-b993fc593a77', '2025-12-29 11:58:22.939548+00', '2025-12-29 11:58:39.025461+00')
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- PLATFORM SETTINGS
-- ============================================
INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('display_currencies', '["USD","EUR","GBP","INR","AUD","CAD","JPY","CNY","AED","SGD"]', 'Available currencies for display'),
  ('site_logo_url', 'https://nkfignkivmdemrrzwvsl.supabase.co/storage/v1/object/public/branding/logo-1767124496085.png', 'URL of the website logo'),
  ('site_name', 'Dropshipping', 'Name of the website displayed in header and title'),
  ('landing_page_enabled', 'true', 'Enable or disable the public landing page'),
  ('landing_page_title', 'Welcome to Our Platform', 'Title for the landing page'),
  ('landing_page_subtitle', 'Join our dropshipping network and start earning today', 'Subtitle for the landing page'),
  ('commission_rate', '100', 'Commission rate (percentage of profit or fixed amount in cents)'),
  ('min_payout_amount', '50', 'Minimum wallet balance required for payout requests (in dollars)'),
  ('commission_type', 'percentage', 'Commission calculation type: percentage or fixed'),
  ('auto_user_approval', 'false', 'Automatically approve new users'),
  ('payment_gateway_razorpay_key_id', '', 'Razorpay Key ID'),
  ('payment_gateway_razorpay_key_secret', '', 'Razorpay Key Secret'),
  ('payment_gateway_stripe_publishable_key', '', 'Stripe Publishable Key'),
  ('payment_gateway_stripe_secret_key', '', 'Stripe Secret Key'),
  ('payment_gateway_payu_enabled', 'false', 'Enable PayU payment gateway'),
  ('payment_gateway_payu_merchant_key', '', 'PayU Merchant Key'),
  ('payment_gateway_payu_merchant_salt', '', 'PayU Merchant Salt'),
  ('payment_gateway_phonepe_enabled', 'false', 'Enable PhonePe payment gateway'),
  ('payment_gateway_phonepe_merchant_id', '', 'PhonePe Merchant ID'),
  ('payment_gateway_phonepe_salt_key', '', 'PhonePe Salt Key'),
  ('payment_gateway_phonepe_salt_index', '', 'PhonePe Salt Index'),
  ('payment_gateway_paytm_enabled', 'false', 'Enable Paytm payment gateway'),
  ('payment_gateway_paytm_merchant_id', '', 'Paytm Merchant ID'),
  ('payment_gateway_paytm_merchant_key', '', 'Paytm Merchant Key')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- ============================================
-- CHAT MESSAGES
-- ============================================
INSERT INTO public.chat_messages (id, user_id, sender_role, message, is_read, created_at)
VALUES
  ('54645c79-bc33-4b34-adfa-e6317dff92f4', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b', 'user', 'HII', true, '2025-12-30 17:32:03.186315+00'),
  ('4d4b620f-e2b0-4692-9f51-0df5560c06a0', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b', 'user', 'Frgh', true, '2026-01-01 19:01:15.199258+00'),
  ('1a75b9a4-d78d-4d7a-87db-a37de6d66e59', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b', 'admin', 'hiii', true, '2026-01-01 19:01:38.159175+00'),
  ('4634e6d7-f0bf-4192-b1c2-6578829ae942', 'bc62d1eb-9dbc-4fc5-b75e-e20d6cfd360b', 'user', 'Yvyfyvyg', true, '2026-01-01 19:01:45.657308+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE BUCKETS SETUP
-- ============================================
-- After importing data, you need to:
-- 1. Create storage buckets in your new Supabase project:
--    - kyc-documents (private)
--    - branding (public)  
--    - videos (public)
--
-- 2. Download and re-upload any files from the old storage buckets
--    - Logo and branding images
--    - KYC documents
--    - Video files
--
-- 3. Update the site_logo_url in platform_settings with your new Supabase URL

-- ============================================
-- AUTH TRIGGER SETUP
-- ============================================
-- Run this in your new Supabase SQL Editor to create the auth trigger:

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- POST-IMPORT CHECKLIST
-- ============================================
-- [ ] Create users in Supabase Auth Dashboard
-- [ ] Update user_ids in this file with new UUIDs
-- [ ] Run database_schema.sql first
-- [ ] Run this data_export.sql file
-- [ ] Create storage buckets
-- [ ] Upload files to storage buckets
-- [ ] Update site_logo_url with new URL
-- [ ] Test login with admin@dropship.com
-- [ ] Verify all data is imported correctly
