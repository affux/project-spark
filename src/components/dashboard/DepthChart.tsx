import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  selling_price: number;
  quantity: number;
  status: string;
  created_at: string;
}

interface DepthChartProps {
  orders: Order[];
  currencySymbol?: string;
}

interface DepthDataPoint {
  price: number;
  pendingVolume: number;
  completedVolume: number;
  pendingCumulative: number;
  completedCumulative: number;
}

export const DepthChart: React.FC<DepthChartProps> = ({ 
  orders, 
  currencySymbol = '$' 
}) => {
  // Process orders into depth chart data
  const { depthData, stats, midPrice } = useMemo(() => {
    // Separate orders by status
    const pendingOrders = orders.filter(o => 
      ['pending_payment', 'paid_by_user', 'processing'].includes(o.status)
    );
    const completedOrders = orders.filter(o => o.status === 'completed');

    // Get all unique prices and sort them
    const allPrices = [...new Set(orders.map(o => Math.round(o.selling_price / 100) * 100))].sort((a, b) => a - b);
    
    if (allPrices.length === 0) {
      return { depthData: [], stats: { pendingTotal: 0, completedTotal: 0, pendingCount: 0, completedCount: 0 }, midPrice: 0 };
    }

    // Calculate volume at each price level
    const priceVolumes: Record<number, { pending: number; completed: number }> = {};
    
    allPrices.forEach(price => {
      priceVolumes[price] = { pending: 0, completed: 0 };
    });

    pendingOrders.forEach(order => {
      const roundedPrice = Math.round(order.selling_price / 100) * 100;
      if (priceVolumes[roundedPrice]) {
        priceVolumes[roundedPrice].pending += order.selling_price * order.quantity;
      }
    });

    completedOrders.forEach(order => {
      const roundedPrice = Math.round(order.selling_price / 100) * 100;
      if (priceVolumes[roundedPrice]) {
        priceVolumes[roundedPrice].completed += order.selling_price * order.quantity;
      }
    });

    // Calculate cumulative volumes (depth style)
    let pendingCumulative = 0;
    let completedCumulative = 0;

    const depthData: DepthDataPoint[] = allPrices.map(price => {
      pendingCumulative += priceVolumes[price].pending;
      completedCumulative += priceVolumes[price].completed;

      return {
        price,
        pendingVolume: priceVolumes[price].pending,
        completedVolume: priceVolumes[price].completed,
        pendingCumulative,
        completedCumulative,
      };
    });

    // Calculate stats
    const pendingTotal = pendingOrders.reduce((sum, o) => sum + o.selling_price * o.quantity, 0);
    const completedTotal = completedOrders.reduce((sum, o) => sum + o.selling_price * o.quantity, 0);

    // Find mid price (median of all order prices)
    const sortedPrices = orders.map(o => o.selling_price).sort((a, b) => a - b);
    const midPrice = sortedPrices.length > 0 
      ? sortedPrices[Math.floor(sortedPrices.length / 2)] 
      : 0;

    return {
      depthData,
      stats: {
        pendingTotal,
        completedTotal,
        pendingCount: pendingOrders.length,
        completedCount: completedOrders.length,
      },
      midPrice: Math.round(midPrice / 100) * 100,
    };
  }, [orders]);

  const formatPrice = (value: number) => `${currencySymbol}${value.toFixed(0)}`;
  const formatVolume = (value: number) => `${currencySymbol}${(value / 1000).toFixed(1)}K`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="font-semibold text-foreground mb-2">
            Price: {formatPrice(label)}
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-sm text-muted-foreground">Pending:</span>
              <span className="text-sm font-medium text-orange-500">
                {formatVolume(payload[0]?.value || 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Completed:</span>
              <span className="text-sm font-medium text-green-500">
                {formatVolume(payload[1]?.value || 0)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const ratio = stats.completedTotal / (stats.pendingTotal + stats.completedTotal || 1);
  const isHealthy = ratio > 0.5;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden trading-glow">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-orange-500/5 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-500" />
            <span className="font-semibold text-foreground">Order Depth</span>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 text-xs",
              isHealthy ? "border-green-500/50 text-green-500" : "border-orange-500/50 text-orange-500"
            )}
          >
            {isHealthy ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {(ratio * 100).toFixed(0)}% Complete
          </Badge>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-orange-500 font-medium">Pending ({stats.pendingCount})</span>
              <span className="text-muted-foreground">{currencySymbol}{stats.pendingTotal.toFixed(0)}</span>
            </div>
            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${(1 - ratio) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-green-500 font-medium">Completed ({stats.completedCount})</span>
              <span className="text-muted-foreground">{currencySymbol}{stats.completedTotal.toFixed(0)}</span>
            </div>
            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        {depthData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No order data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={depthData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.7} />
                  <stop offset="50%" stopColor="hsl(30, 90%, 50%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(35, 85%, 55%)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.7} />
                  <stop offset="50%" stopColor="hsl(160, 80%, 50%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.05} />
                </linearGradient>
                <filter id="depthGlow">
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <XAxis 
                dataKey="price" 
                tickFormatter={(value) => `${currencySymbol}${value}`}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              {midPrice > 0 && (
                <ReferenceLine 
                  x={midPrice} 
                  stroke="hsl(25, 95%, 53%)" 
                  strokeDasharray="5 5" 
                  strokeWidth={1.5}
                  label={{
                    value: 'Mid',
                    position: 'top',
                    fill: 'hsl(25, 95%, 53%)',
                    fontSize: 10,
                  }}
                />
              )}
              <Area
                type="stepAfter"
                dataKey="pendingCumulative"
                stroke="hsl(25, 95%, 53%)"
                strokeWidth={2}
                fill="url(#pendingGradient)"
                name="Pending"
                filter="url(#depthGlow)"
              />
              <Area
                type="stepAfter"
                dataKey="completedCumulative"
                stroke="hsl(142, 71%, 45%)"
                strokeWidth={2}
                fill="url(#completedGradient)"
                name="Completed"
                filter="url(#depthGlow)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-orange-500 to-orange-400" />
            <span className="text-muted-foreground">Pending Orders</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-green-500 to-green-400" />
            <span className="text-muted-foreground">Completed Orders</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 border-t-2 border-dashed border-primary" />
            <span className="text-muted-foreground">Mid Price</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
