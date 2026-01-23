import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LiveDataCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  isLive?: boolean;
}

export const LiveDataCard: React.FC<LiveDataCardProps> = ({
  title,
  children,
  className,
  isLive = true,
}) => {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    }, 3000);
    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <div className={cn(
      "rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden trading-glow",
      className
    )}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {isLive && (
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full bg-orange-500 transition-opacity",
              pulse ? "opacity-100" : "opacity-50"
            )} />
            <span className="text-xs text-orange-500 font-medium">Live</span>
          </div>
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};
