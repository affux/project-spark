import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SwipeAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  actions: SwipeAction[];
  threshold?: number;
  maxSwipe?: number;
  className?: string;
  style?: React.CSSProperties;
  actionsWidth?: number;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  actions,
  threshold = 50,
  maxSwipe = 120,
  className,
  style,
  actionsWidth = 100,
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const startX = useRef(0);
  const currentX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = translateX;
    setIsDragging(true);
  }, [translateX]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const diff = startX.current - e.touches[0].clientX;
    let newTranslate = currentX.current - diff;
    
    // Clamp values
    newTranslate = Math.max(-maxSwipe, Math.min(0, newTranslate));
    
    // Add resistance at the edges
    if (newTranslate < -actionsWidth) {
      const overflow = -newTranslate - actionsWidth;
      newTranslate = -actionsWidth - (overflow * 0.3);
    }
    
    setTranslateX(newTranslate);
  }, [isDragging, maxSwipe, actionsWidth]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    
    // Determine if we should snap open or closed
    if (translateX < -threshold) {
      setTranslateX(-actionsWidth);
      setIsOpen(true);
    } else {
      setTranslateX(0);
      setIsOpen(false);
    }
  }, [translateX, threshold, actionsWidth]);

  const handleClose = useCallback(() => {
    setTranslateX(0);
    setIsOpen(false);
  }, []);

  const handleActionClick = useCallback((action: SwipeAction) => {
    action.onClick();
    // Close after action with slight delay for visual feedback
    setTimeout(handleClose, 150);
  }, [handleClose]);

  // Close on click outside or on the row itself when open
  const handleRowClick = useCallback(() => {
    if (isOpen) {
      handleClose();
    }
  }, [isOpen, handleClose]);

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={style}
    >
      {/* Action buttons (behind the row) */}
      <div 
        className="absolute right-0 top-0 bottom-0 flex items-stretch"
        style={{ width: actionsWidth }}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-white transition-colors touch-manipulation",
              "active:opacity-80",
              action.className || "bg-primary hover:bg-primary/90"
            )}
          >
            {action.icon}
            <span className="text-[10px] font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Swipeable content */}
      <div
        className={cn(
          "relative bg-background",
          isDragging ? "transition-none" : "transition-transform duration-200 ease-out"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleRowClick}
      >
        {children}
      </div>

      {/* Swipe hint indicator (shows on first render briefly) */}
      {translateX === 0 && !isOpen && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none sm:hidden">
          <div className="w-1 h-6 bg-muted-foreground/50 rounded-full" />
        </div>
      )}
    </div>
  );
};
