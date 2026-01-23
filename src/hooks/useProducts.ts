import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  stock: number;
  sku: string;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StorefrontProduct {
  id: string;
  product_id: string;
  user_id: string;
  selling_price: number;
  custom_description: string | null;
  is_active: boolean;
  created_at: string;
  product: Product;
}

export const useProducts = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all available products from main catalog
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }

      return (data || []).map((p): Product => ({
        id: p.id,
        name: p.name,
        description: p.description,
        base_price: Number(p.base_price),
        stock: p.stock,
        sku: p.sku,
        image_url: p.image_url,
        category: p.category,
        is_active: p.is_active,
        created_at: p.created_at,
      }));
    },
    enabled: !!session,
  });

  // Fetch user's storefront products
  const storefrontProductsQuery = useQuery({
    queryKey: ['storefront-products', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('storefront_products')
        .select(`
          *,
          products(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching storefront products:', error);
        throw error;
      }

      return (data || []).map((sp): StorefrontProduct => ({
        id: sp.id,
        product_id: sp.product_id,
        user_id: sp.user_id,
        selling_price: Number(sp.selling_price),
        custom_description: sp.custom_description,
        is_active: sp.is_active,
        created_at: sp.created_at,
        product: {
          id: sp.products.id,
          name: sp.products.name,
          description: sp.products.description,
          base_price: Number(sp.products.base_price),
          stock: sp.products.stock,
          sku: sp.products.sku,
          image_url: sp.products.image_url,
          category: sp.products.category,
          is_active: sp.products.is_active,
          created_at: sp.products.created_at,
        },
      }));
    },
    enabled: !!user?.id && !!session,
  });

  // Add product to storefront
  const addToStorefrontMutation = useMutation({
    mutationFn: async ({
      productId,
      sellingPrice,
      customDescription,
    }: {
      productId: string;
      sellingPrice: number;
      customDescription?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('storefront_products')
        .insert({
          product_id: productId,
          user_id: user.id,
          selling_price: sellingPrice,
          custom_description: customDescription || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-products'] });
      toast({
        title: 'Product Added',
        description: 'Product has been added to your storefront.',
      });
    },
    onError: (error) => {
      console.error('Error adding to storefront:', error);
      toast({
        title: 'Error',
        description: 'Could not add product to storefront.',
        variant: 'destructive',
      });
    },
  });

  // Update storefront product
  const updateStorefrontProductMutation = useMutation({
    mutationFn: async ({
      id,
      sellingPrice,
      customDescription,
      isActive,
    }: {
      id: string;
      sellingPrice?: number;
      customDescription?: string;
      isActive?: boolean;
    }) => {
      const updates: Record<string, unknown> = {};
      if (sellingPrice !== undefined) updates.selling_price = sellingPrice;
      if (customDescription !== undefined) updates.custom_description = customDescription;
      if (isActive !== undefined) updates.is_active = isActive;

      const { error } = await supabase
        .from('storefront_products')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-products'] });
    },
    onError: (error) => {
      console.error('Error updating storefront product:', error);
      toast({
        title: 'Error',
        description: 'Could not update product.',
        variant: 'destructive',
      });
    },
  });

  // Remove from storefront
  const removeFromStorefrontMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('storefront_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-products'] });
      toast({
        title: 'Product Removed',
        description: 'Product has been removed from your storefront.',
      });
    },
    onError: (error) => {
      console.error('Error removing from storefront:', error);
      toast({
        title: 'Error',
        description: 'Could not remove product.',
        variant: 'destructive',
      });
    },
  });

  // Get IDs of products already in storefront
  const storefrontProductIds = new Set(
    storefrontProductsQuery.data?.map(sp => sp.product_id) || []
  );

  // Get unique categories
  const categories = [...new Set(productsQuery.data?.map(p => p.category).filter(Boolean) || [])];

  return {
    products: productsQuery.data || [],
    storefrontProducts: storefrontProductsQuery.data || [],
    storefrontProductIds,
    categories,
    isLoading: productsQuery.isLoading || storefrontProductsQuery.isLoading,
    addToStorefront: addToStorefrontMutation.mutateAsync,
    updateStorefrontProduct: updateStorefrontProductMutation.mutateAsync,
    removeFromStorefront: removeFromStorefrontMutation.mutateAsync,
    isAdding: addToStorefrontMutation.isPending,
  };
};
