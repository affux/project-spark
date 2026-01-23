import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { ThemeSelector } from '@/components/ThemeSelector';
import { PostpaidSidePanel } from '@/components/user/PostpaidSidePanel';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserChatWidget } from '@/components/chat/UserChatWidget';
import { AdminSidebar } from './AdminSidebar';
import { UserSidebar } from './UserSidebar';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPostpaidPanelOpen, setIsPostpaidPanelOpen] = useState(false);
  const { settingsMap } = usePlatformSettings();
  const { toast } = useToast();
  const siteName = settingsMap.site_name || 'DropShip';
  const logoUrl = settingsMap.site_logo_url;

  // Initialize push notifications for users
  usePushNotifications(user?.role === 'user' ? user?.id : undefined);

  // Fetch pending KYC count for admin
  const { data: pendingKYCCount = 0 } = useQuery({
    queryKey: ['pending-kyc-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('kyc_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted');

      if (error) return 0;
      return count || 0;
    },
    enabled: user?.role === 'admin',
  });

  // Fetch pending proofs count for admin
  const { data: pendingProofsCount = 0 } = useQuery({
    queryKey: ['pending-proofs-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('proof_of_work')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) return 0;
      return count || 0;
    },
    enabled: user?.role === 'admin',
  });

  // Fetch pending chat messages count for admin
  const { data: pendingChatCount = 0 } = useQuery({
    queryKey: ['pending-chat-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_role', 'user')
        .eq('is_read', false);

      if (error) return 0;
      return count || 0;
    },
    enabled: user?.role === 'admin',
  });

  // Fetch pending crypto payments count for admin
  const { data: pendingCryptoCount = 0 } = useQuery({
    queryKey: ['pending-crypto-payments-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('crypto_payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) return 0;
      return count || 0;
    },
    enabled: user?.role === 'admin',
  });

  // Fetch unread chat support messages count for user
  const { data: userUnreadChatCount = 0, refetch: refetchUserUnreadChat } = useQuery({
    queryKey: ['user-unread-chat-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('sender_role', 'admin')
        .eq('is_read', false);

      if (error) return 0;
      return count || 0;
    },
    enabled: user?.role === 'user' && !!user?.id,
  });

  // Real-time subscription for user unread chat messages
  useEffect(() => {
    if (!user?.id || user?.role !== 'user') return;

    const channel = supabase
      .channel(`user-unread-chat-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new?.sender_role === 'admin') {
            refetchUserUnreadChat();
            // Show toast if user is not on chat page
            if (!location.pathname.includes('/chat')) {
              toast({
                title: "New message from support",
                description: "You have a new message from our support team.",
                duration: 5000,
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refetchUserUnreadChat();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role, refetchUserUnreadChat]);

  const isUserRole = user?.role === 'user';
  const isAdminRole = user?.role === 'admin';

  // Real-time wallet balance state
  const [realtimeWalletBalance, setRealtimeWalletBalance] = useState<number | undefined>(
    user?.walletBalance
  );
  const [balanceAnimating, setBalanceAnimating] = useState(false);

  // Subscribe to real-time wallet balance updates
  useEffect(() => {
    if (!user?.id || user?.role !== 'user') return;

    // Initialize with current balance
    setRealtimeWalletBalance(user.walletBalance);

    const channel = supabase
      .channel(`wallet-balance-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newBalance = payload.new?.wallet_balance;
          if (typeof newBalance === 'number') {
            // Trigger bounce animation
            setBalanceAnimating(true);
            setRealtimeWalletBalance(newBalance);
            setTimeout(() => setBalanceAnimating(false), 600);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role, user?.walletBalance]);

  // Use realtime balance if available, fallback to user.walletBalance
  const displayWalletBalance = realtimeWalletBalance ?? user?.walletBalance;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCloseSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-50 flex items-center justify-between px-4">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-sidebar-foreground p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-sm">{siteName.charAt(0)}</span>
            </div>
          )}
          <span className="font-semibold text-sidebar-foreground">{siteName}</span>
        </div>
        <ThemeSelector className="text-sidebar-foreground hover:bg-sidebar-accent" />
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-40 transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {isAdminRole ? (
          <AdminSidebar
            user={user}
            siteName={siteName}
            logoUrl={logoUrl}
            adminPanelTitle={settingsMap.admin_panel_title}
            pendingKYCCount={pendingKYCCount}
            pendingChatCount={pendingChatCount}
            pendingCryptoCount={pendingCryptoCount}
            pendingProofsCount={pendingProofsCount}
            onLogout={handleLogout}
            onCloseSidebar={handleCloseSidebar}
          />
        ) : (
          <UserSidebar
            user={user}
            siteName={siteName}
            logoUrl={logoUrl}
            userHubName={settingsMap.user_hub_name}
            defaultCurrency={settingsMap.default_currency}
            walletBalance={displayWalletBalance}
            balanceAnimating={balanceAnimating}
            userUnreadChatCount={userUnreadChatCount}
            onLogout={handleLogout}
            onCloseSidebar={handleCloseSidebar}
            onOpenPostpaidPanel={() => setIsPostpaidPanelOpen(true)}
          />
        )}
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* User Chat Widget - only show for non-admin users */}
      {isUserRole && <UserChatWidget />}

      {/* Postpaid Side Panel */}
      {isUserRole && (
        <PostpaidSidePanel 
          open={isPostpaidPanelOpen} 
          onOpenChange={setIsPostpaidPanelOpen} 
        />
      )}
    </div>
  );
};
