import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProductMedia {
  id: string;
  product_id: string;
  media_type: 'image' | 'video';
  url: string;
  sort_order: number;
  alt_text: string | null;
  created_at: string;
  updated_at: string;
}

export const useProductMedia = (productId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mediaQuery = useQuery({
    queryKey: ['product-media', productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from('product_media')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ProductMedia[];
    },
    enabled: !!productId,
  });

  const addMediaMutation = useMutation({
    mutationFn: async (media: {
      product_id: string;
      media_type: 'image' | 'video';
      url: string;
      sort_order?: number;
      alt_text?: string;
    }) => {
      // Get max sort order
      const { data: existing } = await supabase
        .from('product_media')
        .select('sort_order')
        .eq('product_id', media.product_id)
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxOrder = existing?.[0]?.sort_order ?? -1;

      const { data, error } = await supabase
        .from('product_media')
        .insert([{
          product_id: media.product_id,
          media_type: media.media_type,
          url: media.url,
          sort_order: media.sort_order ?? maxOrder + 1,
          alt_text: media.alt_text || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-media'] });
      toast({
        title: 'Media Added',
        description: 'Media has been added to the product.',
      });
    },
    onError: (error) => {
      console.error('Error adding media:', error);
      toast({
        title: 'Error',
        description: 'Failed to add media. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateMediaMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductMedia> & { id: string }) => {
      const { error } = await supabase
        .from('product_media')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-media'] });
    },
    onError: (error) => {
      console.error('Error updating media:', error);
      toast({
        title: 'Error',
        description: 'Failed to update media.',
        variant: 'destructive',
      });
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: async (id: string) => {
      // Get media URL to delete from storage
      const { data: media } = await supabase
        .from('product_media')
        .select('url')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('product_media')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Try to delete from storage if it's a supabase storage URL
      if (media?.url?.includes('product-media')) {
        const pathMatch = media.url.match(/product-media\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from('product-media').remove([pathMatch[1]]);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-media'] });
      toast({
        title: 'Media Removed',
        description: 'Media has been removed from the product.',
      });
    },
    onError: (error) => {
      console.error('Error deleting media:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete media.',
        variant: 'destructive',
      });
    },
  });

  const reorderMediaMutation = useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      // Update all items in parallel
      await Promise.all(
        items.map(({ id, sort_order }) =>
          supabase
            .from('product_media')
            .update({ sort_order })
            .eq('id', id)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-media'] });
    },
    onError: (error) => {
      console.error('Error reordering media:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder media.',
        variant: 'destructive',
      });
    },
  });

  const uploadMedia = async (
    productId: string,
    file: File,
    mediaType: 'image' | 'video'
  ): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('product-media')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('product-media')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  return {
    media: mediaQuery.data || [],
    isLoading: mediaQuery.isLoading,
    error: mediaQuery.error,
    refetch: mediaQuery.refetch,
    addMedia: addMediaMutation.mutateAsync,
    isAddingMedia: addMediaMutation.isPending,
    updateMedia: updateMediaMutation.mutate,
    isUpdatingMedia: updateMediaMutation.isPending,
    deleteMedia: deleteMediaMutation.mutate,
    isDeletingMedia: deleteMediaMutation.isPending,
    reorderMedia: reorderMediaMutation.mutate,
    isReordering: reorderMediaMutation.isPending,
    uploadMedia,
  };
};