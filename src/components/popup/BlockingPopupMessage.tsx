import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertTriangle, Info, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePopupMessages, PopupMessage } from '@/hooks/usePopupMessages';
import { cn } from '@/lib/utils';

const SCROLL_THRESHOLD = 50; // Characters threshold for requiring scroll tracking
const LONG_CONTENT_THRESHOLD = 300; // Characters for "Read More" toggle

export function BlockingPopupMessage() {
  const { unacknowledgedMessages, acknowledge } = usePopupMessages();
  const [currentMessage, setCurrentMessage] = useState<PopupMessage | null>(null);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Determine if content is long enough to require expansion/scroll
  const isLongContent = currentMessage && currentMessage.message.length > LONG_CONTENT_THRESHOLD;
  const requiresScroll = currentMessage && currentMessage.message.length > SCROLL_THRESHOLD && isLongContent;

  // Check if user can acknowledge
  const canAcknowledge = !requiresScroll || hasScrolledToBottom || !isExpanded;

  // Get the highest priority unacknowledged message
  useEffect(() => {
    if (unacknowledgedMessages.length > 0) {
      setCurrentMessage(unacknowledgedMessages[0]);
      setIsExpanded(false);
      setHasScrolledToBottom(false);
    } else {
      setCurrentMessage(null);
    }
  }, [unacknowledgedMessages]);

  // Check scroll position
  const checkScrollPosition = useCallback(() => {
    if (!scrollAreaRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
    
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  }, [hasScrolledToBottom]);

  // Auto-check scroll on content expansion
  useEffect(() => {
    if (isExpanded && scrollAreaRef.current) {
      // Check if content is smaller than container (no scroll needed)
      const { scrollHeight, clientHeight } = scrollAreaRef.current;
      if (scrollHeight <= clientHeight) {
        setHasScrolledToBottom(true);
      }
    }
  }, [isExpanded]);

  const handleAcknowledge = async () => {
    if (!currentMessage || !canAcknowledge) return;
    
    setIsAcknowledging(true);
    try {
      await acknowledge(currentMessage.id);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleExpand = () => {
    setIsExpanded(true);
  };

  // Block keyboard escape
  useEffect(() => {
    if (!currentMessage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [currentMessage]);

  if (!currentMessage) return null;

  const getIcon = () => {
    switch (currentMessage.message_type) {
      case 'warning':
        return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
      case 'alert':
        return <AlertCircle className="h-8 w-8 text-destructive" />;
      default:
        return <Info className="h-8 w-8 text-primary" />;
    }
  };

  const getBorderColor = () => {
    switch (currentMessage.message_type) {
      case 'warning':
        return 'border-yellow-500';
      case 'alert':
        return 'border-destructive';
      default:
        return 'border-primary';
    }
  };

  // Get truncated content for collapsed view
  const getTruncatedContent = () => {
    if (!isLongContent || isExpanded) return currentMessage.message;
    return currentMessage.message.slice(0, LONG_CONTENT_THRESHOLD) + '...';
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-title"
    >
      <div 
        className={cn(
          "bg-card border-2 rounded-lg shadow-2xl max-w-lg w-full mx-4 overflow-hidden",
          getBorderColor()
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-border">
          {getIcon()}
          <h2 id="popup-title" className="text-xl font-semibold text-foreground">
            {currentMessage.title || 'Important Notice'}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          {isExpanded ? (
            <div 
              ref={scrollAreaRef}
              onScroll={checkScrollPosition}
              className="max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin"
            >
              <div ref={contentRef} className="text-foreground whitespace-pre-wrap">
                {currentMessage.message}
              </div>
            </div>
          ) : (
            <div className="text-foreground whitespace-pre-wrap">
              {getTruncatedContent()}
            </div>
          )}

          {/* Read More button */}
          {isLongContent && !isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExpand}
              className="mt-3 text-primary hover:text-primary/80"
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              Read More
            </Button>
          )}

          {/* Scroll indicator */}
          {isExpanded && requiresScroll && !hasScrolledToBottom && (
            <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground animate-pulse">
              <ChevronDown className="h-4 w-4" />
              <span>Scroll to read full message</span>
              <ChevronDown className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/30">
          <Button 
            onClick={handleAcknowledge}
            disabled={isAcknowledging || (isLongContent && !isExpanded) || (isExpanded && requiresScroll && !hasScrolledToBottom)}
            className="w-full"
            size="lg"
          >
            {isAcknowledging ? 'Processing...' : 'I Understand'}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            {isLongContent && !isExpanded 
              ? 'Please read the full message before acknowledging'
              : isExpanded && requiresScroll && !hasScrolledToBottom
                ? 'Please scroll to read the complete message'
                : 'You must acknowledge this message to continue'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
