import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';

const SCROLL_THRESHOLD = 50;
const LONG_CONTENT_THRESHOLD = 300;

interface PendingPaymentBlockPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  showOrderCount: boolean;
  showViewOrdersLink: boolean;
  pendingCount: number;
  pendingOrders: Array<{
    id: string;
    order_number: string;
    selling_price: number;
    quantity: number;
    created_at: string;
  }>;
}

export function PendingPaymentBlockPopup({
  isOpen,
  onClose,
  title,
  message,
  showOrderCount,
  showViewOrdersLink,
  pendingCount,
  pendingOrders,
}: PendingPaymentBlockPopupProps) {
  const navigate = useNavigate();
  const { settingsMap } = usePlatformSettings();
  const currencySymbol = CURRENCY_SYMBOLS[settingsMap.default_currency] || '$';
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isLongContent = message.length > LONG_CONTENT_THRESHOLD;
  const requiresScrollCheck = isLongContent && isExpanded;

  // Check scroll position
  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
    
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  }, [hasScrolledToBottom]);

  // Auto-check if content is short enough
  useEffect(() => {
    if (isExpanded && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      if (container.scrollHeight <= container.clientHeight) {
        setHasScrolledToBottom(true);
      }
    }
  }, [isExpanded]);

  // Reset states when popup opens
  useEffect(() => {
    if (isOpen) {
      setIsExpanded(false);
      setHasScrolledToBottom(!isLongContent);
    }
  }, [isOpen, isLongContent]);

  const canAcknowledge = !isLongContent || (isExpanded && hasScrolledToBottom);

  const handleViewOrders = () => {
    onClose();
    navigate('/user/orders');
  };

  const handleAcknowledge = () => {
    if (canAcknowledge) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Modal */}
      <div 
        className="relative z-10 w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="popup-title"
        aria-describedby="popup-message"
      >
        {/* Header */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/20">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 id="popup-title" className="text-lg font-semibold text-foreground">
                {title}
              </h2>
              {showOrderCount && pendingCount > 0 && (
                <p className="text-sm text-amber-600 font-medium">
                  {pendingCount} pending order{pendingCount !== 1 ? 's' : ''} require payment
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Message */}
          <div className="relative">
            {isLongContent && !isExpanded ? (
              <>
                <p id="popup-message" className="text-muted-foreground whitespace-pre-wrap line-clamp-3">
                  {message}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-primary hover:text-primary/80 gap-1 h-auto p-0"
                  onClick={() => setIsExpanded(true)}
                >
                  <span>Read More</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </>
            ) : isLongContent && isExpanded ? (
              <div
                ref={scrollContainerRef}
                className="max-h-40 overflow-y-auto pr-2 scrollbar-thin"
                onScroll={checkScrollPosition}
              >
                <p id="popup-message" className="text-muted-foreground whitespace-pre-wrap">
                  {message}
                </p>
              </div>
            ) : (
              <p id="popup-message" className="text-muted-foreground whitespace-pre-wrap">
                {message}
              </p>
            )}

            {requiresScrollCheck && !hasScrolledToBottom && (
              <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 animate-pulse">
                <ChevronDown className="w-3 h-3" />
                <span>Scroll to read full message</span>
              </div>
            )}
          </div>

          {/* Pending Orders Preview */}
          {pendingOrders.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Pending Orders:</p>
              <div className="max-h-32 overflow-y-auto space-y-1.5">
                {pendingOrders.slice(0, 5).map((order) => (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between text-sm bg-background rounded p-2"
                  >
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">#{order.order_number}</span>
                      <span className="mx-2 text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d')}
                      </span>
                    </div>
                    <span className="font-medium">
                      {currencySymbol}{(order.selling_price * order.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                {pendingOrders.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{pendingOrders.length - 5} more orders
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex flex-col sm:flex-row gap-3">
          {showViewOrdersLink && (
            <Button
              variant="outline"
              className="gap-2 flex-1"
              onClick={handleViewOrders}
            >
              <ExternalLink className="w-4 h-4" />
              View Pending Orders
            </Button>
          )}
          <Button
            onClick={handleAcknowledge}
            disabled={!canAcknowledge}
            className={cn(
              "gap-2 flex-1",
              !canAcknowledge && "opacity-50 cursor-not-allowed"
            )}
          >
            I Understand
          </Button>
        </div>

        {!canAcknowledge && (
          <div className="px-6 pb-3 text-center">
            <p className="text-xs text-muted-foreground">
              Please read the full message to continue
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
