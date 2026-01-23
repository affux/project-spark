import React, { useMemo } from 'react';
import { 
  ComposedChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  BarChart
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { TrendingUp, TrendingDown, CandlestickChart as CandlestickIcon, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  selling_price: number;
  base_price: number;
  quantity: number;
  created_at: string;
  status: string;
}

interface CandleData {
  date: string;
  shortDate: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  isPositive: boolean;
}

interface CandlestickChartProps {
  orders: Order[];
  currencySymbol: string;
  className?: string;
  days?: number;
  showVolume?: boolean;
}

// Custom tooltip for candlestick
const CandlestickTooltip = ({ active, payload, currencySymbol }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload as CandleData;
  const change = data.close - data.open;
  const changePercent = data.open > 0 ? ((change / data.open) * 100).toFixed(2) : '0.00';
  
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-2">{data.date}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">Open:</span>
        <span className="text-foreground font-medium">{currencySymbol}{data.open.toFixed(2)}</span>
        <span className="text-muted-foreground">High:</span>
        <span className="text-green-500 font-medium">{currencySymbol}{data.high.toFixed(2)}</span>
        <span className="text-muted-foreground">Low:</span>
        <span className="text-red-500 font-medium">{currencySymbol}{data.low.toFixed(2)}</span>
        <span className="text-muted-foreground">Close:</span>
        <span className="text-foreground font-medium">{currencySymbol}{data.close.toFixed(2)}</span>
        <span className="text-muted-foreground">Volume:</span>
        <span className="text-foreground font-medium">{data.volume} orders</span>
      </div>
      <div className={cn(
        "mt-2 pt-2 border-t border-border text-sm font-medium",
        data.isPositive ? "text-green-500" : "text-red-500"
      )}>
        {data.isPositive ? '+' : ''}{currencySymbol}{change.toFixed(2)} ({changePercent}%)
      </div>
    </div>
  );
};

