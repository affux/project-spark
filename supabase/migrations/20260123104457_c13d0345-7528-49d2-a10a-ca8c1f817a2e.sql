-- Create missing storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('videos', 'videos', true),
  ('payout-documents', 'payout-documents', false),
  ('product-media', 'product-media', true),
  ('profile-images', 'profile-images', true),
  ('proof-images', 'proof-images', false),
  ('admin-media', 'admin-media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for videos bucket (public read)
CREATE POLICY "Videos are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'videos');

CREATE POLICY "Admins can upload videos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'videos' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update videos" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'videos' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete videos" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'videos' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS policies for payout-documents bucket (private)
CREATE POLICY "Users can view their own payout documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'payout-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own payout documents" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'payout-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all payout documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'payout-documents' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS policies for product-media bucket (public read)
CREATE POLICY "Product media is publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-media');

CREATE POLICY "Admins can upload product media" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'product-media' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update product media" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'product-media' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete product media" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'product-media' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS policies for profile-images bucket (public read)
CREATE POLICY "Profile images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload their own profile image" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile image" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile image" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for proof-images bucket (private)
CREATE POLICY "Users can view their own proof images" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'proof-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own proof images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'proof-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all proof images" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'proof-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS policies for admin-media bucket (public read)
CREATE POLICY "Admin media is publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'admin-media');

CREATE POLICY "Admins can upload admin media" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'admin-media' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update admin media" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'admin-media' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete admin media" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'admin-media' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);