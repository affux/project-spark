import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RecentOrderMessage {
  id: string;
  order_id: string;
  sender_type: 'user' | 'customer' | 'system';
  message: string;
  is_read: boolean;
  created_at: string;
  order_number: string;
}

export const useRecentOrderMessages = (limit: number = 50) => {
  const { user } = useAuth();

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['recent-order-messages', limit],
    queryFn: async () => {
      // Fetch recent messages with order info
      const { data: messagesData, error: messagesError } = await supabase
        .from('order_chat_messages')
        .select('id, order_id, sender_type, message, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (messagesError) throw messagesError;

      if (!messagesData || messagesData.length === 0) return [];

      // Get unique order IDs
      const orderIds = [...new Set(messagesData.map((m) => m.order_id))];

      // Fetch order numbers
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number')
        .in('id', orderIds);

      if (ordersError) throw ordersError;

      const orderMap = new Map(ordersData?.map((o) => [o.id, o.order_number]) || []);

      return messagesData.map((msg): RecentOrderMessage => ({
        id: msg.id,
        order_id: msg.order_id,
        sender_type: msg.sender_type as 'user' | 'customer' | 'system',
        message: msg.message,
        is_read: msg.is_read,
        created_at: msg.created_at,
        order_number: orderMap.get(msg.order_id) || 'Unknown',
      }));
    },
    enabled: !!user?.id && user?.role === 'admin',
    refetchInterval: 30000,
  });

  return {
    messages,
    isLoading,
    refetch,
  };
};
