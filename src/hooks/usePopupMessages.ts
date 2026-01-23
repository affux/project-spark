import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PopupMessage {
  id: string;
  title: string | null;
  message: string;
  message_type: string;
  target_type: string;
  target_roles: string[] | null;
  is_enabled: boolean;
  priority: number;
  starts_at: string | null;
  expires_at: string | null;
  re_acknowledgment_mode: string;
  re_ack_period_days: number | null;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  target_user_ids?: string[];
  acknowledgment_count?: number;
}

export interface PopupAcknowledgment {
  id: string;
  message_id: string;
  user_id: string;
  message_version: number;
  acknowledged_at: string;
}

export function usePopupMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  // Fetch all popup messages (admin) or user-targeted messages (user)
  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['popup-messages', user?.id, isAdmin],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      const userRole = roleData?.role || 'user';

      // Fetch all messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('popup_messages')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Fetch targets for each message
      const messagesWithTargets = await Promise.all(
        (messagesData || []).map(async (msg) => {
          const { data: targets } = await supabase
            .from('popup_message_targets')
            .select('user_id')
            .eq('message_id', msg.id);

          // Get acknowledgment count for admin view
          const { count } = await supabase
            .from('popup_acknowledgments')
            .select('*', { count: 'exact', head: true })
            .eq('message_id', msg.id);

          return {
            ...msg,
            target_user_ids: targets?.map(t => t.user_id) || [],
            acknowledgment_count: count || 0
          };
        })
      );

      // For admins, return all messages
      if (isAdmin) {
        return messagesWithTargets;
      }

      // For users, filter based on targeting rules
      const now = new Date();
      return messagesWithTargets.filter(msg => {
        if (!msg.is_enabled) return false;
        
        // Check time constraints
        if (msg.starts_at && new Date(msg.starts_at) > now) return false;
        if (msg.expires_at && new Date(msg.expires_at) < now) return false;

        // Check targeting
        if (msg.target_type === 'all') return true;
        if (msg.target_type === 'specific_users') {
          return msg.target_user_ids?.includes(user.id);
        }
        if (msg.target_type === 'by_role') {
          return msg.target_roles?.includes(userRole);
        }
        return false;
      });
    },
    enabled: !!user?.id
  });

  // Fetch user's acknowledgments
  const { data: acknowledgments = [] } = useQuery({
    queryKey: ['popup-acknowledgments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('popup_acknowledgments')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Get unacknowledged messages for the user
  const unacknowledgedMessages = messages.filter(msg => {
    if (isAdmin) return false; // Don't show popups to admins
    
    const ack = acknowledgments.find(a => a.message_id === msg.id);
    
    if (!ack) return true; // Never acknowledged
    
    // Check re-acknowledgment mode
    if (msg.re_acknowledgment_mode === 'once') {
      return false; // Already acknowledged once
    }
    
    if (msg.re_acknowledgment_mode === 'on_update') {
      return ack.message_version < msg.version; // Show if version changed
    }
    
    if (msg.re_acknowledgment_mode === 'periodic' && msg.re_ack_period_days) {
      const ackDate = new Date(ack.acknowledged_at);
      const periodMs = msg.re_ack_period_days * 24 * 60 * 60 * 1000;
      return new Date().getTime() - ackDate.getTime() > periodMs;
    }
    
    return false;
  });

  // Acknowledge a message
  const acknowledgeMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const message = messages.find(m => m.id === messageId);
      if (!message) throw new Error('Message not found');

      const { error } = await supabase
        .from('popup_acknowledgments')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          message_version: message.version,
          acknowledged_at: new Date().toISOString()
        }, {
          onConflict: 'message_id,user_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popup-acknowledgments'] });
    },
    onError: (error) => {
      console.error('Failed to acknowledge message:', error);
      toast.error('Failed to acknowledge message');
    }
  });

  // Create a new popup message (admin)
  const createMutation = useMutation({
    mutationFn: async (data: Partial<PopupMessage> & { target_user_ids?: string[] }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { target_user_ids, ...messageData } = data;

      const { data: newMessage, error } = await supabase
        .from('popup_messages')
        .insert([{
          title: messageData.title,
          message: messageData.message,
          message_type: messageData.message_type,
          target_type: messageData.target_type,
          target_roles: messageData.target_roles,
          is_enabled: messageData.is_enabled,
          priority: messageData.priority,
          starts_at: messageData.starts_at,
          expires_at: messageData.expires_at,
          re_acknowledgment_mode: messageData.re_acknowledgment_mode,
          re_ack_period_days: messageData.re_ack_period_days,
          version: messageData.version,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Add targets if specific users selected
      if (data.target_type === 'specific_users' && target_user_ids?.length) {
        const targets = target_user_ids.map(userId => ({
          message_id: newMessage.id,
          user_id: userId
        }));

        const { error: targetError } = await supabase
          .from('popup_message_targets')
          .insert(targets);

        if (targetError) throw targetError;
      }

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popup-messages'] });
      toast.success('Popup message created');
    },
    onError: (error) => {
      console.error('Failed to create popup message:', error);
      toast.error('Failed to create popup message');
    }
  });

  // Update a popup message (admin)
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<PopupMessage> & { id: string; target_user_ids?: string[] }) => {
      const { target_user_ids, ...messageData } = data;

      const { error } = await supabase
        .from('popup_messages')
        .update({
          ...messageData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Update targets
      await supabase
        .from('popup_message_targets')
        .delete()
        .eq('message_id', id);

      if (data.target_type === 'specific_users' && target_user_ids?.length) {
        const targets = target_user_ids.map(userId => ({
          message_id: id,
          user_id: userId
        }));

        const { error: targetError } = await supabase
          .from('popup_message_targets')
          .insert(targets);

        if (targetError) throw targetError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popup-messages'] });
      toast.success('Popup message updated');
    },
    onError: (error) => {
      console.error('Failed to update popup message:', error);
      toast.error('Failed to update popup message');
    }
  });

  // Delete a popup message (admin)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('popup_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popup-messages'] });
      toast.success('Popup message deleted');
    },
    onError: (error) => {
      console.error('Failed to delete popup message:', error);
      toast.error('Failed to delete popup message');
    }
  });

  return {
    messages,
    unacknowledgedMessages,
    acknowledgments,
    isLoading,
    refetch,
    acknowledge: acknowledgeMutation.mutate,
    createMessage: createMutation.mutate,
    updateMessage: updateMutation.mutate,
    deleteMessage: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
