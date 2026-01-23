import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAdminReassignChatName = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reassignNameMutation = useMutation({
    mutationFn: async ({ userId, indianNameId }: { userId: string; indianNameId: string }) => {
      // Check if user already has an assigned name
      const { data: existing } = await supabase
        .from('chat_customer_names')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update existing assignment
        const { error } = await supabase
          .from('chat_customer_names')
          .update({ indian_name_id: indianNameId, assigned_at: new Date().toISOString() })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('chat_customer_names')
          .insert({ user_id: userId, indian_name_id: indianNameId });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-customer-name'] });
      queryClient.invalidateQueries({ queryKey: ['chat-customer-name'] });
      toast({
        title: 'Name reassigned',
        description: 'The Indian name has been updated for this conversation.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to reassign name',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Bulk assign names to multiple users
  const bulkAssignNamesMutation = useMutation({
    mutationFn: async ({ userIds, indianNameId }: { userIds: string[]; indianNameId: string }) => {
      // Get existing assignments
      const { data: existingAssignments } = await supabase
        .from('chat_customer_names')
        .select('user_id')
        .in('user_id', userIds);

      const existingUserIds = new Set(existingAssignments?.map(a => a.user_id) || []);
      
      // Separate users into those with existing assignments and those without
      const usersToUpdate = userIds.filter(id => existingUserIds.has(id));
      const usersToInsert = userIds.filter(id => !existingUserIds.has(id));

      // Update existing assignments
      if (usersToUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from('chat_customer_names')
          .update({ indian_name_id: indianNameId, assigned_at: new Date().toISOString() })
          .in('user_id', usersToUpdate);

        if (updateError) throw updateError;
      }

      // Insert new assignments
      if (usersToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('chat_customer_names')
          .insert(usersToInsert.map(userId => ({ user_id: userId, indian_name_id: indianNameId })));

        if (insertError) throw insertError;
      }

      return { updated: usersToUpdate.length, inserted: usersToInsert.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-customer-name'] });
      queryClient.invalidateQueries({ queryKey: ['chat-customer-name'] });
      toast({
        title: 'Bulk assignment complete',
        description: `Updated ${data.updated} and assigned ${data.inserted} conversations.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to bulk assign names',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeNameMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('chat_customer_names')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-customer-name'] });
      queryClient.invalidateQueries({ queryKey: ['chat-customer-name'] });
      toast({
        title: 'Name removed',
        description: 'The Indian name assignment has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove name',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    reassignName: reassignNameMutation.mutate,
    isReassigning: reassignNameMutation.isPending,
    bulkAssignNames: bulkAssignNamesMutation.mutate,
    isBulkAssigning: bulkAssignNamesMutation.isPending,
    removeName: removeNameMutation.mutate,
    isRemoving: removeNameMutation.isPending,
  };
};
