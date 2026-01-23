import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TickerItem {
  id: string;
  label: string;
  value: number;
  previousValue: number;
  currencySymbol?: string;
  suffix?: string;
}

interface LivePriceTickerProps {
  items: TickerItem[];
  className?: string;
  speed?: 'slow' | 'normal' | 'fast';
}

const TickerItemDisplay: React.FC<{ item: TickerItem; animate: boolean }> = ({ item, animate }) => {
  const change = item.value - item.previousValue;
  const changePercent = item.previousValue > 0 ? ((change / item.previousValue) * 100) : 0;
  const isPositive = change >= 0;
  const hasChange = change !== 0;

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300",
      animate && hasChange && (isPositive ? "bg-green-500/10" : "bg-red-500/10"),
      "border border-border/30 bg-card/50"
    )}>
      <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
        {item.label}
      </span>
      <div className="flex items-center gap-2">
        <span className={cn(
          "font-mono font-bold text-sm transition-all duration-300",
          animate && hasChange && (isPositive ? "text-green-500" : "text-red-500"),
          !animate && "text-foreground"
        )}>
          {item.currencySymbol}{item.value.toFixed(2)}{item.suffix}
        </span>
        {hasChange && (
          <div className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            isPositive ? "text-green-500" : "text-red-500"
          )}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{isPositive ? '+' : ''}{changePercent.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const LivePriceTicker: React.FC<LivePriceTickerProps> = ({ 
  items, 
  className,
  speed = 'normal' 
}) => {
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const prevItemsRef = useRef<TickerItem[]>(items);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Detect value changes and trigger animations
  useEffect(() => {
    const changedIds = new Set<string>();
    items.forEach((item) => {
      const prevItem = prevItemsRef.current.find(p => p.id === item.id);
      if (prevItem && prevItem.value !== item.value) {
        changedIds.add(item.id);
      }
    });

    if (changedIds.size > 0) {
      setAnimatingIds(changedIds);
      setTimeout(() => setAnimatingIds(new Set()), 1000);
    }

    prevItemsRef.current = items;
  }, [items]);

  // Auto-scroll animation - slower and smoother
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    // Pixels per second: slower speeds for smoother scrolling
    const speedMap = { slow: 15, normal: 25, fast: 40 };
    const pixelsPerSecond = speedMap[speed];

    let animationId: number;
    let scrollPosition = 0;
    let lastTime: number | null = null;

    const scroll = (currentTime: number) => {
      if (lastTime === null) {
        lastTime = currentTime;
      }
      
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;
      
      // Only scroll if content is wider than container
      if (scrollContainer.scrollWidth > scrollContainer.clientWidth) {
        scrollPosition += pixelsPerSecond * deltaTime;
        
        // Reset position when we've scrolled through half (the duplicated content)
        if (scrollPosition >= scrollContainer.scrollWidth / 2) {
          scrollPosition = 0;
        }
        scrollContainer.scrollLeft = scrollPosition;
      }
      
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [speed]);

  // Duplicate items for seamless scrolling
  const duplicatedItems = [...items, ...items];

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border border-orange-500/20 bg-card/30 backdrop-blur-sm trading-glow",
      className
    )}>
      {/* Live indicator */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pl-3 pr-2 bg-gradient-to-r from-card via-card to-transparent">
        <div className="flex items-center gap-1.5 text-orange-500">
          <div className="relative">
            <Zap className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Scrolling content */}
      <div 
        ref={scrollRef}
        className="flex items-center gap-3 py-2 px-16 overflow-x-hidden"
        style={{ scrollBehavior: 'auto' }}
      >
        {duplicatedItems.map((item, idx) => (
          <TickerItemDisplay 
            key={`${item.id}-${idx}`}
            item={item}
            animate={animatingIds.has(item.id)}
          />
        ))}
      </div>

      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-card to-transparent pointer-events-none" />
    </div>
  );
};

// Simpler static ticker for dashboards
export const StaticPriceTicker: React.FC<{
  items: TickerItem[];
  className?: string;
}> = ({ items, className }) => {
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const prevItemsRef = useRef<TickerItem[]>(items);

  useEffect(() => {
    const changedIds = new Set<string>();
    items.forEach((item) => {
      const prevItem = prevItemsRef.current.find(p => p.id === item.id);
      if (prevItem && prevItem.value !== item.value) {
        changedIds.add(item.id);
      }
    });

    if (changedIds.size > 0) {
      setAnimatingIds(changedIds);
      setTimeout(() => setAnimatingIds(new Set()), 1000);
    }

    prevItemsRef.current = items;
  }, [items]);

  return (
    <div className={cn(
      "flex items-center gap-2 flex-wrap",
      className
    )}>
      <div className="flex items-center gap-1.5 text-orange-500 mr-2">
        <Activity className="h-4 w-4" />
        <span className="text-xs font-semibold">LIVE</span>
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      </div>
      {items.map((item) => (
        <TickerItemDisplay 
          key={item.id}
          item={item}
          animate={animatingIds.has(item.id)}
        />
      ))}
    </div>
  );
};
