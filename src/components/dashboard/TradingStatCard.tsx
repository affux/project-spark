import React, { useState, useEffect, useRef } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradingStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
  delay?: number;
  sparkline?: number[];
}

export const TradingStatCard: React.FC<TradingStatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
  delay = 0,
  sparkline,
}) => {
  const [isGlowing, setIsGlowing] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);

  // Detect value changes and trigger glow animation
  useEffect(() => {
    if (prevValueRef.current !== value) {
      setIsGlowing(true);
      setIsAnimating(true);
      
      // Animate the value change
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
      }, 150);
      
      // Remove glow after animation
      const glowTimer = setTimeout(() => {
        setIsGlowing(false);
      }, 1500);
      
      prevValueRef.current = value;
      
      return () => {
        clearTimeout(timer);
        clearTimeout(glowTimer);
      };
    }
  }, [value]);

  const variantStyles = {
    default: 'border-border/50',
    accent: 'border-orange-500/30',
    success: 'border-green-500/30',
    warning: 'border-amber-500/30',
    danger: 'border-red-500/30',
  };

  const glowStyles = {
    default: 'shadow-orange-500/20',
    accent: 'shadow-orange-500/40',
    success: 'shadow-green-500/40',
    warning: 'shadow-amber-500/40',
    danger: 'shadow-red-500/40',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    accent: 'text-orange-500',
    success: 'text-green-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
  };

  const valueStyles = {
    default: 'text-foreground',
    accent: 'text-orange-500',
    success: 'text-green-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
  };

  // Sparkline removed for cleaner card design

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card/50 backdrop-blur-sm p-4 transition-all duration-300 hover:bg-card/80 opacity-0 animate-slide-up trading-glow",
        variantStyles[variant],
        "hover:shadow-lg hover:shadow-orange-500/5",
        isGlowing && `shadow-xl ${glowStyles[variant]}`,
        className
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {/* Animated glow overlay */}
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-orange-500/0 transition-opacity duration-500 pointer-events-none",
          isGlowing ? "opacity-100 animate-pulse" : "opacity-0"
        )}
      />
      
      {/* Glow ring effect */}
      <div 
        className={cn(
          "absolute inset-0 rounded-xl transition-all duration-300 pointer-events-none",
          isGlowing && "ring-2 ring-orange-500/50 ring-offset-0"
        )}
      />
      
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <Icon className={cn(
            "h-4 w-4 transition-all duration-300",
            iconStyles[variant],
            isGlowing && "scale-110"
          )} />
        </div>
        
        <div className="space-y-1">
          <p className={cn(
            "text-2xl font-bold transition-all duration-150",
            valueStyles[variant],
            isAnimating && "scale-105 opacity-70"
          )}>
            {displayValue}
          </p>
          
          {trend && (
            <div className="flex items-center gap-1">
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-green-500" : "text-red-500"
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              {subtitle && (
                <span className="text-xs text-muted-foreground ml-1">{subtitle}</span>
              )}
            </div>
          )}
          
          {!trend && subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};
