import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

interface Order {
  id: string;
  status: string;
}

interface OrderStatusChartProps {
  orders: Order[];
}

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'hsl(var(--warning))',
  paid_by_user: 'hsl(var(--primary))',
  processing: 'hsl(var(--accent))',
  completed: 'hsl(var(--success))',
  cancelled: 'hsl(var(--destructive))',
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  paid_by_user: 'Paid',
  processing: 'Processing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const OrderStatusChart: React.FC<OrderStatusChartProps> = ({ orders }) => {
  const chartData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    return Object.entries(statusCounts)
      .map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        status,
      }))
      .filter(item => item.value > 0);
  }, [orders]);

  const totalOrders = orders.length;

  if (totalOrders === 0) {
    return (
      <div className="dashboard-card trading-glow space-y-4">
        <div className="flex items-center gap-2 bg-gradient-to-r from-primary/5 to-transparent -mx-4 -mt-4 px-4 py-3 rounded-t-xl border-b border-primary/10">
          <PieChartIcon className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Order Status</h2>
        </div>
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          No orders yet
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card trading-glow space-y-4">
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent -mx-4 -mt-4 mb-4 px-4 py-3 rounded-t-xl border-b border-primary/10">
        <div className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Order Status</h2>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <p className="text-lg font-bold text-foreground">{totalOrders}</p>
        </div>
      </div>
      
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={STATUS_COLORS[entry.status] || 'hsl(var(--muted))'}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number, name: string) => [value, name]}
            />
            <Legend 
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span style={{ color: 'hsl(var(--foreground))', fontSize: '12px' }}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
