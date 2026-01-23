import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatReadReceiptProps {
  isRead: boolean;
  /**
   * Delivered means the recipient is available/assigned and the message reached them,
   * but they haven't explicitly read it yet.
   */
  isDelivered?: boolean;
  isSent?: boolean;
  /**
   * Timestamp when the message was read. If provided, shows tooltip "Seen 2m ago".
   */
  readAt?: string | null;
  className?: string;
}

export const ChatReadReceipt: React.FC<ChatReadReceiptProps> = ({
  isRead,
  isDelivered = false,
  isSent = true,
  readAt,
  className,
}) => {
  if (!isSent) {
    return null;
  }

  const getSeenTooltip = () => {
    if (!readAt) return 'Seen';
    try {
      return `Seen ${require('date-fns').formatDistanceToNow(new Date(readAt), { addSuffix: false })} ago`;
    } catch {
      return 'Seen';
    }
  };

  return (
    <span className={cn('inline-flex items-center ml-1', className)} title={isRead ? getSeenTooltip() : isDelivered ? 'Delivered' : 'Sent'}>
      {isRead ? (
        <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/90 animate-scale-in" />
      ) : isDelivered ? (
        <CheckCheck className="w-3.5 h-3.5 opacity-70" />
      ) : (
        <Check className="w-3.5 h-3.5 opacity-70" />
      )}
    </span>
  );
};
