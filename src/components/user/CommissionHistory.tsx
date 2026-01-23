import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  DollarSign, 
  Package,
  ChevronDown,
  ChevronUp,
  Award
} from 'lucide-react';
import { useUserDashboard } from '@/hooks/useUserDashboard';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { calculateUserLevel } from '@/lib/userLevelUtils';

const levelColors: Record<string, string> = {
  bronze: 'bg-amber-600/10 text-amber-700 border-amber-600/20',
  silver: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  gold: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
};

export const CommissionHistory: React.FC = () => {
  const { orders } = useUserDashboard();
  const { settingsMap } = usePlatformSettings();
  const [timeFilter, setTimeFilter] = useState('all');
  const [showDetails, setShowDetails] = useState(false);

  const currencySymbol = CURRENCY_SYMBOLS[settingsMap.default_currency] || '$';
  
  // Calculate user level based on completed orders
  const completedOrders = orders.filter(o => o.status === 'completed');
  const userLevel = calculateUserLevel(
    completedOrders.length,
    settingsMap.level_threshold_silver,
    settingsMap.level_threshold_gold
  );

  // Filter by time period
  const getFilteredOrders = () => {
    if (timeFilter === 'all') return completedOrders;
    
    const now = new Date();
    let start: Date;
    let end: Date = endOfMonth(now);

    switch (timeFilter) {
      case 'this_month':
        start = startOfMonth(now);
        break;
      case 'last_month':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case 'last_3_months':
        start = startOfMonth(subMonths(now, 2));
        break;
      case 'last_6_months':
        start = startOfMonth(subMonths(now, 5));
        break;
      default:
        return completedOrders;
    }

    return completedOrders.filter(o => {
      const orderDate = new Date(o.completed_at || o.created_at);
      return isWithinInterval(orderDate, { start, end });
    });
  };

  const filteredOrders = getFilteredOrders();

  // Calculate order stats
  const ordersWithStats = filteredOrders.map(order => {
    const profit = (order.selling_price - order.base_price) * order.quantity;
    return {
      ...order,
      profit,
    };
  });

  // Calculate totals
  const totalOrderValue = ordersWithStats.reduce((sum, o) => sum + (o.selling_price * o.quantity), 0);
  const totalProfit = ordersWithStats.reduce((sum, o) => sum + o.profit, 0);

  // Group by month for summary
  const monthlyStats = ordersWithStats.reduce((acc, order) => {
    const month = format(new Date(order.completed_at || order.created_at), 'MMM yyyy');
    if (!acc[month]) {
      acc[month] = { orders: 0, revenue: 0, profit: 0 };
    }
    acc[month].orders += 1;
    acc[month].revenue += order.selling_price * order.quantity;
    acc[month].profit += order.profit;
    return acc;
  }, {} as Record<string, { orders: number; revenue: number; profit: number }>);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Order History</CardTitle>
              <CardDescription>
                Track your completed orders and earnings
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("gap-1", levelColors[userLevel])}>
              <Award className="w-3 h-3" />
              {userLevel.charAt(0).toUpperCase() + userLevel.slice(1)}
            </Badge>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                <SelectItem value="last_6_months">Last 6 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <Package className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{ordersWithStats.length}</p>
            <p className="text-xs text-muted-foreground">Completed Orders</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <DollarSign className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{currencySymbol}{totalOrderValue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/10 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-emerald-600" />
            <p className="text-2xl font-bold text-emerald-600">{currencySymbol}{totalProfit.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Profit</p>
          </div>
        </div>

        {/* Monthly Summary */}
        {Object.keys(monthlyStats).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Monthly Summary</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(monthlyStats)
                .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                .slice(0, 6)
                .map(([month, stats]) => (
                  <div key={month} className="p-3 rounded-lg border bg-background">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{month}</span>
                      <Badge variant="secondary" className="text-xs">{stats.orders} orders</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Revenue:</span>
                      <span>{currencySymbol}{stats.revenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Profit:</span>
                      <span className="text-emerald-600 font-medium">{currencySymbol}{stats.profit.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Detailed Orders */}
        <div>
          <Button
            variant="ghost"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full justify-between"
          >
            <span>Order Details ({ordersWithStats.length})</span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          {showDetails && (
            <div className="mt-3 border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersWithStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No completed orders found for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    ordersWithStats.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(order.completed_at || order.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{order.product?.name}</TableCell>
                        <TableCell className="text-right">
                          {currencySymbol}{(order.selling_price * order.quantity).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald-600">
                          {currencySymbol}{order.profit.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Badge Level Info */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Award className="w-4 h-4" />
            Honor Badges by Level
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className={cn("p-2 rounded text-center", userLevel === 'bronze' && "ring-2 ring-primary")}>
              <Badge className={levelColors.bronze}>Bronze</Badge>
              <p className="mt-1 text-xs text-muted-foreground">0+ orders</p>
            </div>
            <div className={cn("p-2 rounded text-center", userLevel === 'silver' && "ring-2 ring-primary")}>
              <Badge className={levelColors.silver}>Silver</Badge>
              <p className="mt-1 text-xs text-muted-foreground">{settingsMap.level_threshold_silver}+ orders</p>
            </div>
            <div className={cn("p-2 rounded text-center", userLevel === 'gold' && "ring-2 ring-primary")}>
              <Badge className={levelColors.gold}>Gold</Badge>
              <p className="mt-1 text-xs text-muted-foreground">{settingsMap.level_threshold_gold}+ orders</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
