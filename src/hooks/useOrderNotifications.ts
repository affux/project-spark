import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { playNotificationSound } from '@/lib/notificationSound';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface OrderNotificationPayload {
  id: string;
  order_number: string;
  selling_price: number;
  quantity: number;
  status: string;
  customer_name: string;
}

export const useOrderNotifications = (
  onNewOrder?: (order: OrderNotificationPayload) => void
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newOrderId, setNewOrderId] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderNotificationPayload[]>([]);

  const handleNewOrder = useCallback((payload: any) => {
    const newOrder = payload.new as OrderNotificationPayload;
    
    // Play notification sound
    playNotificationSound();
    
    // Show toast notification
    toast({
      title: '🛒 New Order Received!',
      description: `Order #${newOrder.order_number} - ₹${(newOrder.selling_price * newOrder.quantity).toFixed(2)}`,
    });
    
    // Flash the new order
    setNewOrderId(newOrder.id);
    setTimeout(() => setNewOrderId(null), 3000);
    
    // Add to recent orders
    setRecentOrders(prev => [newOrder, ...prev.slice(0, 9)]);
    
    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    
    // Call custom handler
    if (onNewOrder) {
      onNewOrder(newOrder);
    }
  }, [onNewOrder, queryClient]);

  const handleOrderUpdate = useCallback((payload: any) => {
    const updatedOrder = payload.new as OrderNotificationPayload;
    const oldOrder = payload.old as OrderNotificationPayload;
    
    // Only notify on status changes
    if (oldOrder.status !== updatedOrder.status) {
      playNotificationSound();
      
      const statusMessages: Record<string, string> = {
        paid_by_user: '💳 Payment Received',
        processing: '📦 Processing Started',
        completed: '✅ Order Completed',
        cancelled: '❌ Order Cancelled',
      };
      
      toast({
        title: statusMessages[updatedOrder.status] || 'Order Updated',
        description: `Order #${updatedOrder.order_number}`,
      });
      
      // Flash the updated order
      setNewOrderId(updatedOrder.id);
      setTimeout(() => setNewOrderId(null), 2000);
    }
    
    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
  }, [queryClient]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const channel = supabase
      .channel('order-notifications-admin')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        handleNewOrder
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        handleOrderUpdate
      )
      .subscribe((status) => {
        console.log('Order notifications subscription:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, handleNewOrder, handleOrderUpdate]);

  return {
    newOrderId,
    recentOrders,
    clearRecentOrders: () => setRecentOrders([]),
  };
};
