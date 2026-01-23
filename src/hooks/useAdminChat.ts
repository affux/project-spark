import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import type { ChatMessage } from './useChat';

export interface ChatConversation {
  user_id: string;
  user_name: string;
  user_email: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  indian_name?: string;
  session_status?: string;
  assigned_agent_id?: string | null;
  previous_agent_id?: string | null;
  previous_agent_name?: string;
  close_reason?: string | null;
}

export const useAdminChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all conversations (grouped by user)
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ['admin-chat-conversations'],
    queryFn: async () => {
      // Get all messages grouped by user
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Get unique user IDs
      const userIds = [...new Set(messages.map((m) => m.user_id))];

      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Fetch chat customer names with Indian names
      const { data: customerNames, error: customerNamesError } = await supabase
        .from('chat_customer_names')
        .select(`
          user_id,
          indian_name:indian_names(name)
        `)
        .in('user_id', userIds);

      if (customerNamesError) throw customerNamesError;

      // Fetch chat sessions for status and agent assignment
      const { data: sessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('user_id, status, assigned_agent_id, previous_agent_id, close_reason')
        .in('user_id', userIds);

      if (sessionsError) throw sessionsError;

      // Fetch previous agent names for closed chats
      const previousAgentIds = sessions
        ?.filter(s => s.previous_agent_id && !s.assigned_agent_id)
        .map(s => s.previous_agent_id!)
        .filter((id, index, arr) => arr.indexOf(id) === index) || [];

      let previousAgentNames = new Map<string, string>();
      if (previousAgentIds.length > 0) {
        const { data: agentProfiles } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', previousAgentIds);
        
        previousAgentNames = new Map(agentProfiles?.map(p => [p.user_id, p.name]) || []);
      }

      const profilesMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      const indianNamesMap = new Map(
        customerNames?.map((c) => [c.user_id, (c.indian_name as { name: string } | null)?.name]) || []
      );
      const sessionsMap = new Map(
        sessions?.map((s) => [s.user_id, { 
          status: s.status, 
          assigned_agent_id: s.assigned_agent_id,
          previous_agent_id: s.previous_agent_id,
          previous_agent_name: s.previous_agent_id ? previousAgentNames.get(s.previous_agent_id) : undefined,
          close_reason: s.close_reason,
        }]) || []
      );

      // Group messages by user
      const conversationsMap = new Map<string, ChatConversation>();

      for (const msg of messages) {
        if (!conversationsMap.has(msg.user_id)) {
          const profile = profilesMap.get(msg.user_id);
          const indianName = indianNamesMap.get(msg.user_id);
          const sessionInfo = sessionsMap.get(msg.user_id);
          conversationsMap.set(msg.user_id, {
            user_id: msg.user_id,
            user_name: profile?.name || 'Unknown User',
            user_email: profile?.email || '',
            last_message: msg.message,
            last_message_at: msg.created_at,
            unread_count: msg.sender_role === 'user' && !msg.is_read ? 1 : 0,
            indian_name: indianName,
            session_status: sessionInfo?.status || 'waiting_for_support',
            assigned_agent_id: sessionInfo?.assigned_agent_id,
            previous_agent_id: sessionInfo?.previous_agent_id,
            previous_agent_name: sessionInfo?.previous_agent_name,
            close_reason: sessionInfo?.close_reason,
          });
        } else if (msg.sender_role === 'user' && !msg.is_read) {
          const conv = conversationsMap.get(msg.user_id)!;
          conv.unread_count++;
        }
      }

      return Array.from(conversationsMap.values()).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    },
  });

  // Fetch messages for a specific user
  const fetchUserMessages = async (userId: string): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as ChatMessage[];
  };

  // Send message as admin (does NOT auto-assign agent - admin must manually assign)
  const sendMessageMutation = useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get user profile for email notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', userId)
        .single();

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          sender_role: 'admin',
          message,
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification to user
      if (profile?.email) {
        try {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              type: 'admin_chat_message',
              userName: profile.name || 'User',
              userEmail: profile.email,
              message: message,
              recipientEmail: profile.email,
            },
          });
        } catch (emailError) {
          console.error('Failed to send admin reply notification email:', emailError);
          // Don't fail the message send if email fails
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-agent', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['chat-session', variables.userId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mark user messages as read with read_at timestamp
  const markAsReadMutation = useMutation({
    mutationFn: async (userId: string) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true, read_at: now })
        .eq('user_id', userId)
        .eq('sender_role', 'user')
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: (_data, userId) => {
      // Refresh both list + thread so UI and user-side realtime can reflect "Seen"
      queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-messages', userId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to mark as read',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Realtime subscription for new messages with notification sound
  useEffect(() => {
    // Create audio for notification sound
    const notificationSound = new Audio('/notification.mp3');
    notificationSound.volume = 0.5;

    const channel = supabase
      .channel('admin-chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
          queryClient.invalidateQueries({ queryKey: ['admin-chat-messages'] });

          // Play sound and show browser notification for user messages to admin
          const newMessage = payload.new as ChatMessage;
          if (newMessage.sender_role === 'user') {
            // Play notification sound
            notificationSound.play().catch(() => {});
            
            // Show browser push notification
            if (Notification.permission === 'granted') {
              new Notification('New Support Message', {
                body: newMessage.message.substring(0, 100),
                icon: '/favicon.ico',
                tag: 'admin-chat-notification',
              });
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission();
            }
          }
        }
      )
      .subscribe();

    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // End chat - mark messages as cleared for user (admin can still see all messages)
  const endChatMutation = useMutation({
    mutationFn: async ({ userId, endMessage, closeReason }: { userId: string; endMessage: string; closeReason: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get user profile for email notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', userId)
        .single();

      // Update or create chat session with cleared timestamp for user
      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('id, assigned_agent_id')
        .eq('user_id', userId)
        .maybeSingle();

      const previousAgentId = existingSession?.assigned_agent_id;

      if (existingSession) {
        // Update existing session - unassign agent when ending chat
        const { error: sessionError } = await supabase
          .from('chat_sessions')
          .update({ 
            user_messages_cleared_at: new Date().toISOString(),
            status: 'closed',
            close_reason: closeReason,
            assigned_agent_id: null, // Unassign agent when chat ends
            previous_agent_id: previousAgentId, // Store previous agent for reference
          })
          .eq('user_id', userId);

        if (sessionError) throw sessionError;
      } else {
        // Create new session with cleared timestamp
        const { error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: userId,
            user_messages_cleared_at: new Date().toISOString(),
            status: 'closed',
            close_reason: closeReason,
            assigned_agent_id: null,
          });

        if (sessionError) throw sessionError;
      }

      // Decrement the previous agent's active chat count
      if (previousAgentId) {
        const { data: presenceData } = await supabase
          .from('support_agent_presence')
          .select('active_chat_count')
          .eq('user_id', previousAgentId)
          .single();

        if (presenceData && presenceData.active_chat_count > 0) {
          await supabase
            .from('support_agent_presence')
            .update({
              active_chat_count: presenceData.active_chat_count - 1,
            })
            .eq('user_id', previousAgentId);
        }
      }

      // Send the end message
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          sender_role: 'admin',
          message: endMessage,
        });

      if (messageError) throw messageError;

      // Also remove the assigned chat name
      await supabase
        .from('chat_customer_names')
        .delete()
        .eq('user_id', userId);

      // Send email notification to user about chat ending
      if (profile?.email) {
        try {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              type: 'chat_ended',
              userName: profile.name || 'User',
              userEmail: profile.email,
              message: endMessage,
              recipientEmail: profile.email,
            },
          });
        } catch (emailError) {
          console.error('Failed to send chat end notification email:', emailError);
        }
      }

      return { userId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-customer-name'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['chat-session', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['chat-customer-name', variables.userId] });
      toast({
        title: 'Chat Ended',
        description: 'The chat has been ended for the user.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to end chat',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Manual agent assignment - admin assigns themselves to a chat
  const assignToMeMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No active session');

      const response = await supabase.functions.invoke('chat-reassignment', {
        body: {
          action: 'manual_assign',
          user_id: userId,
          target_agent_id: user.id,
          admin_id: user.id,
          trigger_reason: 'admin_manual_assignment',
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-customer-name'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-agent', userId] });
      queryClient.invalidateQueries({ queryKey: ['chat-session', userId] });
      toast({
        title: 'Assigned to You',
        description: 'You are now assigned to this chat.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to assign',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Unassign from chat
  const unassignMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No active session');

      const response = await supabase.functions.invoke('chat-reassignment', {
        body: {
          action: 'manual_unassign',
          user_id: userId,
          admin_id: user.id,
          trigger_reason: 'admin_manual_unassignment',
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-customer-name'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-agent', userId] });
      queryClient.invalidateQueries({ queryKey: ['chat-session', userId] });
      toast({
        title: 'Unassigned',
        description: 'You are no longer assigned to this chat.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to unassign',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return {
    conversations,
    isLoadingConversations,
    totalUnread,
    fetchUserMessages,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    markAsRead: markAsReadMutation.mutate,
    endChat: endChatMutation.mutate,
    isEndingChat: endChatMutation.isPending,
    assignToMe: assignToMeMutation.mutate,
    isAssigning: assignToMeMutation.isPending,
    unassign: unassignMutation.mutate,
    isUnassigning: unassignMutation.isPending,
  };
};
