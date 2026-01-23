import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  category: string | null;
  base_price: number;
  stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useAdminProducts = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }

      return (data || []).map((p): Product => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sku: p.sku,
        category: p.category,
        base_price: Number(p.base_price),
        stock: p.stock,
        image_url: p.image_url,
        is_active: p.is_active,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));
    },
    enabled: user?.role === 'admin' && !!session,
  });

  const addProductMutation = useMutation({
    mutationFn: async (product: {
      name: string;
      description: string;
      sku: string;
      category: string;
      base_price: number;
      stock: number;
      image_url: string | null;
    }): Promise<Product> => {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: product.name,
          description: product.description || null,
          sku: product.sku,
          category: product.category || null,
          base_price: product.base_price,
          stock: product.stock,
          image_url: product.image_url || null,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        sku: data.sku,
        category: data.category,
        base_price: Number(data.base_price),
        stock: data.stock,
        image_url: data.image_url,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Product Added',
        description: 'The new product has been added to the catalog.',
      });
    },
    onError: (error) => {
      console.error('Error adding product:', error);
      toast({
        title: 'Error',
        description: 'Failed to add product. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: Partial<Product> & { id: string }) => {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Product Updated',
        description: 'The product has been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const toggleProductStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      return !isActive;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: newStatus ? 'Product Activated' : 'Product Deactivated',
        description: `The product has been ${newStatus ? 'activated' : 'deactivated'}.`,
      });
    },
    onError: (error) => {
      console.error('Error toggling product status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product status.',
        variant: 'destructive',
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Product Deleted',
        description: 'The product has been deleted from the catalog.',
      });
    },
    onError: (error) => {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product. It may have existing orders.',
        variant: 'destructive',
      });
    },
  });

  const categories = [...new Set(productsQuery.data?.map(p => p.category).filter(Boolean) || [])];

  return {
    products: productsQuery.data || [],
    categories,
    isLoading: productsQuery.isLoading,
    error: productsQuery.error,
    refetch: productsQuery.refetch,
    addProduct: addProductMutation.mutateAsync,
    isAddingProduct: addProductMutation.isPending,
    updateProduct: updateProductMutation.mutate,
    isUpdatingProduct: updateProductMutation.isPending,
    toggleProductStatus: toggleProductStatusMutation.mutate,
    isTogglingStatus: toggleProductStatusMutation.isPending,
    deleteProduct: deleteProductMutation.mutate,
    isDeletingProduct: deleteProductMutation.isPending,
  };
};
