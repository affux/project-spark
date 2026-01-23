import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { playNotificationSound } from '@/lib/notificationSound';

export interface UserNotification {
  id: string;
  type: 'order_update' | 'payment_update' | 'payout_update' | 'proof_update';
  title: string;
  description: string;
  created_at: string;
  is_read: boolean;
  reference_id: string;
  status?: string;
}

export const useUserNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const previousUnreadCount = useRef<number>(0);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['user-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const allNotifications: UserNotification[] = [];

      // Fetch recent updates (last 24 hours only)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: orderUpdates } = await (supabase
        .from('order_status_history')
        .select(`
          id,
          new_status,
          created_at,
          order_id,
          orders!inner(
            order_number,
            dropshipper_user_id,
            storefront_products!inner(
              products!inner(name)
            )
          )
        `) as any)
        .eq('orders.dropshipper_user_id', user.id)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch recent crypto payment updates (last 24 hours)
      const { data: paymentUpdates } = await supabase
        .from('crypto_payments')
        .select('id, status, amount, currency_symbol, wallet_name, updated_at, created_at')
        .eq('user_id', user.id)
        .in('status', ['verified', 'rejected'])
        .gte('updated_at', twentyFourHoursAgo)
        .order('updated_at', { ascending: false })
        .limit(20);

      // Fetch pending crypto payments (last 24 hours)
      const { data: pendingPayments } = await supabase
        .from('crypto_payments')
        .select('id, status, amount, currency_symbol, wallet_name, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch in-app notifications from user_notifications table (payouts, proofs, etc.)
      const { data: inAppNotifications } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(50);

      // Process order updates
      orderUpdates?.forEach((update: any) => {
        const productName = update.orders?.storefront_products?.products?.name || 'Product';
        const orderNumber = update.orders?.order_number || 'Order';
        
        let statusLabel = update.new_status;
        switch (update.new_status) {
          case 'pending_payment':
            statusLabel = 'Pending Payment';
            break;
          case 'paid_by_user':
            statusLabel = 'Payment Received';
            break;
          case 'processing':
            statusLabel = 'Processing';
            break;
          case 'completed':
            statusLabel = 'Completed';
            break;
          case 'cancelled':
            statusLabel = 'Cancelled';
            break;
        }

        allNotifications.push({
          id: update.id,
          type: 'order_update',
          title: `Order ${statusLabel}`,
          description: `${orderNumber} - ${productName}`,
          created_at: update.created_at,
          is_read: true, // Order updates don't have read status
          reference_id: update.order_id,
          status: update.new_status,
        });
      });

      // Process payment updates (verified/rejected)
      paymentUpdates?.forEach(payment => {
        const isVerified = payment.status === 'verified';
        allNotifications.push({
          id: payment.id,
          type: 'payment_update',
          title: isVerified ? 'Payment Verified' : 'Payment Rejected',
          description: `${payment.currency_symbol}${payment.amount.toFixed(2)} via ${payment.wallet_name}`,
          created_at: payment.updated_at,
          is_read: true,
          reference_id: payment.id,
          status: payment.status,
        });
      });

      // Process pending payments
      pendingPayments?.forEach(payment => {
        allNotifications.push({
          id: `pending-${payment.id}`,
          type: 'payment_update',
          title: 'Payment Pending Verification',
          description: `${payment.currency_symbol}${payment.amount.toFixed(2)} via ${payment.wallet_name}`,
          created_at: payment.created_at,
          is_read: false,
          reference_id: payment.id,
          status: 'pending',
        });
      });

      // Process in-app notifications (payouts, proofs, etc.)
      inAppNotifications?.forEach((notification: any) => {
        let notificationType: UserNotification['type'] = 'order_update';
        if (notification.entity_type === 'payout') notificationType = 'payout_update';
        else if (notification.entity_type === 'proof') notificationType = 'proof_update';
        else if (notification.entity_type === 'order') notificationType = 'order_update';
        
        allNotifications.push({
          id: notification.id,
          type: notificationType,
          title: notification.title,
          description: notification.message,
          created_at: notification.created_at,
          is_read: notification.is_read,
          reference_id: notification.entity_id || notification.id,
          status: notification.type,
        });
      });

      // Sort all notifications by date
      return allNotifications.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!user?.id,
  });

  // Realtime subscriptions with notification sound
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'order_status_history' 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-notifications', user.id] });
        playNotificationSound();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'crypto_payments',
        filter: `user_id=eq.${user.id}` 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-notifications', user.id] });
        playNotificationSound();
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'user_notifications',
        filter: `user_id=eq.${user.id}` 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-notifications', user.id] });
        playNotificationSound();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      // Mark all unread user_notifications as read
      const { error: notifError } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (notifError) throw notifError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications', user?.id] });
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const orderCount = notifications.filter(n => n.type === 'order_update').length;
  const paymentCount = notifications.filter(n => n.type === 'payment_update').length;
  const payoutCount = notifications.filter(n => n.type === 'payout_update').length;
  const proofCount = notifications.filter(n => n.type === 'proof_update').length;

  return {
    notifications,
    isLoading,
    totalCount: notifications.length,
    unreadCount,
    orderCount,
    paymentCount,
    payoutCount,
    proofCount,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
};
