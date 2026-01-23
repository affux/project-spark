import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TradingStatCard } from '@/components/dashboard/TradingStatCard';
import { TradingChart } from '@/components/dashboard/TradingChart';
import { CandlestickChart } from '@/components/dashboard/CandlestickChart';
import { LiveDataCard } from '@/components/dashboard/LiveDataCard';
import { LivePriceTicker } from '@/components/dashboard/LivePriceTicker';
import { MiniOrderBook } from '@/components/dashboard/MiniOrderBook';
import { DepthChart } from '@/components/dashboard/DepthChart';
import { OrdersTableNew } from '@/components/dashboard/OrdersTableNew';
import DashboardMessageBanner from '@/components/dashboard/DashboardMessageBanner';
import { PendingPaymentUsersWidget } from '@/components/admin/PendingPaymentUsersWidget';
import { LoginAttemptsWidget } from '@/components/admin/LoginAttemptsWidget';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useAdminKYC } from '@/hooks/useAdminKYC';
import { useAdminPayouts } from '@/hooks/usePayoutRequests';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { useOrderRealtimeAdmin, usePayoutRealtimeAdmin, useProfileRealtimeAdmin } from '@/hooks/useRealtimeSubscription';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  DollarSign,
  AlertCircle,
  Users as UsersIcon,
  Loader2,
  Shield,
  Wallet,
  TrendingUp,
  Activity,
  ArrowUpRight,
  BarChart3,
  CandlestickChart as CandlestickIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AdminDashboard: React.FC = () => {
  const { toast } = useToast();
  const [chartType, setChartType] = useState<'bar' | 'candlestick'>('bar');
  const { orders, recentOrders, dropshippers, stats, isLoading, refetchOrders } = useAdminDashboard();
  const { kycSubmissions } = useAdminKYC();
  const { pendingCount: pendingPayouts, totalPending: totalPendingPayouts } = useAdminPayouts();
  const { settingsMap } = usePlatformSettings();
  
  // Enable real-time updates with order notifications
  useOrderRealtimeAdmin();
  usePayoutRealtimeAdmin();
  useProfileRealtimeAdmin();
  const { newOrderId } = useOrderNotifications();
  
  const currencySymbol = CURRENCY_SYMBOLS[settingsMap.default_currency] || '$';
  const pendingKYC = kycSubmissions.filter(k => k.status === 'submitted').length;

  // Generate live ticker data
  const tickerItems = useMemo(() => {
    const todayRevenue = orders
      .filter(o => new Date(o.created_at).toDateString() === new Date().toDateString())
      .reduce((sum, o) => sum + o.selling_price * o.quantity, 0);
    
    const yesterdayRevenue = orders
      .filter(o => {
        const orderDate = new Date(o.created_at);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return orderDate.toDateString() === yesterday.toDateString();
      })
      .reduce((sum, o) => sum + o.selling_price * o.quantity, 0);

    const avgOrderValue = orders.length > 0 
      ? orders.reduce((sum, o) => sum + o.selling_price * o.quantity, 0) / orders.length 
      : 0;
    
    const prevAvgOrderValue = orders.length > 1 
      ? orders.slice(0, -1).reduce((sum, o) => sum + o.selling_price * o.quantity, 0) / (orders.length - 1) 
      : avgOrderValue;

    return [
      {
        id: 'revenue',
        label: 'Today Revenue',
        value: todayRevenue,
        previousValue: yesterdayRevenue,
        currencySymbol,
      },
      {
        id: 'total-revenue',
        label: 'Total Revenue',
        value: stats.totalRevenue,
        previousValue: stats.totalRevenue * 0.95,
        currencySymbol,
      },
      {
        id: 'avg-order',
        label: 'Avg Order',
        value: avgOrderValue,
        previousValue: prevAvgOrderValue,
        currencySymbol,
      },
      {
        id: 'pending-payouts',
        label: 'Pending Payouts',
        value: totalPendingPayouts,
        previousValue: totalPendingPayouts,
        currencySymbol,
      },
      {
        id: 'orders-today',
        label: 'Orders Today',
        value: orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length,
        previousValue: orders.filter(o => {
          const orderDate = new Date(o.created_at);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          return orderDate.toDateString() === yesterday.toDateString();
        }).length,
        suffix: '',
      },
    ];
  }, [orders, stats, currencySymbol, totalPendingPayouts]);

  const handleCompleteOrder = async (order: typeof recentOrders[0]) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: 'Order Completed',
        description: `Order ${order.order_number} has been marked as completed.`,
      });
      
      refetchOrders();
    } catch (error) {
      console.error('Complete order error:', error);
      toast({
        title: 'Error',
        description: 'Could not complete order. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Generate sparkline data from recent orders
  const generateSparkline = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return orders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate.toDateString() === date.toDateString();
      }).length;
    });
    return last7Days;
  };

  const orderSparkline = generateSparkline();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <Badge variant="outline" className="gap-1 border-orange-500/30 text-orange-500">
                <Activity className="h-3 w-3" />
                Live
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time overview of your platform
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/users">
                <UsersIcon className="h-4 w-4 mr-2" />
                Users
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/admin/products">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Products
              </Link>
            </Button>
          </div>
        </div>

        {/* Admin Announcement Banner */}
        <DashboardMessageBanner isAdmin className="max-w-4xl mx-auto" />

        {/* Live Price Ticker */}
        <LivePriceTicker items={tickerItems} speed="normal" />

        {/* Stats Grid - Trading Style */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <TradingStatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={ShoppingCart}
            sparkline={orderSparkline}
            delay={0}
          />
          <TradingStatCard
            title="Pending"
            value={stats.pendingOrders}
            icon={Clock}
            variant="warning"
            subtitle={stats.pendingOrders > 0 ? 'Needs attention' : undefined}
            delay={50}
          />
          <TradingStatCard
            title="Completed"
            value={stats.completedOrders}
            icon={CheckCircle}
            variant="success"
            delay={100}
          />
          <TradingStatCard
            title="Revenue"
            value={`${currencySymbol}${stats.totalRevenue.toFixed(0)}`}
            icon={TrendingUp}
            variant="accent"
            trend={{ value: 12.5, isPositive: true }}
            subtitle="vs last week"
            delay={150}
          />
          <TradingStatCard
            title="Pending Pay"
            value={`${currencySymbol}${stats.pendingPayments.toFixed(0)}`}
            icon={AlertCircle}
            variant="warning"
            delay={200}
          />
          <TradingStatCard
            title="Dropshippers"
            value={stats.activeDropshippers}
            icon={UsersIcon}
            delay={250}
          />
          <TradingStatCard
            title="KYC Queue"
            value={pendingKYC}
            icon={Shield}
            variant={pendingKYC > 0 ? 'warning' : 'default'}
            delay={300}
          />
          <TradingStatCard
            title="Payouts"
            value={pendingPayouts}
            icon={Wallet}
            variant={pendingPayouts > 0 ? 'danger' : 'default'}
            delay={350}
          />
        </div>

        {/* Chart Type Toggle */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Revenue Analytics</h2>
          <Tabs value={chartType} onValueChange={(v) => setChartType(v as 'bar' | 'candlestick')}>
            <TabsList className="h-9">
              <TabsTrigger value="bar" className="gap-1.5 text-xs">
                <BarChart3 className="h-3.5 w-3.5" />
                Bar
              </TabsTrigger>
              <TabsTrigger value="candlestick" className="gap-1.5 text-xs">
                <CandlestickIcon className="h-3.5 w-3.5" />
                OHLC
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main Chart */}
        {chartType === 'bar' ? (
          <TradingChart 
            orders={orders.map(o => ({
              id: o.id,
              selling_price: o.selling_price,
              base_price: o.base_price,
              quantity: o.quantity,
              created_at: o.created_at,
              status: o.status
            }))} 
            currencySymbol={currencySymbol} 
          />
        ) : (
          <CandlestickChart 
            orders={orders.map(o => ({
              id: o.id,
              selling_price: o.selling_price,
              base_price: o.base_price,
              quantity: o.quantity,
              created_at: o.created_at,
              status: o.status
            }))} 
            currencySymbol={currencySymbol}
            days={14}
          />
        )}

        {/* Depth Chart */}
        <DepthChart 
          orders={orders.map(o => ({
            id: o.id,
            selling_price: o.selling_price,
            quantity: o.quantity,
            status: o.status,
            created_at: o.created_at,
          }))}
          currencySymbol={currencySymbol}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Recent Orders */}
          <div className="xl:col-span-2">
            <LiveDataCard title="Recent Orders">
              <OrdersTableNew 
                orders={recentOrders} 
                userRole="admin"
                onViewOrder={(order) => console.log('View order:', order.id)}
                onCompleteOrder={handleCompleteOrder}
              />
            </LiveDataCard>
          </div>

          {/* Mini Order Book */}
          <div>
            <MiniOrderBook 
              orders={orders.map(o => ({
                id: o.id,
                selling_price: o.selling_price,
                base_price: o.base_price,
                quantity: o.quantity,
                created_at: o.created_at,
                status: o.status,
                order_number: o.order_number,
              }))}
              currencySymbol={currencySymbol}
              maxEntries={12}
              newOrderId={newOrderId}
            />
          </div>

          {/* Dropshipper Overview & Quick Stats */}
          <div className="space-y-4">
            {/* Login Security Monitor */}
            <LoginAttemptsWidget />

            {/* Pending Payment Users Widget */}
            <PendingPaymentUsersWidget />

            <LiveDataCard title="Top Dropshippers">
              <div className="space-y-3">
                {dropshippers.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No dropshippers yet
                  </p>
                ) : (
                  dropshippers.slice(0, 5).map((dropshipper, index) => (
                    <div 
                      key={dropshipper.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{dropshipper.name}</p>
                          <p className="text-xs text-muted-foreground">{dropshipper.storefront_name || 'No storefront'}</p>
                        </div>
                      </div>
                      <Badge variant={dropshipper.is_active ? 'default' : 'secondary'} className="text-xs">
                        {dropshipper.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
              {dropshippers.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full mt-3" asChild>
                  <Link to="/admin/users">View all dropshippers →</Link>
                </Button>
              )}
            </LiveDataCard>

            {/* Quick Stats */}
            <div className="rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-500/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-orange-500" />
                <span className="font-semibold text-foreground">Pending Payouts</span>
              </div>
              <p className="text-3xl font-bold text-orange-500 mb-1">
                {currencySymbol}{totalPendingPayouts.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                {pendingPayouts} request{pendingPayouts !== 1 ? 's' : ''} waiting
              </p>
              <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                <Link to="/admin/payouts">Process Payouts</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
