import React from 'react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
  label?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  className,
  label = 'typing',
}) => {
  return (
    <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"></span>
      </div>
      <span className="text-xs">{label}</span>
    </div>
  );
};
