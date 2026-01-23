import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { playNotificationSound } from '@/lib/notificationSound';
import { toast } from '@/hooks/use-toast';

type TableName = 'payout_requests' | 'orders' | 'wallet_transactions' | 'chat_messages' | 'chat_sessions' | 'profiles' | 'products' | 'storefront_products' | 'crypto_payments';

interface UseRealtimeOptions {
  table: TableName;
  queryKeys: string[][];
  filter?: { column: string; value: string };
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  playSound?: boolean;
  showToast?: boolean;
  toastMessages?: {
    insert?: string;
    update?: string;
    delete?: string;
  };
}

// Global connection state
let globalConnectionState: 'connected' | 'disconnected' = 'disconnected';
const connectionListeners: Set<(state: 'connected' | 'disconnected') => void> = new Set();

const notifyConnectionListeners = (state: 'connected' | 'disconnected') => {
  globalConnectionState = state;
  connectionListeners.forEach(listener => listener(state));
};

export const useRealtimeConnection = () => {
  const [isConnected, setIsConnected] = useState(globalConnectionState === 'connected');

  useEffect(() => {
    const listener = (state: 'connected' | 'disconnected') => {
      setIsConnected(state === 'connected');
    };
    connectionListeners.add(listener);
    return () => {
      connectionListeners.delete(listener);
    };
  }, []);

  return { isConnected };
};

const getToastMessage = (table: TableName, event: string, customMessages?: UseRealtimeOptions['toastMessages']): { title: string; description: string } | null => {
  const tableLabels: Record<TableName, string> = {
    payout_requests: 'Payout',
    orders: 'Order',
    wallet_transactions: 'Transaction',
    chat_messages: 'Message',
    chat_sessions: 'Chat Session',
    profiles: 'Profile',
    products: 'Product',
    storefront_products: 'Storefront Product',
    crypto_payments: 'Crypto Payment',
  };

  const label = tableLabels[table];

  if (event === 'INSERT') {
    return {
      title: customMessages?.insert || `New ${label}`,
      description: `A new ${label.toLowerCase()} has been created.`,
    };
  } else if (event === 'UPDATE') {
    return {
      title: customMessages?.update || `${label} Updated`,
      description: `A ${label.toLowerCase()} has been updated.`,
    };
  } else if (event === 'DELETE') {
    return {
      title: customMessages?.delete || `${label} Removed`,
      description: `A ${label.toLowerCase()} has been removed.`,
    };
  }
  return null;
};

