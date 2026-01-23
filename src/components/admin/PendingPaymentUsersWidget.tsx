import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, User, ExternalLink, Ban, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { usePendingPaymentUsersRealtime, useRealtimeConnection } from '@/hooks/useRealtimeSubscription';
import { format } from 'date-fns';

interface UserWithPendingPayments {
  userId: string;
  userName: string;
  userEmail: string;
  pendingOrderCount: number;
  totalPendingAmount: number;
  oldestPendingDate: string;
  walletBalance: number;
}

export function PendingPaymentUsersWidget() {
  const { settingsMap } = usePlatformSettings();
  const currencySymbol = CURRENCY_SYMBOLS[settingsMap.default_currency] || '$';
  
  // Enable real-time updates
  usePendingPaymentUsersRealtime();
  const { isConnected } = useRealtimeConnection();

  const { data: usersWithPendingPayments, isLoading, error } = useQuery({
    queryKey: ['admin-pending-payment-users'],
    queryFn: async () => {
      // Get all pending payment orders grouped by user
      const { data: pendingOrders, error: ordersError } = await supabase
        .from('orders')
        .select('dropshipper_user_id, selling_price, quantity, created_at' as any)
        .eq('status', 'pending_payment')
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      if (!pendingOrders || pendingOrders.length === 0) {
        return [];
      }

      // Group orders by user
      const userOrderMap = new Map<string, {
        orders: typeof pendingOrders;
        totalAmount: number;
        oldestDate: string;
      }>();

      pendingOrders.forEach((order: any) => {
        const userId = order.dropshipper_user_id;
        const existing = userOrderMap.get(userId);
        const orderAmount = order.selling_price * order.quantity;

        if (existing) {
          existing.orders.push(order);
          existing.totalAmount += orderAmount;
        } else {
          userOrderMap.set(userId, {
            orders: [order],
            totalAmount: orderAmount,
            oldestDate: order.created_at,
          });
        }
      });

      // Get user profiles
      const userIds = Array.from(userOrderMap.keys());
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, wallet_balance')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine data
      const result: UserWithPendingPayments[] = [];
      userOrderMap.forEach((data, userId) => {
        const profile = profiles?.find(p => p.user_id === userId);
        if (profile) {
          result.push({
            userId,
            userName: profile.name,
            userEmail: profile.email,
            pendingOrderCount: data.orders.length,
            totalPendingAmount: data.totalAmount,
            oldestPendingDate: data.oldestDate,
            walletBalance: profile.wallet_balance || 0,
          });
        }
      });

      // Sort by total pending amount descending
      return result.sort((a, b) => b.totalPendingAmount - a.totalPendingAmount);
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card className="border-amber-500/20">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Error Loading Data
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const users = usersWithPendingPayments || [];
  const totalBlockedUsers = users.length;
  const totalPendingAmount = users.reduce((sum, u) => sum + u.totalPendingAmount, 0);

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Ban className="h-4 w-4 text-amber-500" />
            <span>Users Blocked from Payouts</span>
            {isConnected && (
              <span title="Real-time updates active">
                <Wifi className="h-3 w-3 text-emerald-500" />
              </span>
            )}
            {totalBlockedUsers > 0 && (
              <Badge variant="outline" className="ml-2 bg-amber-500/10 text-amber-600 border-amber-500/30">
                {totalBlockedUsers}
              </Badge>
            )}
          </CardTitle>
        </div>
        {totalBlockedUsers > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Total pending payments: {currencySymbol}{totalPendingAmount.toFixed(2)}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No users with pending payments</p>
            <p className="text-xs mt-1">All users can request payouts</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-3 pr-2">
              {users.slice(0, 10).map((user) => (
                <div
                  key={user.userId}
                  className="p-3 rounded-lg bg-background/50 border border-border/50 hover:border-amber-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.userName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.userEmail}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                      {user.pendingOrderCount} order{user.pendingOrderCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        Pending: <span className="font-medium text-amber-600">{currencySymbol}{user.totalPendingAmount.toFixed(2)}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Balance: <span className="font-medium text-foreground">{currencySymbol}{user.walletBalance.toFixed(2)}</span>
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      Since {format(new Date(user.oldestPendingDate), 'MMM d')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        {users.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full mt-3" asChild>
            <Link to="/admin/orders?status=pending_payment">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View All Pending Orders
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