// Volume tooltip
const VolumeTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload as CandleData;
  
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{data.date}</p>
      <p className="text-sm font-semibold text-foreground">{data.volume} orders</p>
    </div>
  );
};

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ 
  orders, 
  currencySymbol, 
  className,
  days = 14,
  showVolume = true
}) => {
  const chartData = useMemo(() => {
    const daysArray = Array.from({ length: days }, (_, i) => {
      const date = subDays(new Date(), days - 1 - i);
      return {
        date: format(date, 'MMM dd'),
        shortDate: format(date, 'dd'),
        fullDate: date,
        orders: [] as Order[],
      };
    });

    // Group orders by day
    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const dayIndex = daysArray.findIndex(day => {
        const start = startOfDay(day.fullDate);
        const end = endOfDay(day.fullDate);
        return orderDate >= start && orderDate <= end;
      });

      if (dayIndex !== -1) {
        daysArray[dayIndex].orders.push(order);
      }
    });

    // Calculate OHLC for each day
    let previousClose = 0;
    return daysArray.map((day) => {
      const dayOrders = day.orders.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      if (dayOrders.length === 0) {
        return {
          date: day.date,
          shortDate: day.shortDate,
          open: previousClose,
          close: previousClose,
          high: previousClose,
          low: previousClose,
          volume: 0,
          isPositive: true,
          range: 0,
        };
      }

      const values = dayOrders.map(o => o.selling_price * o.quantity);
      const open = values[0];
      const close = values[values.length - 1];
      const high = Math.max(...values);
      const low = Math.min(...values);
      
      previousClose = close;

      return {
        date: day.date,
        shortDate: day.shortDate,
        open,
        close,
        high,
        low,
        volume: dayOrders.length,
        isPositive: close >= open,
        range: high - low,
      };
    });
  }, [orders, days]);

  const totalVolume = chartData.reduce((sum, d) => sum + d.volume, 0);
  const currentPrice = chartData[chartData.length - 1]?.close || 0;
  const openingPrice = chartData[0]?.open || 0;
  const overallChange = currentPrice - openingPrice;
  const overallChangePercent = openingPrice > 0 ? ((overallChange / openingPrice) * 100) : 0;
  const isOverallPositive = overallChange >= 0;

  const allHigh = Math.max(...chartData.filter(d => d.high > 0).map(d => d.high), 0);
  const allLow = Math.min(...chartData.filter(d => d.low > 0).map(d => d.low), 0);
  const avgPrice = chartData.reduce((sum, d) => sum + (d.close + d.open) / 2, 0) / chartData.length;
  const maxVolume = Math.max(...chartData.map(d => d.volume), 1);

  return (
    <div className={cn(
      "rounded-xl border border-orange-500/20 bg-card/50 backdrop-blur-sm overflow-hidden trading-glow",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-orange-500/10 bg-gradient-to-r from-orange-500/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CandlestickIcon className="h-5 w-5 text-orange-500" />
            <span className="font-semibold text-foreground">Order Value OHLC</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20">
            <span className="text-sm font-medium text-orange-500">{currencySymbol}{currentPrice.toFixed(2)}</span>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            isOverallPositive ? "text-green-500" : "text-red-500"
          )}>
            {isOverallPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isOverallPositive ? '+' : ''}{overallChangePercent.toFixed(2)}% ({days}d)
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{days}d High</p>
            <p className="text-sm font-medium text-green-500">
              {currencySymbol}{allHigh.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{days}d Low</p>
            <p className="text-sm font-medium text-red-500">
              {currencySymbol}{allLow > 0 ? allLow.toFixed(2) : '0.00'}
            </p>
          </div>
        </div>
      </div>

      {/* Candlestick Chart */}
      <div className="p-4 pb-0">
        <div className={cn("h-[240px]", showVolume && "h-[200px]")}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                vertical={false}
                opacity={0.5}
              />
              <XAxis 
                dataKey="shortDate" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                hide={showVolume}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${currencySymbol}${value}`}
                domain={['dataMin - 10', 'dataMax + 10']}
              />
              <ReferenceLine 
                y={avgPrice} 
                stroke="hsl(25, 95%, 53%)" 
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                label={{ 
                  value: 'Avg', 
                  position: 'right',
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 10
                }}
              />
              <Tooltip 
                content={<CandlestickTooltip currencySymbol={currencySymbol} />}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
              />
              {/* Candlestick bodies using Bar */}
              <Bar 
                dataKey="range" 
                barSize={20}
                shape={(props: any) => {
                  const { x, width, payload } = props;
                  if (!payload) return null;

                  const { open, close, high, low, isPositive } = payload;
                  const fillColor = isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)';
                  const strokeColor = isPositive ? 'hsl(142, 71%, 35%)' : 'hsl(0, 84%, 50%)';
                  
                  // Get Y scale from the chart
                  const yAxis = props.yAxis;
                  if (!yAxis) return null;
                  
                  const yScale = (val: number) => {
                    const domain = yAxis.scale.domain();
                    const range = yAxis.scale.range();
                    const ratio = (val - domain[0]) / (domain[1] - domain[0]);
                    return range[0] - ratio * (range[0] - range[1]);
                  };

                  const candleX = x + width * 0.2;
                  const candleWidth = width * 0.6;
                  const wickX = x + width / 2;

                  const highY = yScale(high);
                  const lowY = yScale(low);
                  const openY = yScale(open);
                  const closeY = yScale(close);
                  
                  const bodyTop = Math.min(openY, closeY);
                  const bodyHeight = Math.max(Math.abs(closeY - openY), 2);

                  if (payload.volume === 0) return null;

                  return (
                    <g>
                      {/* Upper wick */}
                      <line
                        x1={wickX}
                        y1={highY}
                        x2={wickX}
                        y2={bodyTop}
                        stroke={strokeColor}
                        strokeWidth={1.5}
                      />
                      {/* Lower wick */}
                      <line
                        x1={wickX}
                        y1={bodyTop + bodyHeight}
                        x2={wickX}
                        y2={lowY}
                        stroke={strokeColor}
                        strokeWidth={1.5}
                      />
                      {/* Candle body */}
                      <rect
                        x={candleX}
                        y={bodyTop}
                        width={candleWidth}
                        height={bodyHeight}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={1}
                        rx={2}
                      />
                    </g>
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volume Chart */}
      {showVolume && (
        <div className="px-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Volume</span>
          </div>
          <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis 
                  dataKey="shortDate" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip content={<VolumeTooltip />} />
                <Bar 
                  dataKey="volume" 
                  radius={[2, 2, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <rect
                      key={`volume-${index}`}
                      fill={entry.isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'}
                      fillOpacity={0.6 + (entry.volume / maxVolume) * 0.4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-4 border-t border-orange-500/10 mt-2 bg-gradient-to-r from-orange-500/5 to-transparent">
        <div className="p-3 text-center border-r border-orange-500/10">
          <p className="text-xs text-muted-foreground">Volume</p>
          <p className="text-sm font-semibold text-foreground">{totalVolume} orders</p>
        </div>
        <div className="p-3 text-center border-r border-orange-500/10">
          <p className="text-xs text-muted-foreground">Open</p>
          <p className="text-sm font-semibold text-foreground">{currencySymbol}{openingPrice.toFixed(2)}</p>
        </div>
        <div className="p-3 text-center border-r border-orange-500/10">
          <p className="text-xs text-muted-foreground">Average</p>
          <p className="text-sm font-semibold text-orange-500">{currencySymbol}{avgPrice.toFixed(2)}</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Change</p>
          <p className={cn(
            "text-sm font-semibold",
            isOverallPositive ? "text-green-500" : "text-red-500"
          )}>
            {isOverallPositive ? '+' : ''}{currencySymbol}{overallChange.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};
