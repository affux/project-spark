import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  order_id: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface DropshipperWallet {
  user_id: string;
  name: string;
  email: string;
  wallet_balance: number;
}

export const useAdminWallet = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: ['admin-wallet-transactions'],
    queryFn: async () => {
      const { data: transactions, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      // Fetch user profiles
      const userIds = [...new Set((transactions || []).map(t => t.user_id))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (transactions || []).map((t): WalletTransaction => {
        const profile = profileMap.get(t.user_id);
        return {
          id: t.id,
          user_id: t.user_id,
          amount: Number(t.amount),
          type: t.type,
          description: t.description,
          order_id: t.order_id,
          created_at: t.created_at,
          user_name: profile?.name,
          user_email: profile?.email,
        };
      });
    },
    enabled: user?.role === 'admin' && !!session,
  });

  const dropshipperWalletsQuery = useQuery({
    queryKey: ['admin-dropshipper-wallets'],
    queryFn: async () => {
      // Get all user roles with 'user' role
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'user');

      if (rolesError) throw rolesError;

      const userIds = userRoles?.map(r => r.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, wallet_balance')
        .in('user_id', userIds)
        .order('wallet_balance', { ascending: false });

      if (profilesError) throw profilesError;

      return (profiles || []).map((p): DropshipperWallet => ({
        user_id: p.user_id,
        name: p.name,
        email: p.email,
        wallet_balance: Number(p.wallet_balance),
      }));
    },
    enabled: user?.role === 'admin' && !!session,
  });

  const adjustWalletMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      amount, 
      type, 
      description 
    }: { 
      userId: string; 
      amount: number; 
      type: 'credit' | 'debit'; 
      description: string;
    }) => {
      // Use the edge function for wallet adjustments (bypasses protect_profile_fields trigger)
      const adjustedAmount = type === 'credit' ? amount : -amount;
      
      const { data, error } = await supabase.functions.invoke('admin-wallet-credit', {
        body: {
          userId,
          amount: adjustedAmount,
          description,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to adjust wallet');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to adjust wallet balance');
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-wallet-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dropshipper-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dropshippers'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({
        title: variables.type === 'credit' ? 'Wallet Credited' : 'Wallet Debited',
        description: `$${variables.amount.toFixed(2)} has been ${variables.type}ed successfully.`,
      });
    },
    onError: (error: Error) => {
      console.error('Error adjusting wallet:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to adjust wallet balance.',
        variant: 'destructive',
      });
    },
  });

  return {
    transactions: transactionsQuery.data || [],
    dropshipperWallets: dropshipperWalletsQuery.data || [],
    isLoading: transactionsQuery.isLoading || dropshipperWalletsQuery.isLoading,
    error: transactionsQuery.error || dropshipperWalletsQuery.error,
    refetch: () => {
      transactionsQuery.refetch();
      dropshipperWalletsQuery.refetch();
    },
    adjustWallet: adjustWalletMutation.mutate,
    isAdjustingWallet: adjustWalletMutation.isPending,
  };
};
