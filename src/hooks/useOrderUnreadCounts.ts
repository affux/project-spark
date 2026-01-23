import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export const useOrderUnreadCounts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unreadCounts = {}, isLoading } = useQuery({
    queryKey: ['order-unread-counts'],
    queryFn: async () => {
      // Fetch all unread messages grouped by order_id for user messages (admin sees user messages)
      const { data, error } = await supabase
        .from('order_chat_messages')
        .select('order_id')
        .eq('sender_type', 'user')
        .eq('is_read', false);

      if (error) throw error;

      // Count unread messages per order
      const counts: Record<string, number> = {};
      data?.forEach((msg) => {
        counts[msg.order_id] = (counts[msg.order_id] || 0) + 1;
      });

      return counts;
    },
    enabled: !!user?.id && user?.role === 'admin',
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user?.id || user?.role !== 'admin') return;

    const channel = supabase
      .channel('admin-order-unread-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_chat_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['order-unread-counts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role, queryClient]);

  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return {
    unreadCounts,
    totalUnread,
    isLoading,
    getUnreadCount: (orderId: string) => unreadCounts[orderId] || 0,
  };
};
