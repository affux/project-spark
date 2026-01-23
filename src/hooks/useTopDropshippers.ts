import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TopDropshipper {
  id: string;
  user_id: string | null;
  display_name: string;
  rank_position: number;
  badge_title: string | null;
  orders_count: number;
  earnings_amount: number;
  is_active: boolean;
  updated_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRankReference {
  id: string;
  user_id: string;
  admin_defined_position: number;
  updated_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useTopDropshippers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch active top 10 dropshippers using public view (hides sensitive data for non-admins)
  const topDropshippersQuery = useQuery({
    queryKey: ['top-dropshippers'],
    queryFn: async () => {
      // Use the public view that masks earnings and user_id for non-admins
      const { data, error } = await supabase
        .from('top_dropshippers_public')
        .select('*')
        .eq('is_active', true)
        .order('rank_position', { ascending: true });

      if (error) throw error;
      return data as TopDropshipper[];
    },
  });

  // Fetch all top dropshippers for admin
  const allDropshippersQuery = useQuery({
    queryKey: ['all-top-dropshippers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('top_dropshippers')
        .select('*')
        .order('rank_position', { ascending: true });

      if (error) throw error;
      return data as TopDropshipper[];
    },
    enabled: user?.role === 'admin',
  });

  // Fetch current user's rank reference
  const userRankQuery = useQuery({
    queryKey: ['user-rank-reference', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_rank_reference')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserRankReference | null;
    },
    enabled: !!user?.id,
  });

  // Fetch all user rank references for admin
  const allUserRanksQuery = useQuery({
    queryKey: ['all-user-rank-references'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_rank_reference')
        .select('*')
        .order('admin_defined_position', { ascending: true });

      if (error) throw error;
      return data as UserRankReference[];
    },
    enabled: user?.role === 'admin',
  });

  // Add or update top dropshipper
  const upsertDropshipperMutation = useMutation({
    mutationFn: async (dropshipper: Partial<TopDropshipper> & { rank_position: number; display_name: string }) => {
      const { data: existing } = await supabase
        .from('top_dropshippers')
        .select('id')
        .eq('rank_position', dropshipper.rank_position)
        .maybeSingle();

      if (existing && existing.id !== dropshipper.id) {
        // Position is taken by another entry, need to swap or handle conflict
        throw new Error(`Position ${dropshipper.rank_position} is already taken`);
      }

      if (dropshipper.id) {
        const { error } = await supabase
          .from('top_dropshippers')
          .update({
            ...dropshipper,
            updated_by_admin_id: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dropshipper.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('top_dropshippers')
          .insert({
            ...dropshipper,
            updated_by_admin_id: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['top-dropshippers'] });
      queryClient.invalidateQueries({ queryKey: ['all-top-dropshippers'] });
      toast.success('Top dropshipper updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  // Delete top dropshipper
  const deleteDropshipperMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('top_dropshippers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['top-dropshippers'] });
      queryClient.invalidateQueries({ queryKey: ['all-top-dropshippers'] });
      toast.success('Entry removed');
    },
    onError: (error) => {
      toast.error('Failed to remove: ' + error.message);
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('top_dropshippers')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['top-dropshippers'] });
      queryClient.invalidateQueries({ queryKey: ['all-top-dropshippers'] });
    },
  });

  // Reorder dropshippers (swap positions via drag-and-drop)
  const reorderDropshippersMutation = useMutation({
    mutationFn: async (updates: { id: string; rank_position: number }[]) => {
      // Update each entry's position
      for (const update of updates) {
        const { error } = await supabase
          .from('top_dropshippers')
          .update({ 
            rank_position: update.rank_position, 
            updated_at: new Date().toISOString(),
            updated_by_admin_id: user?.id,
          })
          .eq('id', update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['top-dropshippers'] });
      queryClient.invalidateQueries({ queryKey: ['all-top-dropshippers'] });
      toast.success('Positions updated');
    },
    onError: (error) => {
      toast.error('Failed to reorder: ' + error.message);
    },
  });

  // Set user rank reference
  const setUserRankMutation = useMutation({
    mutationFn: async ({ userId, position }: { userId: string; position: number }) => {
      const { data: existing } = await supabase
        .from('user_rank_reference')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_rank_reference')
          .update({
            admin_defined_position: position,
            updated_by_admin_id: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_rank_reference')
          .insert({
            user_id: userId,
            admin_defined_position: position,
            updated_by_admin_id: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-rank-reference'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-rank-references'] });
      toast.success('User rank updated');
    },
    onError: (error) => {
      toast.error('Failed to update rank: ' + error.message);
    },
  });

  // Check if current user is in top 10
  const isUserInTop10 = topDropshippersQuery.data?.some(
    (d) => d.user_id === user?.id
  ) ?? false;

  return {
    topDropshippers: topDropshippersQuery.data ?? [],
    allDropshippers: allDropshippersQuery.data ?? [],
    userRank: userRankQuery.data,
    allUserRanks: allUserRanksQuery.data ?? [],
    isUserInTop10,
    isLoading: topDropshippersQuery.isLoading,
    upsertDropshipper: upsertDropshipperMutation.mutate,
    deleteDropshipper: deleteDropshipperMutation.mutate,
    toggleActive: toggleActiveMutation.mutate,
    reorderDropshippers: reorderDropshippersMutation.mutate,
    setUserRank: setUserRankMutation.mutate,
    isUpdating: upsertDropshipperMutation.isPending || setUserRankMutation.isPending || reorderDropshippersMutation.isPending,
  };
};
