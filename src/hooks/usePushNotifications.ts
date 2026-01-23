import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

interface UserNotificationPayload {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const usePushNotifications = (userId: string | undefined) => {
  const { toast } = useToast();
  const { settingsMap } = usePlatformSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  const playNotificationSound = useCallback(() => {
    const soundEnabled = settingsMap?.notification_sound_enabled ?? true;
    const volume = (settingsMap?.notification_sound_volume ?? 50) / 100;

    if (!soundEnabled) return;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
      }
      audioRef.current.volume = volume;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore audio play errors (e.g., user hasn't interacted yet)
      });
    } catch {
      // Ignore errors
    }
  }, [settingsMap?.notification_sound_enabled, settingsMap?.notification_sound_volume]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    // Play sound
    playNotificationSound();

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
      } catch {
        // Fallback for browsers that don't support Notification constructor
      }
    }

    // Also show toast for in-app notification
    toast({
      title,
      description: options?.body,
    });
  }, [toast, playNotificationSound]);

  const getNotificationIcon = useCallback((entityType: string | null, type: string) => {
    if (entityType === 'order' || type.includes('order')) return '📦';
    if (entityType === 'payout' || type.includes('payout')) return '💰';
    if (entityType === 'proof' || type.includes('proof') || type.includes('workspace')) return '💼';
    if (entityType === 'chat' || type.includes('chat')) return '💬';
    return '🔔';
  }, []);

  const notifyOrderStatusChange = useCallback((
    orderNumber: string,
    newStatus: string,
    productName?: string
  ) => {
    const statusMessages: Record<string, string> = {
      pending_payment: 'is awaiting payment',
      paid_by_user: 'payment has been submitted',
      processing: 'is now being processed',
      completed: 'has been completed! 🎉',
      cancelled: 'has been cancelled',
    };

    const message = statusMessages[newStatus] || `status changed to ${newStatus.replace(/_/g, ' ')}`;

    showNotification(`📦 Order ${orderNumber}`, {
      body: `Your order ${message}${productName ? ` - ${productName}` : ''}`,
      tag: `order-${orderNumber}`,
      requireInteraction: newStatus === 'completed',
    });
  }, [showNotification]);

  // Subscribe to user_notifications table for all notification types
  useEffect(() => {
    if (!userId) return;

    // Request permission on mount
    requestPermission();

    // Subscribe to new notifications from user_notifications table
    const notificationChannel = supabase
      .channel(`push-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as UserNotificationPayload;
          const icon = getNotificationIcon(notification.entity_type, notification.type);
          
          showNotification(`${icon} ${notification.title}`, {
            body: notification.message,
            tag: `notification-${notification.id}`,
            requireInteraction: notification.type.includes('completed') || notification.type.includes('approved'),
          });
        }
      )
      .subscribe();

    // Also subscribe to order changes for this user (keeping existing functionality)
    const orderChannel = supabase
      .channel('order-status-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `dropshipper_user_id=eq.${userId}`,
        },
        async (payload) => {
          const oldOrder = payload.old as { status?: string };
          const newOrder = payload.new as { 
            status: string; 
            order_number: string;
            storefront_product_id: string;
          };

          // Only notify on status changes
          if (oldOrder.status !== newOrder.status) {
            // Try to get product name
            let productName: string | undefined;
            try {
              const { data } = await supabase
                .from('storefront_products')
                .select('products(name)')
                .eq('id', newOrder.storefront_product_id)
                .single();
              
              productName = (data?.products as { name: string } | null)?.name;
            } catch {
              // Ignore errors
            }

            notifyOrderStatusChange(
              newOrder.order_number,
              newOrder.status,
              productName
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(orderChannel);
    };
  }, [userId, requestPermission, notifyOrderStatusChange, showNotification, getNotificationIcon]);

  return {
    requestPermission,
    showNotification,
    notifyOrderStatusChange,
    isSupported: 'Notification' in window,
    permission: typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'denied',
  };
};
