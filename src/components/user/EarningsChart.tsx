import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { TrendingUp } from 'lucide-react';

interface Order {
  id: string;
  selling_price: number;
  quantity: number;
  created_at: string;
  status: string;
}

interface EarningsChartProps {
  orders: Order[];
  currencySymbol: string;
}

export const EarningsChart: React.FC<EarningsChartProps> = ({ orders, currencySymbol }) => {
  const chartData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return {
        date: format(date, 'MMM dd'),
        fullDate: date,
        earnings: 0,
        orders: 0,
      };
    });

    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const dayIndex = last30Days.findIndex(day => {
        const start = startOfDay(day.fullDate);
        const end = endOfDay(day.fullDate);
        return orderDate >= start && orderDate <= end;
      });

      if (dayIndex !== -1) {
        last30Days[dayIndex].earnings += order.selling_price * order.quantity;
        last30Days[dayIndex].orders += 1;
      }
    });

    return last30Days.map(({ date, earnings, orders }) => ({
      date,
      earnings: parseFloat(earnings.toFixed(2)),
      orders,
    }));
  }, [orders]);

  const totalEarnings = chartData.reduce((sum, day) => sum + day.earnings, 0);

  return (
    <div className="dashboard-card trading-glow space-y-4">
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent -mx-4 -mt-4 mb-4 px-4 py-3 rounded-t-xl border-b border-primary/10">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Earnings Trend</h2>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Last 30 Days</p>
          <p className="text-lg font-bold text-foreground">{currencySymbol}{totalEarnings.toFixed(2)}</p>
        </div>
      </div>
      
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <filter id="earningsGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${currencySymbol}${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Earnings']}
            />
            <Area
              type="monotone"
              dataKey="earnings"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorEarnings)"
              filter="url(#earningsGlow)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
