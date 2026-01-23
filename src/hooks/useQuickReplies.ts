import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QuickReply {
  id: string;
  title: string;
  message: string;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useQuickReplies = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quickReplies = [], isLoading } = useQuery({
    queryKey: ['quick-replies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_chat_quick_replies')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;
      return data as QuickReply[];
    },
  });

  const addQuickReply = useMutation({
    mutationFn: async (reply: { title: string; message: string; category?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('order_chat_quick_replies')
        .insert({
          title: reply.title,
          message: reply.message,
          category: reply.category || 'general',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      toast({ title: 'Quick reply added successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add quick reply',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateQuickReply = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QuickReply> & { id: string }) => {
      const { data, error } = await supabase
        .from('order_chat_quick_replies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      toast({ title: 'Quick reply updated' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update quick reply',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteQuickReply = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('order_chat_quick_replies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
      toast({ title: 'Quick reply deleted' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete quick reply',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const categories = [...new Set(quickReplies.map((r) => r.category))];

  return {
    quickReplies,
    isLoading,
    categories,
    addQuickReply: addQuickReply.mutate,
    updateQuickReply: updateQuickReply.mutate,
    deleteQuickReply: deleteQuickReply.mutate,
    isAdding: addQuickReply.isPending,
    isUpdating: updateQuickReply.isPending,
    isDeleting: deleteQuickReply.isPending,
  };
};
