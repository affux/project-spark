import React, { useMemo } from 'react';
import { 
  ComposedChart,
  Bar,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  selling_price: number;
  base_price: number;
  quantity: number;
  created_at: string;
  status: string;
}

interface TradingChartProps {
  orders: Order[];
  currencySymbol: string;
  className?: string;
}

export const TradingChart: React.FC<TradingChartProps> = ({ orders, currencySymbol, className }) => {
  const chartData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      return {
        date: format(date, 'MMM dd'),
        shortDate: format(date, 'dd'),
        fullDate: date,
        revenue: 0,
        profit: 0,
        orders: 0,
        high: 0,
        low: Infinity,
        avg: 0,
      };
    });

    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const dayIndex = last14Days.findIndex(day => {
        const start = startOfDay(day.fullDate);
        const end = endOfDay(day.fullDate);
        return orderDate >= start && orderDate <= end;
      });

      if (dayIndex !== -1) {
        const orderValue = order.selling_price * order.quantity;
        const profit = (order.selling_price - order.base_price) * order.quantity;
        last14Days[dayIndex].revenue += orderValue;
        last14Days[dayIndex].profit += profit;
        last14Days[dayIndex].orders += 1;
        last14Days[dayIndex].high = Math.max(last14Days[dayIndex].high, orderValue);
        if (orderValue > 0) {
          last14Days[dayIndex].low = Math.min(last14Days[dayIndex].low, orderValue);
        }
      }
    });

    return last14Days.map(({ date, shortDate, revenue, profit, orders, high, low }) => ({
      date,
      shortDate,
      revenue: parseFloat(revenue.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      orders,
      high: high > 0 ? high : 0,
      low: low < Infinity ? low : 0,
    }));
  }, [orders]);

  const totalRevenue = chartData.reduce((sum, day) => sum + day.revenue, 0);
  const totalProfit = chartData.reduce((sum, day) => sum + day.profit, 0);
  const avgDaily = totalRevenue / 14;
  
  const weeklyChange = useMemo(() => {
    const thisWeek = chartData.slice(7).reduce((sum, day) => sum + day.revenue, 0);
    const lastWeek = chartData.slice(0, 7).reduce((sum, day) => sum + day.revenue, 0);
    if (lastWeek === 0) return 0;
    return ((thisWeek - lastWeek) / lastWeek * 100);
  }, [chartData]);

  return (
    <div className={cn(
      "rounded-xl border border-orange-500/20 bg-card/50 backdrop-blur-sm overflow-hidden trading-glow",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-orange-500/10 bg-gradient-to-r from-orange-500/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            <span className="font-semibold text-foreground">Revenue</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted">
            <span className="text-sm font-medium text-foreground">{currencySymbol}{totalRevenue.toFixed(2)}</span>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            weeklyChange >= 0 ? "text-green-500" : "text-red-500"
          )}>
            {weeklyChange >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(weeklyChange).toFixed(1)}% (1w)
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">14d High</p>
            <p className="text-sm font-medium text-green-500">
              {currencySymbol}{Math.max(...chartData.map(d => d.revenue)).toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">14d Low</p>
            <p className="text-sm font-medium text-red-500">
              {currencySymbol}{Math.min(...chartData.filter(d => d.revenue > 0).map(d => d.revenue)).toFixed(2) || '0.00'}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tradingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.6} />
                  <stop offset="50%" stopColor="hsl(30, 90%, 50%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(35, 85%, 55%)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="tradingBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(25, 95%, 58%)" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(30, 90%, 45%)" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="profitLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(142, 71%, 45%)" />
                  <stop offset="50%" stopColor="hsl(160, 80%, 50%)" />
                  <stop offset="100%" stopColor="hsl(142, 71%, 45%)" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                vertical={false}
              />
              <XAxis 
                dataKey="shortDate" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${currencySymbol}${value}`}
              />
              <ReferenceLine 
                y={avgDaily} 
                stroke="hsl(25, 95%, 53%)" 
                strokeDasharray="5 5"
                strokeOpacity={0.6}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(25, 50%, 30%)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px -5px hsl(25, 95%, 53% / 0.3)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, name: string) => [
                  `${currencySymbol}${value.toFixed(2)}`, 
                  name === 'revenue' ? 'Revenue' : 'Profit'
                ]}
              />
              <Bar 
                dataKey="revenue" 
                fill="url(#tradingBarGradient)"
                radius={[4, 4, 0, 0]}
                filter="url(#glow)"
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="url(#profitLineGradient)"
                strokeWidth={2.5}
                dot={false}
                filter="url(#glow)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 border-t border-orange-500/10 bg-gradient-to-r from-orange-500/5 to-transparent">
        <div className="p-3 text-center border-r border-orange-500/10">
          <p className="text-xs text-muted-foreground">Total Orders</p>
          <p className="text-sm font-semibold text-foreground">
            {chartData.reduce((sum, d) => sum + d.orders, 0)}
          </p>
        </div>
        <div className="p-3 text-center border-r border-orange-500/10">
          <p className="text-xs text-muted-foreground">Avg Daily</p>
          <p className="text-sm font-semibold text-orange-500">
            {currencySymbol}{avgDaily.toFixed(2)}
          </p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Profit</p>
          <p className="text-sm font-semibold text-green-500">
            {currencySymbol}{totalProfit.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};
