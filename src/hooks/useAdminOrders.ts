import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createUserNotification } from '@/hooks/useUserInAppNotifications';
export interface AdminOrder {
  id: string;
  order_number: string;
  storefront_product_id: string;
  dropshipper_user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_address: string;
  quantity: number;
  selling_price: number;
  base_price: number;
  status: 'pending_payment' | 'paid_by_user' | 'processing' | 'completed' | 'cancelled' | 'postpaid_pending';
  created_at: string;
  paid_at: string | null;
  completed_at: string | null;
  payment_link: string | null;
  payment_link_updated_at: string | null;
  payment_link_updated_by: string | null;
  payment_link_clicked_at: string | null;
  payment_proof_url: string | null;
  product: {
    id: string;
    name: string;
    image_url: string | null;
    base_price: number;
  } | null;
  dropshipper: {
    id: string;
    name: string;
    email: string;
    storefront_name: string | null;
  } | null;
}

export const useAdminOrders = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          storefront_products!inner(
            product_id,
            user_id,
            products!inner(
              id,
              name,
              image_url,
              base_price
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admin orders:', error);
        throw error;
      }

      // Fetch dropshipper profiles for each order
      const dropshipperIds = [...new Set((orders || []).map(o => (o as any).dropshipper_user_id))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', dropshipperIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (orders || []).map((order): AdminOrder => {
        const orderAny = order as any;
        const dropshipper = profileMap.get(orderAny.dropshipper_user_id);
        return {
          id: order.id,
          order_number: order.order_number,
          storefront_product_id: order.storefront_product_id,
          dropshipper_user_id: orderAny.dropshipper_user_id,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          customer_phone: order.customer_phone,
          customer_address: order.customer_address,
          quantity: order.quantity,
          selling_price: Number(order.selling_price),
          base_price: Number(order.base_price),
          status: order.status,
          created_at: order.created_at,
          paid_at: order.paid_at,
          completed_at: order.completed_at,
          payment_link: order.payment_link,
          payment_link_updated_at: order.payment_link_updated_at,
          payment_link_updated_by: order.payment_link_updated_by,
          payment_link_clicked_at: order.payment_link_clicked_at,
          payment_proof_url: order.payment_proof_url,
          product: order.storefront_products?.products ? {
            id: order.storefront_products.products.id,
            name: order.storefront_products.products.name,
            image_url: order.storefront_products.products.image_url,
            base_price: Number(order.storefront_products.products.base_price),
          } : null,
          dropshipper: dropshipper ? {
            id: dropshipper.id,
            name: dropshipper.name,
            email: dropshipper.email,
            storefront_name: dropshipper.storefront_name,
          } : null,
        };
      });
    },
    enabled: user?.role === 'admin' && !!session,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
      order,
    }: {
      orderId: string;
      status: AdminOrder['status'];
      order?: AdminOrder;
    }) => {
      const updates: Record<string, unknown> = { status };
      const previousStatus = order?.status;

      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      // Clear paid_at when reverting to pending_payment or cancelled
      const isMovingFromPaid =
        (status === 'pending_payment' || status === 'cancelled') &&
        previousStatus &&
        ['paid_by_user', 'processing', 'completed'].includes(previousStatus);

      if (isMovingFromPaid) {
        updates.paid_at = null;
        updates.payment_proof_url = null;
      }

      // IMPORTANT:
      // Wallet credit/debit is handled server-side by the orders status trigger
      // (sync_wallet_on_order_status_change). We MUST NOT touch wallet_balance here
      // to avoid double credits/debits on repeated status toggles.

      const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
      if (error) throw error;

      // Send email notification to dropshipper about status change
      if (order?.dropshipper) {
        try {
          const emailType =
            status === 'completed'
              ? 'order_completed_notification'
              : 'order_status_change';

          await supabase.functions.invoke('send-notification-email', {
            body: {
              type: emailType,
              userName: order.dropshipper.name,
              userEmail: order.dropshipper.email,
              orderNumber: order.order_number,
              productName: order.product?.name || 'Product',
              orderStatus: status,
              previousStatus: order.status,
              recipientEmail: order.dropshipper.email,
            },
          });
        } catch (emailError) {
          console.error('Failed to send order status notification:', emailError);
        }

        // Create in-app notification for the dropshipper
        const statusLabels: Record<string, { emoji: string; label: string }> = {
          pending_payment: { emoji: '⏳', label: 'Pending Payment' },
          paid_by_user: { emoji: '💳', label: 'Paid by Customer' },
          processing: { emoji: '🔄', label: 'Processing' },
          completed: { emoji: '✅', label: 'Completed' },
          cancelled: { emoji: '❌', label: 'Cancelled' },
        };
        const statusInfo = statusLabels[status] || { emoji: '📦', label: status };

        await createUserNotification(
          order.dropshipper_user_id,
          `order_${status}`,
          `${statusInfo.emoji} Order ${order.order_number} - ${statusInfo.label}`,
          `Your order for ${order.product?.name || 'Product'} has been updated to ${statusInfo.label.toLowerCase()}.`,
          'order',
          orderId
        );
      }

      return { status };
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['user-dashboard'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['user-profile'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['admin-dropshipper-wallets'], exact: false });

      toast({
        title: 'Order Updated',
        description: `Order status changed to ${variables.status.replace(/_/g, ' ')}.`,
      });
    },
    onError: (error) => {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status.',
        variant: 'destructive',
      });
    },
  });

  const updatePaymentLinkMutation = useMutation({
    mutationFn: async ({ orderId, paymentLink }: { orderId: string; paymentLink: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_link: paymentLink,
          payment_link_updated_at: new Date().toISOString(),
          payment_link_updated_by: user?.id,
        })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: 'Payment Link Updated',
        description: 'The payment link has been saved successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating payment link:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment link.',
        variant: 'destructive',
      });
    },
  });

  const bulkUpdatePaymentLinkMutation = useMutation({
    mutationFn: async ({ orderIds, paymentLink }: { orderIds: string[]; paymentLink: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_link: paymentLink,
          payment_link_updated_at: new Date().toISOString(),
          payment_link_updated_by: user?.id,
        })
        .in('id', orderIds);

      if (error) throw error;
      return orderIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: 'Payment Links Updated',
        description: `Payment link has been applied to ${count} order(s).`,
      });
    },
    onError: (error) => {
      console.error('Error updating payment links:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment links.',
        variant: 'destructive',
      });
    },
  });

  // Create order mutation for admin
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: {
      dropshipper_user_id: string;
      storefront_product_id: string;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
      customer_address: string;
      quantity: number;
      selling_price: number;
      base_price: number;
      productName?: string;
    }) => {
      // Get dropshipper info for notification
      const { data: dropshipperProfile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', orderData.dropshipper_user_id)
        .single();

      const { data, error } = await supabase
        .from('orders')
        .insert({
          dropshipper_user_id: orderData.dropshipper_user_id,
          storefront_product_id: orderData.storefront_product_id,
          customer_name: orderData.customer_name,
          customer_email: orderData.customer_email,
          customer_phone: orderData.customer_phone,
          customer_address: orderData.customer_address,
          quantity: orderData.quantity,
          selling_price: orderData.selling_price,
          base_price: orderData.base_price,
          order_number: '', // Will be generated by trigger
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Send notification email to dropshipper
      if (dropshipperProfile?.email) {
        try {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              type: 'dropshipper_order_created',
              userName: dropshipperProfile.name,
              userEmail: dropshipperProfile.email,
              orderNumber: data.order_number,
              productName: orderData.productName || 'Product',
              customerName: orderData.customer_name,
              amount: orderData.selling_price * orderData.quantity,
              recipientEmail: dropshipperProfile.email,
            },
          });
        } catch (emailError) {
          console.error('Failed to send dropshipper notification:', emailError);
          // Don't fail the order creation if email fails
        }
      }

      // Also send notification to admin about new order
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'admin_new_order',
            userName: dropshipperProfile?.name || 'Dropshipper',
            userEmail: dropshipperProfile?.email || '',
            orderNumber: data.order_number,
            productName: orderData.productName || 'Product',
            customerName: orderData.customer_name,
            amount: orderData.selling_price * orderData.quantity,
          },
        });
      } catch (emailError) {
        console.error('Failed to send admin order notification:', emailError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: 'Order Created',
        description: 'New order has been created and dropshipper has been notified.',
      });
    },
    onError: (error) => {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to create order.',
        variant: 'destructive',
      });
    },
  });

  // Bulk create orders mutation for admin
  const bulkCreateOrderMutation = useMutation({
    mutationFn: async (data: {
      dropshipper_user_id: string;
      orders: Array<{
        storefront_product_id: string;
        customer_name: string;
        customer_email: string;
        customer_phone: string;
        customer_address: string;
        quantity: number;
        selling_price: number;
        base_price: number;
        productName?: string;
      }>;
    }) => {
      // Get dropshipper info for notification
      const { data: dropshipperProfile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', data.dropshipper_user_id)
        .single();

      const ordersToInsert = data.orders.map(order => ({
        dropshipper_user_id: data.dropshipper_user_id,
        storefront_product_id: order.storefront_product_id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        customer_address: order.customer_address,
        quantity: order.quantity,
        selling_price: order.selling_price,
        base_price: order.base_price,
        order_number: '', // Will be generated by trigger
      }));

      const { data: createdOrders, error } = await supabase
        .from('orders')
        .insert(ordersToInsert as any)
        .select();

      if (error) throw error;

      // Send notification email to dropshipper
      if (dropshipperProfile?.email && createdOrders && createdOrders.length > 0) {
        try {
          const totalAmount = data.orders.reduce((sum, o) => sum + o.selling_price * o.quantity, 0);
          await supabase.functions.invoke('send-notification-email', {
            body: {
              type: 'dropshipper_order_created',
              userName: dropshipperProfile.name,
              userEmail: dropshipperProfile.email,
              orderNumber: `${createdOrders.length} orders`,
              productName: `${createdOrders.length} products`,
              customerName: 'Multiple customers',
              amount: totalAmount,
            },
          });
        } catch (emailError) {
          console.error('Failed to send dropshipper notification:', emailError);
        }
      }

      return createdOrders;
    },
    onSuccess: (createdOrders) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: 'Orders Created',
        description: `${createdOrders?.length || 0} orders have been created successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error creating bulk orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to create orders.',
        variant: 'destructive',
      });
    },
  });

  const orderCounts = {
    all: ordersQuery.data?.length || 0,
    pending_payment: ordersQuery.data?.filter(o => o.status === 'pending_payment').length || 0,
    paid_by_user: ordersQuery.data?.filter(o => o.status === 'paid_by_user').length || 0,
    processing: ordersQuery.data?.filter(o => o.status === 'processing').length || 0,
    completed: ordersQuery.data?.filter(o => o.status === 'completed').length || 0,
    cancelled: ordersQuery.data?.filter(o => o.status === 'cancelled').length || 0,
  };

  return {
    orders: ordersQuery.data || [],
    orderCounts,
    isLoading: ordersQuery.isLoading,
    error: ordersQuery.error,
    refetch: ordersQuery.refetch,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    updatePaymentLink: updatePaymentLinkMutation.mutate,
    isUpdatingPaymentLink: updatePaymentLinkMutation.isPending,
    bulkUpdatePaymentLink: bulkUpdatePaymentLinkMutation.mutate,
    isBulkUpdatingPaymentLink: bulkUpdatePaymentLinkMutation.isPending,
    createOrder: createOrderMutation.mutate,
    isCreatingOrder: createOrderMutation.isPending,
    bulkCreateOrders: bulkCreateOrderMutation.mutate,
    isBulkCreatingOrders: bulkCreateOrderMutation.isPending,
  };
};