export const useRealtimeSubscription = ({
  table,
  queryKeys,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  playSound = false,
  showToast = false,
  toastMessages,
}: UseRealtimeOptions) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channelName = filter 
      ? `realtime-${table}-${filter.column}-${filter.value}`
      : `realtime-${table}-all`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter && { filter: `${filter.column}=eq.${filter.value}` }),
        },
        (payload) => {
          console.log(`Realtime ${payload.eventType} on ${table}:`, payload);
          
          // Invalidate all related queries (use partial matching to cover keys with params like userId)
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key, exact: false });
          });

          // Play notification sound if enabled
          if (playSound && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
            playNotificationSound();
          }

          // Show toast notification if enabled
          if (showToast) {
            const toastContent = getToastMessage(table, payload.eventType, toastMessages);
            if (toastContent) {
              toast({
                title: toastContent.title,
                description: toastContent.description,
              });
            }
          }

          // Call specific handlers
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload.new);
          } else if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload.new);
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload.old);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription to ${table}: ${status}`);
        if (status === 'SUBSCRIBED') {
          notifyConnectionListeners('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          notifyConnectionListeners('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, table, JSON.stringify(filter), JSON.stringify(queryKeys), playSound, showToast]);
};

// Hook for admin to listen to all payout changes
export const usePayoutRealtimeAdmin = () => {
  useRealtimeSubscription({
    table: 'payout_requests',
    queryKeys: [['admin-payout-requests'], ['admin-dropshipper-wallets']],
    playSound: true,
    showToast: true,
    toastMessages: {
      insert: 'New Payout Request',
      update: 'Payout Status Updated',
    },
  });
};

// Hook for user to listen to their payout changes
export const usePayoutRealtimeUser = (userId?: string) => {
  useRealtimeSubscription({
    table: 'payout_requests',
    queryKeys: [['user-payout-requests'], ['user-profile'], ['user-dashboard'], ['wallet-transactions']],
    filter: userId ? { column: 'user_id', value: userId } : undefined,
    playSound: true,
    showToast: true,
    toastMessages: {
      update: 'Your payout status has been updated',
    },
  });
};

// Hook for admin to listen to all order changes
export const useOrderRealtimeAdmin = () => {
  useRealtimeSubscription({
    table: 'orders',
    queryKeys: [['admin-orders'], ['admin-dashboard'], ['admin-pending-payment-users']],
    playSound: true,
    showToast: true,
    toastMessages: {
      insert: 'New Order Received',
      update: 'Order Status Updated',
    },
  });
};

// Hook for admin to listen to pending payment users changes
export const usePendingPaymentUsersRealtime = () => {
  useRealtimeSubscription({
    table: 'orders',
    queryKeys: [['admin-pending-payment-users']],
  });
};

// Hook for user to listen to their order changes
export const useOrderRealtimeUser = (userId?: string) => {
  useRealtimeSubscription({
    table: 'orders',
    queryKeys: [['user-orders'], ['user-dashboard']],
    filter: userId ? { column: 'dropshipper_user_id', value: userId } : undefined,
    playSound: true,
    showToast: true,
    toastMessages: {
      insert: 'New Order Received',
      update: 'Your order status has been updated',
    },
  });
};

// Hook for user to listen to wallet transaction changes
export const useWalletRealtimeUser = (userId?: string) => {
  const { refreshUser } = useAuth();

  useRealtimeSubscription({
    table: 'wallet_transactions',
    queryKeys: [['wallet-transactions'], ['user-profile'], ['user-dashboard']],
    filter: userId ? { column: 'user_id', value: userId } : undefined,
    showToast: true,
    toastMessages: {
      insert: 'Wallet Updated',
    },
    onInsert: (payload) => {
      // Refresh user data to update wallet balance in header
      refreshUser();
      console.log('Wallet transaction received:', payload);
    },
  });
};

// Hook for profile updates (wallet balance, etc.)
export const useProfileRealtimeUser = (userId?: string) => {
  const { refreshUser } = useAuth();

  useRealtimeSubscription({
    table: 'profiles',
    queryKeys: [['user-profile'], ['user-dashboard'], ['user-payout-requests'], ['wallet-transactions']],
    filter: userId ? { column: 'user_id', value: userId } : undefined,
    showToast: true,
    toastMessages: {
      update: 'Balance Updated',
    },
    onUpdate: (payload) => {
      // Keep AuthContext in sync so wallet balance updates everywhere instantly
      refreshUser();
      console.log('Profile updated, new wallet balance:', payload?.wallet_balance);
    },
  });
};

// Hook for admin to listen to all profile changes
export const useProfileRealtimeAdmin = () => {
  useRealtimeSubscription({
    table: 'profiles',
    queryKeys: [['admin-users'], ['admin-dashboard'], ['admin-dropshipper-wallets']],
  });
};

// Hook for product changes
export const useProductRealtime = () => {
  useRealtimeSubscription({
    table: 'products',
    queryKeys: [['products'], ['admin-products']],
  });
};

// Hook for storefront product changes
export const useStorefrontProductRealtime = (userId?: string) => {
  useRealtimeSubscription({
    table: 'storefront_products',
    queryKeys: [['storefront-products'], ['user-products']],
    filter: userId ? { column: 'user_id', value: userId } : undefined,
  });
};

// Hook for chat message changes
export const useChatRealtimeUser = (userId?: string) => {
  useRealtimeSubscription({
    table: 'chat_messages',
    queryKeys: [['chat-messages'], ['chat-session'], ['assigned-agent']],
    filter: userId ? { column: 'user_id', value: userId } : undefined,
    playSound: true,
    showToast: true,
    toastMessages: {
      insert: 'New Message Received',
    },
  });
};

// Hook for user to listen to their chat session changes (agent assignment, status updates)
export const useChatSessionRealtimeUser = (userId?: string) => {
  useRealtimeSubscription({
    table: 'chat_sessions',
    queryKeys: [['chat-session'], ['chat-messages'], ['assigned-agent']],
    filter: userId ? { column: 'user_id', value: userId } : undefined,
  });
};

// Hook for admin to listen to all chat messages
export const useChatRealtimeAdmin = () => {
  useRealtimeSubscription({
    table: 'chat_messages',
    queryKeys: [['admin-chat-messages'], ['admin-chat-users']],
    playSound: true,
    showToast: true,
    toastMessages: {
      insert: 'New Message Received',
    },
  });
};

// Hook for user to listen to their crypto payment status changes
export const useCryptoPaymentRealtimeUser = (userId?: string) => {
  useRealtimeSubscription({
    table: 'crypto_payments',
    queryKeys: [['user-crypto-notifications'], ['crypto-payments']],
    filter: userId ? { column: 'user_id', value: userId } : undefined,
    playSound: true,
    showToast: true,
    toastMessages: {
      insert: 'Crypto Payment Submitted',
      update: 'Crypto Payment Status Updated',
    },
  });
};

// Hook for admin to listen to all crypto payment changes
export const useCryptoPaymentRealtimeAdmin = () => {
  useRealtimeSubscription({
    table: 'crypto_payments',
    queryKeys: [['crypto-payments'], ['admin-dashboard']],
    playSound: true,
    showToast: true,
    toastMessages: {
      insert: 'New Crypto Payment Received',
      update: 'Crypto Payment Updated',
    },
  });
};
