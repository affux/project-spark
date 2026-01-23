import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface AdminNotification {
  id: string;
  type: 'kyc_submission' | 'payout_request' | 'order_update';
  title: string;
  description: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
  is_read: boolean;
  reference_id: string;
}

export const useAdminNotifications = () => {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const allNotifications: AdminNotification[] = [];

      // Fetch pending KYC submissions
      const { data: pendingKYC } = await supabase
        .from('kyc_submissions')
        .select('id, user_id, first_name, last_name, submitted_at')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(20);

      // Fetch pending payout requests
      const { data: pendingPayouts } = await supabase
        .from('payout_requests')
        .select('id, user_id, amount, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch recent orders (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, status, created_at, dropshipper_user_id' as any)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(20);

      // Get all unique user IDs
      const userIds = new Set<string>();
      pendingKYC?.forEach(k => userIds.add(k.user_id));
      pendingPayouts?.forEach(p => userIds.add(p.user_id));
      recentOrders?.forEach(o => userIds.add((o as any).dropshipper_user_id));

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', Array.from(userIds));

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Process pending KYC
      pendingKYC?.forEach(kyc => {
        const profile = profilesMap.get(kyc.user_id);
        allNotifications.push({
          id: kyc.id,
          type: 'kyc_submission',
          title: 'KYC Verification Pending',
          description: `${kyc.first_name} ${kyc.last_name} submitted KYC documents`,
          created_at: kyc.submitted_at,
          user_name: profile?.name || `${kyc.first_name} ${kyc.last_name}`,
          user_email: profile?.email || '',
          is_read: false,
          reference_id: kyc.id,
        });
      });

      // Process pending payouts
      pendingPayouts?.forEach(payout => {
        const profile = profilesMap.get(payout.user_id);
        allNotifications.push({
          id: payout.id,
          type: 'payout_request',
          title: 'Payout Request',
          description: `$${payout.amount.toFixed(2)} payout requested`,
          created_at: payout.created_at,
          user_name: profile?.name || 'Unknown User',
          user_email: profile?.email || '',
          is_read: false,
          reference_id: payout.id,
        });
      });

      // Process recent orders
      recentOrders?.forEach((order: any) => {
        const profile = profilesMap.get(order.dropshipper_user_id);
        allNotifications.push({
          id: order.id,
          type: 'order_update',
          title: `Order ${order.status === 'pending_payment' ? 'Pending' : order.status}`,
          description: `${order.order_number} - ${order.customer_name}`,
          created_at: order.created_at,
          user_name: profile?.name || 'Unknown Dropshipper',
          user_email: profile?.email || '',
          is_read: true,
          reference_id: order.id,
        });
      });

      // Sort all notifications by date
      return allNotifications.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kyc_submissions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payout_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const totalCount = notifications.length;
  const kycCount = notifications.filter(n => n.type === 'kyc_submission').length;
  const payoutCount = notifications.filter(n => n.type === 'payout_request').length;
  const orderCount = notifications.filter(n => n.type === 'order_update').length;

  return {
    notifications,
    isLoading,
    totalCount,
    kycCount,
    payoutCount,
    orderCount,
  };
};
