import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

export interface OrderChatMessage {
  id: string;
  order_id: string;
  sender_type: 'user' | 'customer' | 'system';
  sender_user_id: string | null;
  admin_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface OrderCustomerName {
  id: string;
  order_id: string;
  indian_name_id: string;
  assigned_at: string;
  indian_name?: {
    id: string;
    name: string;
  };
}

export const useOrderChat = (orderId: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settingsMap } = usePlatformSettings();

  // Fetch messages for the order
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['order-chat-messages', orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await supabase
        .from('order_chat_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as OrderChatMessage[];
    },
    enabled: !!orderId && !!user?.id,
  });

  // Fetch assigned customer name for the order
  const { data: customerName, isLoading: isLoadingCustomerName } = useQuery({
    queryKey: ['order-customer-name', orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from('order_customer_names')
        .select(`
          *,
          indian_name:indian_names(id, name)
        `)
        .eq('order_id', orderId)
        .maybeSingle();

      if (error) throw error;
      return data as OrderCustomerName | null;
    },
    enabled: !!orderId && !!user?.id,
  });

  // Assign a random customer name if not already assigned
  const assignCustomerNameMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error('No order ID');

      // Check if already assigned
      const { data: existing } = await supabase
        .from('order_customer_names')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (existing) return existing;

      // Get a random active Indian name
      const { data: names, error: namesError } = await supabase
        .from('indian_names')
        .select('id')
        .eq('is_active', true);

      if (namesError) throw namesError;
      if (!names || names.length === 0) throw new Error('No Indian names available');

      const randomName = names[Math.floor(Math.random() * names.length)];

      const { data, error } = await supabase
        .from('order_customer_names')
        .insert({
          order_id: orderId,
          indian_name_id: randomName.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-customer-name', orderId] });
    },
  });

  // Send message as user
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!orderId || !user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('order_chat_messages')
        .insert({
          order_id: orderId,
          sender_type: 'user',
          sender_user_id: user.id,
          message,
        })
        .select()
        .single();

      if (error) throw error;

      // Get order info and user profile for email notification
      const [orderRes, profileRes] = await Promise.all([
        supabase.from('orders').select('order_number').eq('id', orderId).single(),
        supabase.from('profiles').select('name, email').eq('user_id', user.id).single(),
      ]);

      // Send email notification to admin
      if (orderRes.data && profileRes.data) {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'order_chat_to_admin',
            orderNumber: orderRes.data.order_number,
            userName: profileRes.data.name,
            userEmail: profileRes.data.email,
            message: message.substring(0, 500),
          },
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-chat-messages', orderId] });
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
      if (!orderId) return;

      const { error } = await supabase
        .from('order_chat_messages')
        .update({ is_read: true })
        .eq('order_id', orderId)
        .eq('sender_type', 'customer')
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-chat-messages', orderId] });
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!orderId || !user?.id) return;

    const channel = supabase
      .channel(`order-chat-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_chat_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['order-chat-messages', orderId] });
          
          const newMessage = payload.new as OrderChatMessage;
          if (newMessage.sender_type === 'customer') {
            // Play sound if enabled
            if (settingsMap.notification_sound_enabled) {
              const notificationSound = new Audio('/notification.mp3');
              notificationSound.volume = settingsMap.notification_sound_volume / 100;
              notificationSound.play().catch(() => {});
            }
            
            if (Notification.permission === 'granted') {
              new Notification('New message from customer', {
                body: newMessage.message.substring(0, 100),
                icon: '/favicon.ico',
                tag: `order-chat-${orderId}`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, user?.id, queryClient, settingsMap.notification_sound_enabled, settingsMap.notification_sound_volume]);

  const unreadCount = messages.filter(
    (m) => m.sender_type === 'customer' && !m.is_read
  ).length;

  return {
    messages,
    isLoadingMessages,
    customerName: customerName?.indian_name?.name || 'Customer',
    isLoadingCustomerName,
    unreadCount,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    markAsRead: markAsReadMutation.mutate,
    assignCustomerName: assignCustomerNameMutation.mutate,
  };
};

// Admin hook for order chat
export const useAdminOrderChat = (orderId: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settingsMap } = usePlatformSettings();

  // Fetch messages for the order
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['order-chat-messages', orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await supabase
        .from('order_chat_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as OrderChatMessage[];
    },
    enabled: !!orderId && !!user?.id,
  });

  // Fetch assigned customer name
  const { data: customerName } = useQuery({
    queryKey: ['order-customer-name', orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from('order_customer_names')
        .select(`
          *,
          indian_name:indian_names(id, name)
        `)
        .eq('order_id', orderId)
        .maybeSingle();

      if (error) throw error;
      return data as OrderCustomerName | null;
    },
    enabled: !!orderId && !!user?.id,
  });

  // Fetch dropshipper user info including mobile from KYC
  const { data: dropshipperInfo } = useQuery({
    queryKey: ['order-dropshipper-info', orderId],
    queryFn: async () => {
      if (!orderId) return null;

      // Get order to find dropshipper_user_id
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('dropshipper_user_id' as any)
        .eq('id', orderId)
        .single();

      if (orderError || !order) return null;

      // Get profile and KYC info
      const orderAny = order as any;
      const [profileRes, kycRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('name, email')
          .eq('user_id', orderAny.dropshipper_user_id)
          .single(),
        supabase
          .from('kyc_submissions')
          .select('mobile_number, first_name, last_name')
          .eq('user_id', orderAny.dropshipper_user_id)
          .maybeSingle(),
      ]);

      return {
        name: profileRes.data?.name || 'Unknown',
        email: profileRes.data?.email || '',
        mobileNumber: kycRes.data?.mobile_number || null,
        kycName: kycRes.data ? `${kycRes.data.first_name} ${kycRes.data.last_name}` : null,
      };
    },
    enabled: !!orderId && !!user?.id,
  });

  // Send message as customer (impersonation)
  const sendAsCustomerMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!orderId || !user?.id) throw new Error('Not authenticated');

      // Insert the message
      const { data, error } = await supabase
        .from('order_chat_messages')
        .insert({
          order_id: orderId,
          sender_type: 'customer',
          admin_id: user.id,
          message,
        })
        .select()
        .single();

      if (error) throw error;

      // Log the action for audit
      await supabase.from('order_chat_audit_logs').insert({
        order_id: orderId,
        admin_id: user.id,
        action: 'sent_as_customer',
        message_id: data.id,
        metadata: { message_preview: message.substring(0, 100) },
      });

      // Get order and dropshipper info for email notification
      const { data: orderData } = await supabase
        .from('orders')
        .select('order_number, dropshipper_user_id' as any)
        .eq('id', orderId)
        .single();

      if (orderData) {
        const orderDataAny = orderData as any;
        const { data: dropshipperProfile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('user_id', orderDataAny.dropshipper_user_id)
          .single();

        // Send email notification to dropshipper
        if (dropshipperProfile) {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              type: 'order_chat_to_user',
              orderNumber: orderDataAny.order_number,
              userName: dropshipperProfile.name,
              recipientEmail: dropshipperProfile.email,
              message: message.substring(0, 500),
            },
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-chat-messages', orderId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!orderId || !user?.id) return;

    const channel = supabase
      .channel(`admin-order-chat-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_chat_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['order-chat-messages', orderId] });
          
          const newMessage = payload.new as OrderChatMessage;
          if (newMessage.sender_type === 'user') {
            // Play sound if enabled
            if (settingsMap.notification_sound_enabled) {
              const notificationSound = new Audio('/notification.mp3');
              notificationSound.volume = settingsMap.notification_sound_volume / 100;
              notificationSound.play().catch(() => {});
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, user?.id, queryClient, settingsMap.notification_sound_enabled, settingsMap.notification_sound_volume]);

  return {
    messages,
    isLoadingMessages,
    customerName: customerName?.indian_name?.name || 'Customer',
    dropshipperInfo,
    sendAsCustomer: sendAsCustomerMutation.mutate,
    isSending: sendAsCustomerMutation.isPending,
  };
};
