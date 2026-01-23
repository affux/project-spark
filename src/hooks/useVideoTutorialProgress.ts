import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TutorialCompletion {
  id: string;
  user_id: string;
  video_id: string;
  completed_at: string;
  created_at: string;
}

export const useVideoTutorialProgress = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: completions = [], isLoading } = useQuery({
    queryKey: ['video-tutorial-completions', user?.id],
    queryFn: async (): Promise<TutorialCompletion[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('video_tutorial_completions')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching tutorial completions:', error);
        throw error;
      }

      return (data || []) as TutorialCompletion[];
    },
    enabled: !!user?.id,
  });

  const markAsWatchedMutation = useMutation({
    mutationFn: async (videoId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('video_tutorial_completions')
        .upsert({
          user_id: user.id,
          video_id: videoId,
          completed_at: new Date().toISOString(),
        } as any, {
          onConflict: 'user_id,video_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-tutorial-completions'] });
      toast({
        title: 'Tutorial completed!',
        description: 'Great job! Keep learning.',
      });
    },
    onError: (error) => {
      console.error('Error marking tutorial as watched:', error);
      toast({
        title: 'Error',
        description: 'Could not mark tutorial as completed.',
        variant: 'destructive',
      });
    },
  });

  const unmarkAsWatchedMutation = useMutation({
    mutationFn: async (videoId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('video_tutorial_completions')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', videoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-tutorial-completions'] });
    },
    onError: (error) => {
      console.error('Error unmarking tutorial:', error);
    },
  });

  const isTutorialWatched = (videoId: string) => {
    return completions.some((c) => c.video_id === videoId);
  };

  const watchedCount = completions.length;

  const getProgress = (totalTutorials: number) => {
    if (totalTutorials === 0) return 0;
    return Math.round((watchedCount / totalTutorials) * 100);
  };

  return {
    completions,
    isLoading,
    isTutorialWatched,
    markAsWatched: markAsWatchedMutation.mutate,
    unmarkAsWatched: unmarkAsWatchedMutation.mutate,
    isMarking: markAsWatchedMutation.isPending,
    watchedCount,
    getProgress,
  };
};
