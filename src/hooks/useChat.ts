import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface ChatMessage {
  id: string;
  user_id: string;
  sender_role: 'user' | 'admin';
  message: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export const useChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chat session to check if messages were cleared
  const { data: chatSession } = useQuery({
    queryKey: ['chat-session', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Wait for chatSession to load before fetching messages to ensure proper filtering
  const chatSessionLoaded = chatSession !== undefined;

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat-messages', user?.id, chatSession?.user_messages_cleared_at],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      // Only show messages after the cleared timestamp
      if (chatSession?.user_messages_cleared_at) {
        query = query.gte('created_at', chatSession.user_messages_cleared_at);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!user?.id && chatSessionLoaded,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if this is the first message from the user
      const { data: existingMessages } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('user_id', user.id)
        .eq('sender_role', 'user')
        .limit(1);

      const isFirstMessage = !existingMessages || existingMessages.length === 0;

      // Get user profile for email notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          sender_role: 'user',
          message,
        })
        .select()
        .single();

      if (error) throw error;

      // If first message, send automated welcome message from support
      if (isFirstMessage) {
        // Get platform settings for welcome message
        const { data: welcomeSetting } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'chat_welcome_message')
          .maybeSingle();

        const welcomeMessage = welcomeSetting?.value || 
          'Welcome! Thank you for reaching out. A support agent will be assigned to assist you shortly. Please wait while we connect you with our team.';

        await supabase
          .from('chat_messages')
          .insert({
            user_id: user.id,
            sender_role: 'admin',
            message: welcomeMessage,
          });
      }

      // Send email notification to admin
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'new_chat_message',
            userName: profile?.name || 'User',
            userEmail: profile?.email || '',
            message: message,
            isFirstMessage,
          },
        });
      } catch (emailError) {
        console.error('Failed to send chat notification email:', emailError);
        // Don't fail the message send if email fails
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'], exact: false });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('sender_role', 'admin')
        .eq('is_read', false);

      if (error) throw error;
    },
  });

  // Realtime subscription with notification sound
  useEffect(() => {
    if (!user?.id) return;

    // Create audio for notification sound
    const notificationSound = new Audio('/notification.mp3');
    notificationSound.volume = 0.5;

    const channel = supabase
      .channel('user-chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages'], exact: false });
          
          // Play sound and show browser notification for admin messages
          const newMessage = payload.new as ChatMessage;
          if (newMessage.sender_role === 'admin') {
            // Play notification sound
            notificationSound.play().catch(() => {});
            
            // Show browser push notification
            if (Notification.permission === 'granted') {
              new Notification('Support Reply', {
                body: newMessage.message.substring(0, 100),
                icon: '/favicon.ico',
                tag: 'chat-notification',
              });
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh messages when read status changes (agent read receipts)
          queryClient.invalidateQueries({ queryKey: ['chat-messages'], exact: false });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh session when it changes (e.g., when admin assigns, ends chat)
          queryClient.invalidateQueries({ queryKey: ['chat-session', user.id], exact: false });
          queryClient.invalidateQueries({ queryKey: ['chat-messages', user.id], exact: false });
          queryClient.invalidateQueries({ queryKey: ['assigned-agent', user.id], exact: false });
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
  }, [user?.id, queryClient]);

  // Start new conversation - resets the chat session
  const startNewConversationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // Update chat session to clear the cleared_at timestamp and set status to active
      const { error } = await supabase
        .from('chat_sessions')
        .update({ 
          user_messages_cleared_at: new Date().toISOString(),
          status: 'active'
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-session'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'], exact: false });
    },
  });

  const unreadCount = messages.filter(
    (m) => m.sender_role === 'admin' && !m.is_read
  ).length;

  // Check if chat has ended based on session status
  const isChatEnded = chatSession?.status === 'closed';
  
  // Get close reason with user-friendly label
  const getCloseReasonLabel = (reason: string | null | undefined): string => {
    const reasonLabels: Record<string, string> = {
      resolved: 'Issue Resolved',
      no_response: 'No Response',
      spam: 'Marked as Spam',
      transferred: 'Transferred',
      duplicate: 'Duplicate Conversation',
      other: 'Closed by Support',
    };
    return reason ? reasonLabels[reason] || 'Closed by Support' : 'Closed by Support';
  };

  const closeReason = chatSession?.close_reason as string | null | undefined;
  const closeReasonLabel = getCloseReasonLabel(closeReason);

  return {
    messages,
    isLoading,
    unreadCount,
    isChatEnded,
    closeReasonLabel,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    markAsRead: markAsReadMutation.mutate,
    startNewConversation: startNewConversationMutation.mutate,
    isStartingNewConversation: startNewConversationMutation.isPending,
  };
};
