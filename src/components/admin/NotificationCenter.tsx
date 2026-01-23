import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminNotifications, AdminNotification } from '@/hooks/useAdminNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, Shield, Wallet, ShoppingCart, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, isLoading, totalCount, kycCount, payoutCount, orderCount } = useAdminNotifications();

  const handleNotificationClick = (notification: AdminNotification) => {
    setIsOpen(false);
    switch (notification.type) {
      case 'kyc_submission':
        navigate('/admin/kyc');
        break;
      case 'payout_request':
        navigate('/admin/payouts');
        break;
      case 'order_update':
        navigate('/admin/orders');
        break;
    }
  };

  const getNotificationIcon = (type: AdminNotification['type']) => {
    switch (type) {
      case 'kyc_submission':
        return <Shield className="w-4 h-4 text-amber-500" />;
      case 'payout_request':
        return <Wallet className="w-4 h-4 text-emerald-500" />;
      case 'order_update':
        return <ShoppingCart className="w-4 h-4 text-blue-500" />;
    }
  };

  const renderNotifications = (items: AdminNotification[]) => {
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
            className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex gap-3">
              <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm truncate">{notification.title}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {notification.user_name}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {notification.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Bell className="w-5 h-5" />
          {totalCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs animate-pulse">
              {totalCount > 99 ? '99+' : totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end" side="right">
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Notifications</h3>
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalCount}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
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
                {totalCount > 0 && <Badge variant="secondary" className="ml-1 text-xs">{totalCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3"
              >
                <ShoppingCart className="w-4 h-4" />
                {orderCount > 0 && <Badge variant="secondary" className="ml-1 text-xs">{orderCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger
                value="kyc"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3"
              >
                <Shield className="w-4 h-4" />
                {kycCount > 0 && <Badge variant="secondary" className="ml-1 text-xs">{kycCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger
                value="payouts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3"
              >
                <Wallet className="w-4 h-4" />
                {payoutCount > 0 && <Badge variant="secondary" className="ml-1 text-xs">{payoutCount}</Badge>}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[350px]">
              <TabsContent value="all" className="m-0">
                {renderNotifications(notifications)}
              </TabsContent>
              <TabsContent value="orders" className="m-0">
                {renderNotifications(notifications.filter(n => n.type === 'order_update'))}
              </TabsContent>
              <TabsContent value="kyc" className="m-0">
                {renderNotifications(notifications.filter(n => n.type === 'kyc_submission'))}
              </TabsContent>
              <TabsContent value="payouts" className="m-0">
                {renderNotifications(notifications.filter(n => n.type === 'payout_request'))}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </PopoverContent>
    </Popover>
  );
};