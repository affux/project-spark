import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { AdminOrder } from '@/hooks/useAdminOrders';
import { DropshipperUser } from '@/hooks/useAdminDashboard';
import { cn } from '@/lib/utils';

interface AnalyticsChartsProps {
  orders: AdminOrder[];
  dropshippers: DropshipperUser[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ orders, dropshippers }) => {
  // Generate last 7 days revenue data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 6 - i));
    const dayOrders = orders.filter(order => {
      const orderDate = startOfDay(new Date(order.created_at));
      return orderDate.getTime() === date.getTime();
    });
    
    const revenue = dayOrders.reduce((sum, order) => sum + (order.base_price * order.quantity), 0);
    const orderCount = dayOrders.length;
    
    return {
      date: format(date, 'MMM d'),
      revenue,
      orders: orderCount,
    };
  });

  // Top dropshippers by order count
  const dropshipperOrderCounts = dropshippers.map(dropshipper => {
    const dropshipperOrders = orders.filter(o => o.dropshipper_user_id === dropshipper.user_id);
    const totalRevenue = dropshipperOrders.reduce((sum, o) => sum + (o.selling_price * o.quantity), 0);
    return {
      name: dropshipper.name.split(' ')[0],
      orders: dropshipperOrders.length,
      revenue: totalRevenue,
    };
  }).sort((a, b) => b.orders - a.orders).slice(0, 5);

  // Order status distribution
  const statusDistribution = [
    { name: 'Pending', value: orders.filter(o => o.status === 'pending_payment').length, color: 'hsl(var(--chart-1))' },
    { name: 'Paid', value: orders.filter(o => o.status === 'paid_by_user').length, color: 'hsl(var(--chart-2))' },
    { name: 'Processing', value: orders.filter(o => o.status === 'processing').length, color: 'hsl(var(--chart-3))' },
    { name: 'Completed', value: orders.filter(o => o.status === 'completed').length, color: 'hsl(var(--chart-4))' },
    { name: 'Cancelled', value: orders.filter(o => o.status === 'cancelled').length, color: 'hsl(var(--chart-5))' },
  ].filter(s => s.value > 0);

  // Product performance
  const productPerformance: Record<string, { name: string; orders: number; revenue: number }> = {};
  orders.forEach(order => {
    const productId = order.product?.id || 'unknown';
    if (!productPerformance[productId]) {
      productPerformance[productId] = {
        name: order.product?.name || 'Unknown',
        orders: 0,
        revenue: 0,
      };
    }
    productPerformance[productId].orders += order.quantity;
    productPerformance[productId].revenue += order.selling_price * order.quantity;
  });
  
  const topProducts = Object.values(productPerformance)
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue Trend */}
      <div className="dashboard-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Revenue Trend (7 Days)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last7Days}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Dropshippers */}
      <div className="dashboard-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Top Dropshippers</h3>
        <div className="h-64">
          {dropshipperOrderCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dropshipperOrderCounts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No dropshipper data available
            </div>
          )}
        </div>
      </div>

      {/* Order Status Distribution */}
      <div className="dashboard-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Order Status</h3>
        <div className="h-64 flex items-center justify-center">
          {statusDistribution.length > 0 ? (
            <div className="flex items-center gap-8 w-full">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusDistribution.map((status, index) => (
                  <div key={status.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-muted-foreground">{status.name}</span>
                    <span className="text-sm font-medium text-foreground ml-auto">{status.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">No orders yet</div>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="dashboard-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Top Products</h3>
        <div className="h-64">
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => value.length > 10 ? value.slice(0, 10) + '...' : value}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="orders" name="Units Sold" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No product data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
