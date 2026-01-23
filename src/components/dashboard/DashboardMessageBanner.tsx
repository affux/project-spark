import { useEffect } from 'react';
import { Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { useDashboardMessages } from '@/hooks/useDashboardMessages';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface DashboardMessageBannerProps {
  isAdmin?: boolean;
  className?: string;
}

const DashboardMessageBanner = ({ isAdmin = false, className }: DashboardMessageBannerProps) => {
  const { messages, isLoading, refetch } = useDashboardMessages(isAdmin);

  // Realtime subscription for instant updates
  useEffect(() => {
    const messagesChannel = supabase
      .channel('dashboard-messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dashboard_messages',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    const targetsChannel = supabase
      .channel('dashboard-message-targets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dashboard_message_targets',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(targetsChannel);
    };
  }, [refetch]);

  // Filter active messages for the current role
  const activeMessages = messages.filter((msg) => {
    if (!msg.is_enabled) return false;
    if (isAdmin && !msg.show_to_admins) return false;
    if (!isAdmin && !msg.show_to_users) return false;
    if (msg.expires_at && new Date(msg.expires_at) < new Date()) return false;
    return true;
  });

  // Sort by priority (highest first), then by created_at
  const sortedMessages = [...activeMessages].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (isLoading || sortedMessages.length === 0) {
    return null;
  }

  const getMessageStyles = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          container: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
          icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
        };
      case 'alert':
        return {
          container: 'bg-destructive/10 border-destructive/30 text-destructive',
          icon: <AlertCircle className="h-4 w-4 text-destructive" />,
        };
      case 'info':
      default:
        return {
          container: 'bg-primary/10 border-primary/30 text-primary',
          icon: <Info className="h-4 w-4 text-primary" />,
        };
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {sortedMessages.map((msg) => {
        const styles = getMessageStyles(msg.message_type);
        return (
          <div
            key={msg.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border transition-all',
              styles.container
            )}
          >
            <div className="mt-0.5 shrink-0">{styles.icon}</div>
            <div className="flex-1 min-w-0">
              {msg.title && (
                <p className="font-semibold text-sm mb-0.5">{msg.title}</p>
              )}
              <p className="text-sm leading-relaxed">{msg.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardMessageBanner;
