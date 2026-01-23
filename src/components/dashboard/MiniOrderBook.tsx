import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity,
  Clock,
  TrendingUp,
  Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface OrderBookEntry {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  quantity: number;
  timestamp: Date;
  status: string;
  orderNumber: string;
}

interface MiniOrderBookProps {
  orders: Array<{
    id: string;
    selling_price: number;
    base_price: number;
    quantity: number;
    created_at: string;
    status: string;
    order_number: string;
  }>;
  currencySymbol?: string;
  maxEntries?: number;
  newOrderId?: string | null;
}

export const MiniOrderBook: React.FC<MiniOrderBookProps> = ({ 
  orders, 
  currencySymbol = '$',
  maxEntries = 10,
  newOrderId = null
}) => {
  const [flashingOrderId, setFlashingOrderId] = useState<string | null>(null);
  const [animatedEntries, setAnimatedEntries] = useState<Set<string>>(new Set());

  // Process orders into order book entries
  const orderBookEntries = useMemo<OrderBookEntry[]>(() => {
    return orders
      .slice(0, maxEntries)
      .map(order => ({
        id: order.id,
        type: order.status === 'completed' ? 'sell' as const : 'buy' as const,
        amount: order.selling_price * order.quantity,
        quantity: order.quantity,
        timestamp: new Date(order.created_at),
        status: order.status,
        orderNumber: order.order_number,
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [orders, maxEntries]);

  // Flash effect for new orders
  useEffect(() => {
    if (newOrderId) {
      setFlashingOrderId(newOrderId);
      const timer = setTimeout(() => setFlashingOrderId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [newOrderId]);

  // Animate entries on mount
  useEffect(() => {
    const entries = new Set<string>();
    orderBookEntries.forEach((entry, index) => {
      setTimeout(() => {
        setAnimatedEntries(prev => new Set([...prev, entry.id]));
      }, index * 50);
    });
    return () => entries.clear();
  }, [orderBookEntries]);

  // Calculate totals
  const buyTotal = orderBookEntries
    .filter(e => e.type === 'buy')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const sellTotal = orderBookEntries
    .filter(e => e.type === 'sell')
    .reduce((sum, e) => sum + e.amount, 0);

  const buyCount = orderBookEntries.filter(e => e.type === 'buy').length;
  const sellCount = orderBookEntries.filter(e => e.type === 'sell').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'processing':
        return 'text-blue-500';
      case 'paid_by_user':
        return 'text-yellow-500';
      case 'pending_payment':
        return 'text-orange-500';
      case 'cancelled':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden trading-glow">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-orange-500/5 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-500" />
            <span className="font-semibold text-foreground">Order Book</span>
          </div>
          <Badge variant="outline" className="gap-1 text-xs border-orange-500/30 text-orange-500">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            Live
          </Badge>
        </div>
        
        {/* Summary Bar */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
            <span className="text-muted-foreground">Pending:</span>
            <span className="font-medium text-green-500">{buyCount}</span>
            <span className="text-muted-foreground">({currencySymbol}{buyTotal.toFixed(0)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowDownRight className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-muted-foreground">Completed:</span>
            <span className="font-medium text-blue-500">{sellCount}</span>
            <span className="text-muted-foreground">({currencySymbol}{sellTotal.toFixed(0)})</span>
          </div>
        </div>
      </div>

      {/* Order Book Header */}
      <div className="grid grid-cols-4 gap-2 px-4 py-2 text-xs text-muted-foreground border-b border-border/30 bg-muted/20">
        <span>Time</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Status</span>
      </div>

      {/* Order Entries */}
      <div className="max-h-[300px] overflow-y-auto">
        {orderBookEntries.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No orders yet
          </div>
        ) : (
          orderBookEntries.map((entry, index) => (
            <div
              key={entry.id}
              className={cn(
                "grid grid-cols-4 gap-2 px-4 py-2 text-sm border-b border-border/20 transition-all duration-300",
                "hover:bg-muted/30",
                entry.type === 'buy' 
                  ? 'bg-green-500/5 hover:bg-green-500/10' 
                  : 'bg-blue-500/5 hover:bg-blue-500/10',
                flashingOrderId === entry.id && "animate-pulse bg-primary/20",
                !animatedEntries.has(entry.id) && "opacity-0 translate-x-4",
                animatedEntries.has(entry.id) && "opacity-100 translate-x-0"
              )}
              style={{
                transitionDelay: `${index * 30}ms`
              }}
            >
              {/* Time */}
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">
                  {format(entry.timestamp, 'HH:mm:ss')}
                </span>
              </div>
              
              {/* Amount */}
              <div className="text-right">
                <span className={cn(
                  "font-mono font-medium",
                  entry.type === 'buy' ? 'text-green-500' : 'text-blue-500'
                )}>
                  {entry.type === 'buy' ? '+' : ''}{currencySymbol}{entry.amount.toFixed(2)}
                </span>
              </div>
              
              {/* Quantity */}
              <div className="text-right text-muted-foreground">
                ×{entry.quantity}
              </div>
              
              {/* Status */}
              <div className="text-right">
                <span className={cn("text-xs font-medium", getStatusColor(entry.status))}>
                  {formatStatus(entry.status)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer with Volume */}
      <div className="p-3 border-t border-border/50 bg-muted/10">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Total Volume:</span>
          </div>
          <span className="font-mono font-semibold text-foreground">
            {currencySymbol}{(buyTotal + sellTotal).toFixed(2)}
          </span>
        </div>
      </div>
    </Card>
  );
};
