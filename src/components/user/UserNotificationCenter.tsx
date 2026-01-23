import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserNotifications, UserNotification } from '@/hooks/useUserNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Bell, 
  ShoppingCart, 
  Wallet, 
  Loader2, 
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  CheckCheck,
  Briefcase,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export const UserNotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { 
    notifications, 
    isLoading, 
    unreadCount, 
    orderCount, 
    paymentCount,
    payoutCount,
    proofCount,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useUserNotifications();

  const handleNotificationClick = (notification: UserNotification) => {
    setIsOpen(false);
    switch (notification.type) {
      case 'order_update':
        navigate('/dashboard/orders');
        break;
      case 'payment_update':
        navigate('/dashboard/crypto-history');
        break;
      case 'payout_update':
        navigate('/dashboard/payments');
        break;
      case 'proof_update':
        navigate('/dashboard/workspace');
        break;
    }
  };

  const getNotificationIcon = (notification: UserNotification) => {
    switch (notification.type) {
      case 'order_update':
        if (notification.status === 'completed') {
          return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        } else if (notification.status === 'cancelled') {
          return <XCircle className="w-4 h-4 text-red-500" />;
        } else if (notification.status === 'processing') {
          return <Package className="w-4 h-4 text-blue-500" />;
        }
        return <ShoppingCart className="w-4 h-4 text-primary" />;
      case 'payment_update':
        if (notification.status === 'verified') {
          return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        } else if (notification.status === 'rejected') {
          return <XCircle className="w-4 h-4 text-red-500" />;
        }
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'payout_update':
        if (notification.status?.includes('approved') || notification.status?.includes('completed')) {
          return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        } else if (notification.status?.includes('rejected')) {
          return <XCircle className="w-4 h-4 text-red-500" />;
        }
        return <Send className="w-4 h-4 text-purple-500" />;
      case 'proof_update':
        if (notification.status?.includes('approved')) {
          return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        } else if (notification.status?.includes('rejected')) {
          return <XCircle className="w-4 h-4 text-red-500" />;
        }
        return <Briefcase className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const renderNotifications = (items: UserNotification[]) => {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Bell className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No notifications</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-border">
        {items.map((notification) => (
          <button
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={cn(
              "w-full p-3 text-left hover:bg-muted/50 transition-colors",
              !notification.is_read && "bg-primary/5"
            )}
          >
            <div className="flex gap-3">
              <div className="mt-0.5">{getNotificationIcon(notification)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    "text-sm truncate",
                    !notification.is_read ? "font-semibold" : "font-medium"
                  )}>
                    {notification.title}
                  </p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {notification.description}
                </p>
                {!notification.is_read && (
                  <Badge variant="secondary" className="mt-1 text-xs h-5">New</Badge>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const totalCount = orderCount + paymentCount + payoutCount + proofCount;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end" side="right">
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
                disabled={isMarkingAllAsRead}
                className="h-8 text-xs gap-1"
              >
                {isMarkingAllAsRead ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3 h-3" />
                )}
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full grid grid-cols-4 rounded-none border-b bg-transparent h-auto p-0">
              <TabsTrigger
                value="all"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3"
              >
                <ShoppingCart className="w-4 h-4" />
                {orderCount > 0 && <Badge variant="secondary" className="ml-1 text-xs">{orderCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger
                value="payouts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3"
              >
                <Send className="w-4 h-4" />
                {payoutCount > 0 && <Badge variant="secondary" className="ml-1 text-xs">{payoutCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3"
              >
                <Wallet className="w-4 h-4" />
                {paymentCount > 0 && <Badge variant="secondary" className="ml-1 text-xs">{paymentCount}</Badge>}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[350px]">
              <TabsContent value="all" className="m-0">
                {renderNotifications(notifications)}
              </TabsContent>
              <TabsContent value="orders" className="m-0">
                {renderNotifications(notifications.filter(n => n.type === 'order_update'))}
              </TabsContent>
              <TabsContent value="payouts" className="m-0">
                {renderNotifications(notifications.filter(n => n.type === 'payout_update'))}
              </TabsContent>
              <TabsContent value="payments" className="m-0">
                {renderNotifications(notifications.filter(n => n.type === 'payment_update'))}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </PopoverContent>
    </Popover>
  );
};