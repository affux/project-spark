import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardMessage {
  id: string;
  title: string | null;
  message: string;
  message_type: 'info' | 'warning' | 'alert';
  is_enabled: boolean;
  show_to_admins: boolean;
  show_to_users: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  target_type: 'all' | 'specific_users' | 'by_role';
  target_roles: string[];
  priority: number;
  target_user_ids?: string[];
}

export interface MessageTarget {
  id: string;
  message_id: string;
  user_id: string;
  created_at: string;
}

export const useDashboardMessages = (isAdmin: boolean = false) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['dashboard-messages', isAdmin, user?.id],
    queryFn: async () => {
      if (isAdmin) {
        // Admin fetches all messages with their targets
        const { data: messagesData, error: messagesError } = await supabase
          .from('dashboard_messages')
          .select('*')
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });

        if (messagesError) throw messagesError;

        // Fetch targets for all messages
        const messageIds = messagesData.map(m => m.id);
        const { data: targetsData, error: targetsError } = await supabase
          .from('dashboard_message_targets')
          .select('*')
          .in('message_id', messageIds);

        if (targetsError) throw targetsError;

        // Map targets to messages
        return messagesData.map(msg => ({
          ...msg,
          target_user_ids: targetsData
            .filter(t => t.message_id === msg.id)
            .map(t => t.user_id),
        })) as DashboardMessage[];
      } else {
        // Users fetch only messages targeted to them
        const currentUserId = user?.id;
        if (!currentUserId) return [];

        // Get user's role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUserId)
          .single();

        const userRole = roleData?.role || 'user';

        // Fetch all enabled messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('dashboard_messages')
          .select('*')
          .eq('is_enabled', true)
          .eq('show_to_users', true)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });

        if (messagesError) throw messagesError;

        // Fetch targets for current user
        const { data: userTargets } = await supabase
          .from('dashboard_message_targets')
          .select('message_id')
          .eq('user_id', currentUserId);

        const targetedMessageIds = new Set(userTargets?.map(t => t.message_id) || []);

        // Filter messages based on targeting rules
        const now = new Date();
        const filteredMessages = messagesData.filter(msg => {
          // Check start date - message not yet active
          if (msg.starts_at && new Date(msg.starts_at) > now) {
            return false;
          }

          // Check expiry
          if (msg.expires_at && new Date(msg.expires_at) < now) {
            return false;
          }

          // Check targeting
          if (msg.target_type === 'all') {
            return true;
          } else if (msg.target_type === 'specific_users') {
            return targetedMessageIds.has(msg.id);
          } else if (msg.target_type === 'by_role') {
            return msg.target_roles?.includes(userRole);
          }
          return false;
        });

        return filteredMessages as DashboardMessage[];
      }
    },
    enabled: isAdmin || !!user?.id,
  });

  const createMessage = useMutation({
    mutationFn: async (newMessage: Omit<Partial<DashboardMessage>, 'id' | 'created_at' | 'updated_at'> & { 
      message: string;
      target_user_ids?: string[];
    }) => {
      const { target_user_ids, ...messageData } = newMessage;

      // Insert message
      const { data: createdMessage, error: messageError } = await supabase
        .from('dashboard_messages')
        .insert([{
          ...messageData,
          target_roles: messageData.target_roles || [],
        }])
        .select()
        .single();

      if (messageError) throw messageError;

      // Insert targets if specific users
      if (newMessage.target_type === 'specific_users' && target_user_ids?.length) {
        const targets = target_user_ids.map(userId => ({
          message_id: createdMessage.id,
          user_id: userId,
        }));

        const { error: targetsError } = await supabase
          .from('dashboard_message_targets')
          .insert(targets);

        if (targetsError) throw targetsError;
      }

      return createdMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-messages'] });
      toast({ title: 'Message created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create message', description: error.message, variant: 'destructive' });
    },
  });

  const updateMessage = useMutation({
    mutationFn: async ({ id, target_user_ids, ...updates }: Partial<DashboardMessage> & { 
      id: string;
      target_user_ids?: string[];
    }) => {
      // Update message
      const { data, error } = await supabase
        .from('dashboard_messages')
        .update({
          ...updates,
          target_roles: updates.target_roles || [],
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update targets if specific users
      if (updates.target_type === 'specific_users') {
        // Delete existing targets
        await supabase
          .from('dashboard_message_targets')
          .delete()
          .eq('message_id', id);

        // Insert new targets
        if (target_user_ids?.length) {
          const targets = target_user_ids.map(userId => ({
            message_id: id,
            user_id: userId,
          }));

          const { error: targetsError } = await supabase
            .from('dashboard_message_targets')
            .insert(targets);

          if (targetsError) throw targetsError;
        }
      } else {
        // Clear targets if not specific users
        await supabase
          .from('dashboard_message_targets')
          .delete()
          .eq('message_id', id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-messages'] });
      toast({ title: 'Message updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update message', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dashboard_messages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-messages'] });
      toast({ title: 'Message deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete message', description: error.message, variant: 'destructive' });
    },
  });

  return {
    messages,
    isLoading,
    refetch,
    createMessage,
    updateMessage,
    deleteMessage,
  };
};
