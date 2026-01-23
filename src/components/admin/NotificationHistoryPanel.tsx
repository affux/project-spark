import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Bell, MessageSquare, User, Users, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { useRecentOrderMessages } from '@/hooks/useRecentOrderMessages';
import { useOrderUnreadCounts } from '@/hooks/useOrderUnreadCounts';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface NotificationHistoryPanelProps {
  onOpenChat?: (orderId: string, orderNumber: string) => void;
}

export const NotificationHistoryPanel: React.FC<NotificationHistoryPanelProps> = ({
  onOpenChat,
}) => {
  const { messages, isLoading, refetch } = useRecentOrderMessages(50);
  const { totalUnread } = useOrderUnreadCounts();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const getSenderLabel = (senderType: string) => {
    switch (senderType) {
      case 'user':
        return { label: 'User', icon: User, color: 'bg-blue-500/10 text-blue-600' };
      case 'customer':
        return { label: 'Customer', icon: Users, color: 'bg-amber-500/10 text-amber-600' };
      default:
        return { label: 'System', icon: Bell, color: 'bg-gray-500/10 text-gray-600' };
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Message History
            {totalUnread > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalUnread} unread
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Recent order chat messages across all orders.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              {messages.length} messages
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {messages.map((msg) => {
                  const sender = getSenderLabel(msg.sender_type);
                  const SenderIcon = sender.icon;

                  return (
                    <Card
                      key={msg.id}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-muted/50',
                        !msg.is_read && msg.sender_type === 'user' && 'border-blue-500/50 bg-blue-500/5'
                      )}
                      onClick={() => onOpenChat?.(msg.order_id, msg.order_number)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn('text-xs', sender.color)}>
                              <SenderIcon className="w-3 h-3 mr-1" />
                              {sender.label}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {msg.order_number}
                            </Badge>
                          </div>
                          {!msg.is_read && msg.sender_type === 'user' && (
                            <Badge variant="destructive" className="text-[10px] px-1.5">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm line-clamp-2 mb-2">{msg.message}</p>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span title={format(new Date(msg.created_at), 'PPpp')}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
