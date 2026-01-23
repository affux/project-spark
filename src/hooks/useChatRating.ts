import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ChatRating {
  id: string;
  user_id: string;
  rating: number;
  feedback: string | null;
  created_at: string;
}

export const useChatRating = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the most recent rating (to check if user already rated recently)
  const { data: recentRating, isLoading } = useQuery({
    queryKey: ['chat-rating', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get rating from the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('chat_ratings')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ChatRating | null;
    },
    enabled: !!user?.id,
  });

  // Submit a rating
  const submitRatingMutation = useMutation({
    mutationFn: async ({ rating, feedback }: { rating: number; feedback?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chat_ratings')
        .insert({
          user_id: user.id,
          rating,
          feedback: feedback || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Thank you!',
        description: 'Your feedback helps us improve our support.',
      });
      queryClient.invalidateQueries({ queryKey: ['chat-rating', user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to submit rating',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    recentRating,
    hasRatedRecently: !!recentRating,
    isLoading,
    submitRating: submitRatingMutation.mutate,
    isSubmitting: submitRatingMutation.isPending,
  };
};
