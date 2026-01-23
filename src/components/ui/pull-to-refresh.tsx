import React from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
  className?: string;
}

export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  pullDistance,
  isRefreshing,
  threshold = 80,
  className,
}) => {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;
  const shouldTrigger = pullDistance >= threshold;
  
  if (pullDistance <= 0 && !isRefreshing) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center transition-all duration-200 overflow-hidden",
        className
      )}
      style={{
        height: isRefreshing ? 48 : Math.min(pullDistance, threshold * 1.5),
        opacity: isRefreshing ? 1 : Math.min(progress, 1),
      }}
    >
      <div className="flex flex-col items-center gap-1">
        {isRefreshing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Refreshing...</span>
          </>
        ) : (
          <>
            <ArrowDown 
              className={cn(
                "w-5 h-5 transition-transform duration-200",
                shouldTrigger ? "text-primary" : "text-muted-foreground"
              )}
              style={{ transform: `rotate(${rotation}deg)` }}
            />
            <span className="text-xs text-muted-foreground">
              {shouldTrigger ? "Release to refresh" : "Pull to refresh"}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
