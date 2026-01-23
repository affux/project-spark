import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface PostpaidTransaction {
  id: string;
  user_id: string;
  order_id: string | null;
  amount: number;
  transaction_type: 'credit_used' | 'credit_repaid' | 'adjustment';
  description: string | null;
  admin_id: string | null;
  admin_reason: string | null;
  balance_before: number;
  balance_after: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

export interface PostpaidProfile {
  postpaid_enabled: boolean;
  postpaid_credit_limit: number;
  postpaid_used: number;
  postpaid_due_cycle: number | null;
}

export interface PostpaidStatus {
  enabled: boolean;
  creditLimit: number;
  usedCredit: number;
  availableCredit: number;
  outstandingDues: number;
  dueCycle: number | null;
  canRequestPayout: boolean;
}

export const usePostpaid = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's postpaid status
  const postpaidStatusQuery = useQuery({
    queryKey: ['postpaid-status', user?.id],
    queryFn: async (): Promise<PostpaidStatus & { hasOutstandingDues: boolean }> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('postpaid_enabled, postpaid_credit_limit, postpaid_used, postpaid_due_cycle')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching postpaid status:', error);
        throw error;
      }

      const profile = data as PostpaidProfile;
      // Available credit is based on credit limit minus used, regardless of enabled status
      // If admin has set a credit limit > 0, user can use postpaid
      const hasCreditLimit = profile.postpaid_credit_limit > 0;
      const availableCredit = hasCreditLimit 
        ? Math.max(0, profile.postpaid_credit_limit - profile.postpaid_used)
        : 0;
      
      return {
        // User can use postpaid if either explicitly enabled OR has a credit limit set
        enabled: profile.postpaid_enabled || hasCreditLimit,
        creditLimit: profile.postpaid_credit_limit,
        usedCredit: profile.postpaid_used,
        availableCredit,
        outstandingDues: profile.postpaid_used,
        dueCycle: profile.postpaid_due_cycle,
        canRequestPayout: profile.postpaid_used === 0,
        // Track if user has outstanding dues even when postpaid is disabled
        hasOutstandingDues: profile.postpaid_used > 0,
      };
    },
    enabled: !!user?.id && !!session,
  });

  // Fetch user's postpaid transactions
  const transactionsQuery = useQuery({
    queryKey: ['postpaid-transactions', user?.id],
    queryFn: async (): Promise<PostpaidTransaction[]> => {
      const { data, error } = await supabase
        .from('postpaid_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching postpaid transactions:', error);
        throw error;
      }

      return (data || []).map(t => ({
        id: t.id,
        user_id: t.user_id,
        order_id: t.order_id,
        amount: Number(t.amount),
        transaction_type: t.transaction_type as PostpaidTransaction['transaction_type'],
        description: t.description,
        admin_id: t.admin_id,
        admin_reason: t.admin_reason,
        balance_before: Number(t.balance_before),
        balance_after: Number(t.balance_after),
        status: t.status as PostpaidTransaction['status'],
        created_at: t.created_at,
      }));
    },
    enabled: !!user?.id && !!session,
  });

  // Repay postpaid dues (from wallet balance) - clears specific orders
  const repayPostpaidMutation = useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get current profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance, postpaid_used')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      const walletBalance = Number(profile.wallet_balance);
      const postpaidUsed = Number(profile.postpaid_used);

      if (amount > walletBalance) {
        throw new Error('Insufficient wallet balance');
      }

      if (amount > postpaidUsed) {
        throw new Error('Amount exceeds outstanding postpaid dues');
      }

      // Get postpaid_pending orders sorted by oldest first
      const { data: pendingOrders, error: ordersError } = await (supabase
        .from('orders')
        .select('id, order_number, base_price, quantity') as any)
        .eq('dropshipper_user_id', user.id)
        .eq('status', 'postpaid_pending')
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      // Calculate which orders can be cleared with this payment
      let remainingPayment = amount;
      const ordersToClear: { id: string; order_number: string; amount: number }[] = [];
      
      for (const order of (pendingOrders || [])) {
        const orderAmount = order.base_price * order.quantity;
        if (remainingPayment >= orderAmount) {
          ordersToClear.push({ id: order.id, order_number: order.order_number, amount: orderAmount });
          remainingPayment -= orderAmount;
        }
        if (remainingPayment <= 0) break;
      }

      // Deduct from wallet and reduce postpaid used
      const newWalletBalance = walletBalance - amount;
      const newPostpaidUsed = postpaidUsed - amount;

      // Record postpaid transaction
      const { error: txError } = await supabase
        .from('postpaid_transactions')
        .insert({
          user_id: user.id,
          amount: amount,
          transaction_type: 'credit_repaid',
          description: ordersToClear.length > 0 
            ? `Postpaid repayment - cleared ${ordersToClear.length} order(s): ${ordersToClear.map(o => o.order_number).join(', ')}`
            : 'Postpaid dues partial repayment from wallet',
          balance_before: postpaidUsed,
          balance_after: newPostpaidUsed,
          status: 'completed',
        });

      if (txError) throw txError;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: newWalletBalance,
          postpaid_used: newPostpaidUsed,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Record wallet transaction
      const { error: walletTxError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          amount: -amount,
          type: 'postpaid_repayment',
          description: ordersToClear.length > 0
            ? `Postpaid repayment for orders: ${ordersToClear.map(o => o.order_number).join(', ')}`
            : 'Postpaid dues partial repayment',
        });

      if (walletTxError) {
        console.error('Wallet transaction error:', walletTxError);
      }

      // Mark cleared orders as paid_by_user
      for (const order of ordersToClear) {
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({ 
            status: 'paid_by_user',
            postpaid_paid_at: new Date().toISOString()
          })
          .eq('id', order.id);
        
        if (orderUpdateError) {
          console.error(`Failed to update order ${order.order_number}:`, orderUpdateError);
        }
      }

      return { newPostpaidUsed, newWalletBalance, clearedOrders: ordersToClear };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['postpaid-status'] });
      queryClient.invalidateQueries({ queryKey: ['postpaid-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      
      const clearedCount = data?.clearedOrders?.length || 0;
      toast({
        title: 'Payment Successful',
        description: clearedCount > 0 
          ? `${clearedCount} order(s) have been marked as paid.`
          : 'Your postpaid dues have been reduced.',
      });
    },
    onError: (error: Error) => {
      console.error('Error repaying postpaid:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process postpaid repayment.',
        variant: 'destructive',
      });
    },
  });

  return {
    postpaidStatus: postpaidStatusQuery.data,
    isLoading: postpaidStatusQuery.isLoading,
    transactions: transactionsQuery.data || [],
    isLoadingTransactions: transactionsQuery.isLoading,
    repayPostpaid: repayPostpaidMutation.mutate,
    isRepaying: repayPostpaidMutation.isPending,
    refetch: postpaidStatusQuery.refetch,
  };
};

