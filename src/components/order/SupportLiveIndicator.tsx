import React from 'react';
import { cn } from '@/lib/utils';

interface SupportLiveIndicatorProps {
  className?: string;
  variant?: 'default' | 'light';
}

export const SupportLiveIndicator: React.FC<SupportLiveIndicatorProps> = ({
  className,
  variant = 'default',
}) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="relative flex h-2.5 w-2.5">
        <span className={cn(
          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
          variant === 'light' ? 'bg-green-300' : 'bg-green-400'
        )}></span>
        <span className={cn(
          "relative inline-flex rounded-full h-2.5 w-2.5",
          variant === 'light' ? 'bg-green-400' : 'bg-green-500'
        )}></span>
      </span>
      <span className={cn(
        "text-xs font-medium",
        variant === 'light' 
          ? 'text-primary-foreground/90' 
          : 'text-green-600 dark:text-green-400'
      )}>
        Support Team is Live
      </span>
    </div>
  );
};
