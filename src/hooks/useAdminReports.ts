import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay } from 'date-fns';

export interface ReportOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_address: string;
  quantity: number;
  selling_price: number;
  base_price: number;
  status: string;
  created_at: string;
  product_name: string | null;
  dropshipper_name: string | null;
  dropshipper_id: string;
}

export interface ReportStats {
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  averageOrderValue: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
}

export interface DropshipperPerformance {
  user_id: string;
  name: string;
  email: string;
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  completedOrders: number;
}

export interface ProductPerformance {
  product_id: string;
  name: string;
  totalSold: number;
  totalRevenue: number;
  totalOrders: number;
}

export const useAdminReports = (startDate: Date | null, endDate: Date | null) => {
  const { user, session } = useAuth();

  const ordersQuery = useQuery({
    queryKey: ['admin-reports-orders', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          storefront_products!inner(
            product_id,
            user_id,
            products!inner(
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', startOfDay(startDate).toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endOfDay(endDate).toISOString());
      }

      const { data: orders, error } = await query;

      if (error) {
        console.error('Error fetching report orders:', error);
        throw error;
      }

      // Fetch dropshipper profiles
      const dropshipperIds = [...new Set((orders || []).map(o => (o as any).dropshipper_user_id))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', dropshipperIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (orders || []).map((order): ReportOrder => {
        const orderAny = order as any;
        const dropshipper = profileMap.get(orderAny.dropshipper_user_id);
        return {
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          customer_address: order.customer_address,
          quantity: order.quantity,
          selling_price: Number(order.selling_price),
          base_price: Number(order.base_price),
          status: order.status,
          created_at: order.created_at,
          product_name: order.storefront_products?.products?.name || null,
          dropshipper_name: dropshipper?.name || null,
          dropshipper_id: orderAny.dropshipper_user_id,
        };
      });
    },
    enabled: user?.role === 'admin' && !!session,
  });

  // Calculate stats
  const orders = ordersQuery.data || [];
  
  const stats: ReportStats = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.selling_price * o.quantity), 0),
    totalProfit: orders.reduce((sum, o) => sum + ((o.selling_price - o.base_price) * o.quantity), 0),
    averageOrderValue: orders.length > 0 
      ? orders.reduce((sum, o) => sum + (o.selling_price * o.quantity), 0) / orders.length 
      : 0,
    completedOrders: orders.filter(o => o.status === 'completed').length,
    pendingOrders: orders.filter(o => ['pending_payment', 'paid_by_user', 'processing'].includes(o.status)).length,
    cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
  };

  // Dropshipper performance
  const dropshipperMap = new Map<string, DropshipperPerformance>();
  orders.forEach(order => {
    const existing = dropshipperMap.get(order.dropshipper_id);
    if (existing) {
      existing.totalOrders += 1;
      existing.totalRevenue += order.selling_price * order.quantity;
      existing.totalProfit += (order.selling_price - order.base_price) * order.quantity;
      if (order.status === 'completed') existing.completedOrders += 1;
    } else {
      dropshipperMap.set(order.dropshipper_id, {
        user_id: order.dropshipper_id,
        name: order.dropshipper_name || 'Unknown',
        email: '',
        totalOrders: 1,
        totalRevenue: order.selling_price * order.quantity,
        totalProfit: (order.selling_price - order.base_price) * order.quantity,
        completedOrders: order.status === 'completed' ? 1 : 0,
      });
    }
  });
  const dropshipperPerformance = Array.from(dropshipperMap.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Product performance
  const productMap = new Map<string, ProductPerformance>();
  orders.forEach(order => {
    const productId = order.product_name || 'unknown';
    const existing = productMap.get(productId);
    if (existing) {
      existing.totalSold += order.quantity;
      existing.totalRevenue += order.selling_price * order.quantity;
      existing.totalOrders += 1;
    } else {
      productMap.set(productId, {
        product_id: productId,
        name: order.product_name || 'Unknown',
        totalSold: order.quantity,
        totalRevenue: order.selling_price * order.quantity,
        totalOrders: 1,
      });
    }
  });
  const productPerformance = Array.from(productMap.values())
    .sort((a, b) => b.totalSold - a.totalSold);

  return {
    orders,
    stats,
    dropshipperPerformance,
    productPerformance,
    isLoading: ordersQuery.isLoading,
    error: ordersQuery.error,
  };
};
