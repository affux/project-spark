import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export interface ProofTrendData {
  date: string;
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export interface TopContributor {
  user_id: string;
  user_name: string;
  user_email: string;
  total_submissions: number;
  approved_count: number;
  approval_rate: number;
}

export interface ProofStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  approvalRate: number;
  rejectionRate: number;
  avgReviewTime: number | null;
}

// Fetch proof analytics data
export function useProofAnalytics(days: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['proof-analytics', days],
    queryFn: async () => {
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());

      // Fetch all proofs within date range
      const { data: proofs, error } = await supabase
        .from('proof_of_work')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date for trends
      const trendMap = new Map<string, ProofTrendData>();
      
      // Initialize all days in range
      for (let i = 0; i <= days; i++) {
        const date = format(subDays(new Date(), days - i), 'yyyy-MM-dd');
        trendMap.set(date, { date, pending: 0, approved: 0, rejected: 0, total: 0 });
      }

      // Populate with actual data
      (proofs || []).forEach((proof) => {
        const date = format(new Date(proof.created_at), 'yyyy-MM-dd');
        const existing = trendMap.get(date);
        if (existing) {
          existing.total += 1;
          if (proof.status === 'pending') existing.pending += 1;
          else if (proof.status === 'approved') existing.approved += 1;
          else if (proof.status === 'rejected') existing.rejected += 1;
        }
      });

      const trends = Array.from(trendMap.values());

      return { trends, proofs: proofs || [] };
    },
    enabled: user?.role === 'admin',
  });
}

// Fetch overall proof stats
export function useProofStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['proof-stats'],
    queryFn: async () => {
      const { data: proofs, error } = await supabase
        .from('proof_of_work')
        .select('status, created_at, reviewed_at');

      if (error) throw error;

      const total = proofs?.length || 0;
      const pending = proofs?.filter((p) => p.status === 'pending').length || 0;
      const approved = proofs?.filter((p) => p.status === 'approved').length || 0;
      const rejected = proofs?.filter((p) => p.status === 'rejected').length || 0;

      // Calculate approval rate (of reviewed proofs)
      const reviewed = approved + rejected;
      const approvalRate = reviewed > 0 ? (approved / reviewed) * 100 : 0;
      const rejectionRate = reviewed > 0 ? (rejected / reviewed) * 100 : 0;

      // Calculate average review time
      const reviewedProofs = proofs?.filter((p) => p.reviewed_at && p.status !== 'pending') || [];
      let avgReviewTime: number | null = null;
      if (reviewedProofs.length > 0) {
        const totalTime = reviewedProofs.reduce((acc, p) => {
          const created = new Date(p.created_at).getTime();
          const reviewed = new Date(p.reviewed_at!).getTime();
          return acc + (reviewed - created);
        }, 0);
        avgReviewTime = totalTime / reviewedProofs.length / (1000 * 60 * 60); // Convert to hours
      }

      return {
        total,
        pending,
        approved,
        rejected,
        approvalRate,
        rejectionRate,
        avgReviewTime,
      } as ProofStats;
    },
    enabled: user?.role === 'admin',
  });
}

// User: Fetch own proof stats
export function useMyProofStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-proof-stats', user?.id],
    queryFn: async () => {
      const { data: proofs, error } = await supabase
        .from('proof_of_work')
        .select('status, created_at, reviewed_at')
        .eq('user_id', user?.id);

      if (error) throw error;

      const total = proofs?.length || 0;
      const pending = proofs?.filter((p) => p.status === 'pending').length || 0;
      const approved = proofs?.filter((p) => p.status === 'approved').length || 0;
      const rejected = proofs?.filter((p) => p.status === 'rejected').length || 0;

      const reviewed = approved + rejected;
      const approvalRate = reviewed > 0 ? (approved / reviewed) * 100 : 0;
      const rejectionRate = reviewed > 0 ? (rejected / reviewed) * 100 : 0;

      // Calculate average review time for user's proofs
      const reviewedProofs = proofs?.filter((p) => p.reviewed_at && p.status !== 'pending') || [];
      let avgReviewTime: number | null = null;
      if (reviewedProofs.length > 0) {
        const totalTime = reviewedProofs.reduce((acc, p) => {
          const created = new Date(p.created_at).getTime();
          const reviewed = new Date(p.reviewed_at!).getTime();
          return acc + (reviewed - created);
        }, 0);
        avgReviewTime = totalTime / reviewedProofs.length / (1000 * 60 * 60);
      }

      return {
        total,
        pending,
        approved,
        rejected,
        approvalRate,
        rejectionRate,
        avgReviewTime,
      } as ProofStats;
    },
    enabled: !!user?.id,
  });
}

// User: Fetch own submission trends
export function useMyProofTrends(days: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-proof-trends', user?.id, days],
    queryFn: async () => {
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());

      const { data: proofs, error } = await supabase
        .from('proof_of_work')
        .select('status, created_at')
        .eq('user_id', user?.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const trendMap = new Map<string, ProofTrendData>();
      
      for (let i = 0; i <= days; i++) {
        const date = format(subDays(new Date(), days - i), 'yyyy-MM-dd');
        trendMap.set(date, { date, pending: 0, approved: 0, rejected: 0, total: 0 });
      }

      (proofs || []).forEach((proof) => {
        const date = format(new Date(proof.created_at), 'yyyy-MM-dd');
        const existing = trendMap.get(date);
        if (existing) {
          existing.total += 1;
          if (proof.status === 'pending') existing.pending += 1;
          else if (proof.status === 'approved') existing.approved += 1;
          else if (proof.status === 'rejected') existing.rejected += 1;
        }
      });

      return Array.from(trendMap.values());
    },
    enabled: !!user?.id,
  });
}

// Fetch top contributors
export function useTopContributors(limit: number = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['top-contributors', limit],
    queryFn: async () => {
      // Get all proofs
      const { data: proofs, error } = await supabase
        .from('proof_of_work')
        .select('user_id, status');

      if (error) throw error;

      // Group by user
      const userMap = new Map<string, { total: number; approved: number }>();
      (proofs || []).forEach((proof) => {
        const existing = userMap.get(proof.user_id) || { total: 0, approved: 0 };
        existing.total += 1;
        if (proof.status === 'approved') existing.approved += 1;
        userMap.set(proof.user_id, existing);
      });

      // Get user IDs and fetch profiles
      const userIds = Array.from(userMap.keys());
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, { name: p.name, email: p.email }])
      );

      // Build top contributors list
      const contributors: TopContributor[] = userIds.map((userId) => {
        const stats = userMap.get(userId)!;
        const profile = profileMap.get(userId);
        return {
          user_id: userId,
          user_name: profile?.name || 'Unknown',
          user_email: profile?.email || '',
          total_submissions: stats.total,
          approved_count: stats.approved,
          approval_rate: stats.total > 0 ? (stats.approved / stats.total) * 100 : 0,
        };
      });

      // Sort by total submissions and limit
      contributors.sort((a, b) => b.total_submissions - a.total_submissions);
      return contributors.slice(0, limit);
    },
    enabled: user?.role === 'admin',
  });
}
