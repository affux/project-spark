import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StatusHistoryItem {
  id: string;
  order_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_by_type: string;
  notes: string | null;
  created_at: string;
}

export const useOrderStatusHistory = (orderId: string | undefined) => {
  const { data: history, isLoading, refetch } = useQuery({
    queryKey: ['order-status-history', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StatusHistoryItem[];
    },
    enabled: !!orderId,
  });

  return {
    history: history || [],
    isLoading,
    refetch,
  };
};

interface PublicOrderStatus {
  order_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  product_name: string;
}

interface PublicStatusHistory {
  new_status: string;
  created_at: string;
}

export const usePublicOrderTracking = (orderNumber: string | undefined) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-order-tracking', orderNumber],
    queryFn: async () => {
      if (!orderNumber) return null;
      
      // Use secure RPC function that only returns non-sensitive data
      const { data: orderData, error: orderError } = await supabase
        .rpc('get_public_order_status', { p_order_number: orderNumber });
      
      if (orderError) throw orderError;
      if (!orderData || orderData.length === 0) {
        throw new Error('Order not found');
      }
      
      const order = orderData[0] as PublicOrderStatus;
      
      // Fetch status history using secure function
      const { data: historyData, error: historyError } = await supabase
        .rpc('get_public_order_status_history', { p_order_number: orderNumber });
      
      if (historyError) throw historyError;
      
      // Transform history to match expected interface
      const history: StatusHistoryItem[] = (historyData || []).map((h: PublicStatusHistory, index: number) => ({
        id: `${orderNumber}-${index}`,
        order_id: orderNumber,
        old_status: null,
        new_status: h.new_status,
        changed_by: null,
        changed_by_type: 'system',
        notes: null,
        created_at: h.created_at,
      }));
      
      // Construct order object compatible with the UI
      // Note: Sensitive fields are NOT included from the secure function
      return {
        order: {
          order_number: order.order_number,
          status: order.status,
          created_at: order.created_at,
          updated_at: order.updated_at,
          product_name: order.product_name,
          // Placeholder values for fields not exposed by secure function
          customer_name: 'Customer', // Masked - not exposed publicly
          customer_email: '***@***.com', // Masked - not exposed publicly
          paid_at: null,
          completed_at: null,
          quantity: 1,
          selling_price: 0,
          storefront_products: {
            products: {
              name: order.product_name,
              image_url: null
            }
          }
        },
        history,
      };
    },
    enabled: !!orderNumber,
    retry: false,
  });

  return {
    order: data?.order,
    history: data?.history || [],
    isLoading,
    error,
    notFound: error && !isLoading,
  };
};
