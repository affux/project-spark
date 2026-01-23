import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type UserStatus = 'pending' | 'approved' | 'disabled';
export type UserLevel = 'bronze' | 'silver' | 'gold';

export interface ResetOptions {
  orders?: boolean;
  walletTransactions?: boolean;
  storefrontProducts?: boolean;
  proofOfWork?: boolean;
  payoutRequests?: boolean;
  cryptoPayments?: boolean;
  kycSubmissions?: boolean;
  chatMessages?: boolean;
  notifications?: boolean;
  resetProfile?: boolean;
}

export interface DropshipperUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  storefront_name: string | null;
  storefront_slug: string | null;
  is_active: boolean;
  user_status: UserStatus;
  user_level: UserLevel;
  wallet_balance: number;
  commission_override: number | null;
  created_at: string;
  last_ip_address: string | null;
  last_login_at: string | null;
  postpaid_enabled: boolean;
  postpaid_used: number;
  allow_payout_with_dues: boolean;
}

export const useAdminUsers = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dropshippersQuery = useQuery({
    queryKey: ['admin-dropshippers'],
    queryFn: async () => {
      // First get all user roles with 'user' role
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'user');

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        throw rolesError;
      }

      const userIds = userRoles?.map(r => r.user_id) || [];

      if (userIds.length === 0) {
        return [];
      }

      // Then get profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching dropshipper profiles:', profilesError);
        throw profilesError;
      }

      return (profiles || []).map((p): DropshipperUser => ({
        id: p.id,
        user_id: p.user_id,
        name: p.name,
        email: p.email,
        storefront_name: p.storefront_name,
        storefront_slug: p.storefront_slug,
        is_active: p.is_active,
        user_status: (p.user_status as UserStatus) || 'pending',
        user_level: ((p as any).user_level as UserLevel) || 'bronze',
        wallet_balance: Number(p.wallet_balance),
        commission_override: p.commission_override ? Number(p.commission_override) : null,
        created_at: p.created_at,
        last_ip_address: (p as any).last_ip_address || null,
        last_login_at: (p as any).last_login_at || null,
        postpaid_enabled: Boolean(p.postpaid_enabled),
        postpaid_used: Number(p.postpaid_used || 0),
        allow_payout_with_dues: Boolean(p.allow_payout_with_dues),
      }));
    },
    enabled: user?.role === 'admin' && !!session,
  });

  const updateUserLevelMutation = useMutation({
    mutationFn: async ({ userId, level }: { userId: string; level: UserLevel }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ user_level: level } as any)
        .eq('user_id', userId);

      if (error) throw error;
      
      // Log the action
      await supabase.rpc('create_audit_log', {
        _action_type: 'user_level_change',
        _entity_type: 'profile',
        _entity_id: userId,
        _user_id: userId,
        _admin_id: user?.id,
        _new_value: { user_level: level },
        _reason: `User level changed to ${level}`,
      });
      
      return level;
    },
    onSuccess: (level) => {
      queryClient.invalidateQueries({ queryKey: ['admin-dropshippers'] });
      toast({
        title: 'User Level Updated',
        description: `User level has been changed to ${level}.`,
      });
    },
    onError: (error) => {
      console.error('Error updating user level:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user level.',
        variant: 'destructive',
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !isActive })
        .eq('user_id', userId);

      if (error) throw error;
      return !isActive;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['admin-dropshippers'] });
      toast({
        title: newStatus ? 'Dropshipper Activated' : 'Dropshipper Deactivated',
        description: `The dropshipper account has been ${newStatus ? 'activated' : 'deactivated'}.`,
      });
    },
    onError: (error) => {
      console.error('Error toggling status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update dropshipper status.',
        variant: 'destructive',
      });
    },
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: UserStatus }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ user_status: status })
        .eq('user_id', userId);

      if (error) throw error;
      
      // If disabling user, broadcast force logout event
      if (status === 'disabled') {
        await supabase
          .from('force_logout_events')
          .insert({
            user_id: userId,
            reason: 'account_disabled',
            triggered_by: user?.id,
          });
      }
      
      // Log the action
      await supabase.rpc('create_audit_log', {
        _action_type: 'user_status_change',
        _entity_type: 'profile',
        _entity_id: userId,
        _user_id: userId,
        _admin_id: user?.id,
        _new_value: { status },
        _reason: `Status changed to ${status}`,
      });
      
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ['admin-dropshippers'] });
      const messages: Record<UserStatus, string> = {
        approved: 'User has been approved and can now use all features.',
        pending: 'User has been set to pending status.',
        disabled: 'User has been disabled.',
      };
      toast({
        title: `User ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        description: messages[status],
      });
    },
    onError: (error) => {
      console.error('Error updating user status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status.',
        variant: 'destructive',
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      name, 
      storefrontName, 
      storefrontSlug 
    }: { 
      userId: string; 
      name: string; 
      storefrontName: string; 
      storefrontSlug: string;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          name,
          storefront_name: storefrontName,
          storefront_slug: storefrontSlug,
        })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dropshippers'] });
      toast({
        title: 'Dropshipper Updated',
        description: 'The dropshipper details have been updated.',
      });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update dropshipper details.',
        variant: 'destructive',
      });
    },
  });

  const updateCommissionMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      commissionOverride 
    }: { 
      userId: string; 
      commissionOverride: number | null;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ commission_override: commissionOverride })
        .eq('user_id', userId);

      if (error) throw error;
      
      // Log the action
      await supabase.rpc('create_audit_log', {
        _action_type: 'commission_change',
        _entity_type: 'profile',
        _entity_id: userId,
        _user_id: userId,
        _admin_id: user?.id,
        _new_value: { commission_override: commissionOverride },
        _reason: commissionOverride !== null 
          ? `Custom commission set to ${commissionOverride}%` 
          : 'Commission reset to default',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dropshippers'] });
      toast({
        title: 'Commission Updated',
        description: 'The dropshipper commission has been updated.',
      });
    },
    onError: (error) => {
      console.error('Error updating commission:', error);
      toast({
        title: 'Error',
        description: 'Failed to update commission.',
        variant: 'destructive',
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      // Call edge function to delete user completely (including auth.users)
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to delete user');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dropshippers'] });
      toast({
        title: 'User Deleted',
        description: 'The user has been permanently deleted and can no longer login.',
      });
    },
    onError: (error: Error) => {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user.',
        variant: 'destructive',
      });
    },
  });

  const resetUserDataMutation = useMutation({
    mutationFn: async ({ userId, options }: { userId: string; options?: ResetOptions }) => {
      // Call edge function to reset user data with selective options
      const { data, error } = await supabase.functions.invoke('reset-user-data', {
        body: { userId, options },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to reset user data');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-dropshippers'] });
      const counts = data?.deleted_counts || {};
      const deletedItems = Object.entries(counts)
        .filter(([_, count]) => (count as number) > 0)
        .map(([key, count]) => `${key.replace(/_/g, ' ')}: ${count}`)
        .join(', ');
      
      toast({
        title: 'User Data Reset',
        description: deletedItems ? `Deleted: ${deletedItems}` : 'Selected data has been cleared.',
      });
    },
    onError: (error: Error) => {
      console.error('Error resetting user data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset user data.',
        variant: 'destructive',
      });
    },
  });

  const toggleAllowPayoutWithDuesMutation = useMutation({
    mutationFn: async ({ userId, allow }: { userId: string; allow: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ allow_payout_with_dues: allow })
        .eq('user_id', userId);

      if (error) throw error;
      return allow;
    },
    onSuccess: (allow) => {
      queryClient.invalidateQueries({ queryKey: ['admin-dropshippers'] });
      toast({
        title: allow ? 'Payout with Dues Allowed' : 'Payout with Dues Blocked',
        description: allow 
          ? 'User can now request payouts even with outstanding postpaid dues.' 
          : 'User must clear postpaid dues before requesting payouts.',
      });
    },
    onError: (error) => {
      console.error('Error toggling allow payout with dues:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payout permission.',
        variant: 'destructive',
      });
    },
  });

  return {
    dropshippers: dropshippersQuery.data || [],
    isLoading: dropshippersQuery.isLoading,
    error: dropshippersQuery.error,
    refetch: dropshippersQuery.refetch,
    toggleStatus: toggleStatusMutation.mutate,
    isTogglingStatus: toggleStatusMutation.isPending,
    updateUserStatus: updateUserStatusMutation.mutate,
    isUpdatingUserStatus: updateUserStatusMutation.isPending,
    updateUserLevel: updateUserLevelMutation.mutate,
    isUpdatingUserLevel: updateUserLevelMutation.isPending,
    updateProfile: updateProfileMutation.mutate,
    isUpdatingProfile: updateProfileMutation.isPending,
    updateCommission: updateCommissionMutation.mutate,
    isUpdatingCommission: updateCommissionMutation.isPending,
    deleteUser: deleteUserMutation.mutate,
    isDeletingUser: deleteUserMutation.isPending,
    resetUserData: resetUserDataMutation.mutate,
    isResettingUserData: resetUserDataMutation.isPending,
    toggleAllowPayoutWithDues: toggleAllowPayoutWithDuesMutation.mutate,
    isTogglingAllowPayoutWithDues: toggleAllowPayoutWithDuesMutation.isPending,
  };
};