// Admin hook for managing user postpaid settings
export const useAdminPostpaid = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users with postpaid data
  const usersWithPostpaidQuery = useQuery({
    queryKey: ['admin-postpaid-users'],
    queryFn: async () => {
      const { data: users, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'user');

      if (error) throw error;

      const userIds = users?.map(u => u.user_id) || [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, postpaid_enabled, postpaid_credit_limit, postpaid_used, postpaid_due_cycle, wallet_balance, allow_payout_with_dues')
        .in('user_id', userIds)
        .order('name');

      if (profilesError) throw profilesError;

      return (profiles || []).map(p => ({
        user_id: p.user_id,
        name: p.name,
        email: p.email,
        postpaid_enabled: p.postpaid_enabled,
        postpaid_credit_limit: Number(p.postpaid_credit_limit),
        postpaid_used: Number(p.postpaid_used),
        postpaid_due_cycle: p.postpaid_due_cycle,
        wallet_balance: Number(p.wallet_balance),
        available_credit: Math.max(0, Number(p.postpaid_credit_limit) - Number(p.postpaid_used)),
        allow_payout_with_dues: Boolean(p.allow_payout_with_dues),
      }));
    },
    enabled: !!user && user.role === 'admin' && !!session,
  });

  // Fetch postpaid transactions for a specific user
  const fetchUserTransactions = async (userId: string): Promise<PostpaidTransaction[]> => {
    const { data, error } = await supabase
      .from('postpaid_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return (data || []).map(t => ({
      id: t.id,
      user_id: t.user_id,
      order_id: t.order_id,
      amount: Number(t.amount),
      transaction_type: t.transaction_type as PostpaidTransaction['transaction_type'],
      description: t.description,
      admin_id: t.admin_id,
      admin_reason: t.admin_reason,
      balance_before: Number(t.balance_before),
      balance_after: Number(t.balance_after),
      status: t.status as PostpaidTransaction['status'],
      created_at: t.created_at,
    }));
  };

  // Toggle postpaid enabled for a user
  const togglePostpaidMutation = useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ postpaid_enabled: enabled })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-postpaid-users'] });
      toast({
        title: enabled ? 'Postpaid Enabled' : 'Postpaid Disabled',
        description: `Postpaid has been ${enabled ? 'enabled' : 'disabled'} for this user.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update postpaid status.',
        variant: 'destructive',
      });
    },
  });

  // Update postpaid credit limit
  const updateCreditLimitMutation = useMutation({
    mutationFn: async ({ userId, creditLimit }: { userId: string; creditLimit: number }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ postpaid_credit_limit: creditLimit })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-postpaid-users'] });
      toast({
        title: 'Credit Limit Updated',
        description: 'The credit limit has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update credit limit.',
        variant: 'destructive',
      });
    },
  });

  // Adjust postpaid balance manually (with reason)
  const adjustBalanceMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      amount, 
      reason 
    }: { 
      userId: string; 
      amount: number; 
      reason: string;
    }) => {
      // Get current postpaid used
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('postpaid_used')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      const currentUsed = Number(profile.postpaid_used);
      const newUsed = Math.max(0, currentUsed + amount);

      // Record transaction
      const { error: txError } = await supabase
        .from('postpaid_transactions')
        .insert({
          user_id: userId,
          amount: Math.abs(amount),
          transaction_type: 'adjustment',
          description: amount > 0 ? 'Admin increased postpaid dues' : 'Admin reduced postpaid dues',
          admin_id: user?.id,
          admin_reason: reason,
          balance_before: currentUsed,
          balance_after: newUsed,
          status: 'completed',
        });

      if (txError) throw txError;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ postpaid_used: newUsed })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return { newUsed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-postpaid-users'] });
      toast({
        title: 'Balance Adjusted',
        description: 'The postpaid balance has been adjusted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to adjust balance.',
        variant: 'destructive',
      });
    },
  });

  // Update due cycle
  const updateDueCycleMutation = useMutation({
    mutationFn: async ({ userId, dueCycle }: { userId: string; dueCycle: number | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ postpaid_due_cycle: dueCycle })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-postpaid-users'] });
      toast({
        title: 'Due Cycle Updated',
        description: 'The due cycle has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update due cycle.',
        variant: 'destructive',
      });
    },
  });

  // Toggle allow payout with dues
  const toggleAllowPayoutWithDuesMutation = useMutation({
    mutationFn: async ({ userId, allow }: { userId: string; allow: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ allow_payout_with_dues: allow })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { allow }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-postpaid-users'] });
      toast({
        title: allow ? 'Payout Restriction Removed' : 'Payout Restricted',
        description: allow 
          ? 'User can now request payouts without clearing postpaid dues.' 
          : 'User must clear postpaid dues before requesting payouts.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payout restriction.',
        variant: 'destructive',
      });
    },
  });

  return {
    users: usersWithPostpaidQuery.data || [],
    isLoading: usersWithPostpaidQuery.isLoading,
    refetch: usersWithPostpaidQuery.refetch,
    fetchUserTransactions,
    togglePostpaid: togglePostpaidMutation.mutate,
    isTogglingPostpaid: togglePostpaidMutation.isPending,
    updateCreditLimit: updateCreditLimitMutation.mutate,
    isUpdatingCreditLimit: updateCreditLimitMutation.isPending,
    adjustBalance: adjustBalanceMutation.mutate,
    isAdjustingBalance: adjustBalanceMutation.isPending,
    updateDueCycle: updateDueCycleMutation.mutate,
    isUpdatingDueCycle: updateDueCycleMutation.isPending,
    toggleAllowPayoutWithDues: toggleAllowPayoutWithDuesMutation.mutate,
    isTogglingAllowPayoutWithDues: toggleAllowPayoutWithDuesMutation.isPending,
  };
};
