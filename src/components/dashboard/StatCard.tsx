import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  badge?: number;
  badgeVariant?: 'default' | 'warning' | 'destructive';
  variant?: 'default' | 'accent' | 'success' | 'warning';
  className?: string;
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  badge,
  badgeVariant = 'warning',
  variant = 'default',
  className,
  delay = 0,
}) => {
  const iconColors = {
    default: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
    accent: 'bg-accent/10 text-accent dark:bg-accent/20',
    success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };

  const badgeColors = {
    default: 'bg-primary text-primary-foreground',
    warning: 'bg-amber-500 text-white animate-pulse',
    destructive: 'bg-destructive text-white animate-pulse',
  };

  return (
    <div 
      className={cn(
        "stat-card opacity-0 animate-slide-up relative",
        className
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {badge !== undefined && badge > 0 && (
        <Badge 
          className={cn(
            "absolute -top-2 -right-2 h-6 min-w-6 flex items-center justify-center text-xs font-bold shadow-lg",
            badgeColors[badgeVariant]
          )}
        >
          {badge > 99 ? '99+' : badge}
        </Badge>
      )}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          iconColors[variant]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
