import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicStorefrontProduct {
  id: string;
  product_id: string;
  selling_price: number;
  custom_description: string | null;
  is_active: boolean;
  product: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    category: string | null;
    stock: number;
  };
}

export interface StoreOwner {
  user_id: string;
  display_name: string;
  storefront_name: string | null;
  storefront_slug: string | null;
  storefront_banner: string | null;
}

export const usePublicStorefront = (slug: string | undefined) => {
  // Fetch store owner by slug using secure function that only exposes public fields
  const storeQuery = useQuery({
    queryKey: ['public-store', slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .rpc('get_public_storefront_profile', { _slug: slug });

      if (error) {
        console.error('Error fetching store:', error);
        throw error;
      }

      if (!data || data.length === 0) return null;

      // Map the function result to our interface
      const profile = data[0];
      return {
        user_id: profile.user_id,
        display_name: profile.display_name,
        storefront_name: profile.storefront_name,
        storefront_slug: profile.storefront_slug,
        storefront_banner: profile.storefront_banner,
      } as StoreOwner;
    },
    enabled: !!slug,
  });
  // Fetch products for this storefront
  const productsQuery = useQuery({
    queryKey: ['public-storefront-products', storeQuery.data?.user_id],
    queryFn: async () => {
      if (!storeQuery.data?.user_id) return [];

      const { data, error } = await supabase
        .from('storefront_products')
        .select(`
          id,
          product_id,
          selling_price,
          custom_description,
          is_active,
          products!inner(
            id,
            name,
            description,
            image_url,
            category,
            stock
          )
        `)
        .eq('user_id', storeQuery.data.user_id)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching storefront products:', error);
        throw error;
      }

      return (data || []).map((sp): PublicStorefrontProduct => ({
        id: sp.id,
        product_id: sp.product_id,
        selling_price: Number(sp.selling_price),
        custom_description: sp.custom_description,
        is_active: sp.is_active,
        product: {
          id: sp.products.id,
          name: sp.products.name,
          description: sp.products.description,
          image_url: sp.products.image_url,
          category: sp.products.category,
          stock: sp.products.stock,
        },
      }));
    },
    enabled: !!storeQuery.data?.user_id,
  });

  return {
    store: storeQuery.data,
    products: productsQuery.data || [],
    isLoading: storeQuery.isLoading || productsQuery.isLoading,
    isStoreNotFound: !storeQuery.isLoading && !storeQuery.data,
  };
};
