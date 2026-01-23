import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProductReview {
  id: string;
  product_id: string;
  storefront_product_id: string | null;
  customer_name: string;
  customer_email: string;
  rating: number;
  review_text: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
}

interface SubmitReviewData {
  product_id: string;
  storefront_product_id?: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  review_text?: string;
}

export const useProductReviews = (productId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch approved reviews for a product
  const reviewsQuery = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
        throw error;
      }

      return data as ProductReview[];
    },
    enabled: !!productId,
  });

  // Calculate average rating
  const averageRating = reviewsQuery.data && reviewsQuery.data.length > 0
    ? reviewsQuery.data.reduce((sum, r) => sum + r.rating, 0) / reviewsQuery.data.length
    : 0;

  // Count reviews by rating
  const ratingCounts = reviewsQuery.data?.reduce((acc, review) => {
    acc[review.rating] = (acc[review.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>) || {};

  // Submit a new review
  const submitReviewMutation = useMutation({
    mutationFn: async (data: SubmitReviewData) => {
      const { error } = await supabase
        .from('product_reviews')
        .insert({
          product_id: data.product_id,
          storefront_product_id: data.storefront_product_id || null,
          customer_name: data.customer_name,
          customer_email: data.customer_email,
          rating: data.rating,
          review_text: data.review_text || null,
          is_approved: false, // Reviews require admin approval
          is_verified_purchase: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Review Submitted',
        description: 'Thank you! Your review will be visible after approval.',
      });
      queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
    },
    onError: (error: any) => {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    reviews: reviewsQuery.data || [],
    isLoading: reviewsQuery.isLoading,
    averageRating,
    totalReviews: reviewsQuery.data?.length || 0,
    ratingCounts,
    submitReview: submitReviewMutation.mutate,
    isSubmitting: submitReviewMutation.isPending,
  };
};
