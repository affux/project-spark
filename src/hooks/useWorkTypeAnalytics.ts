import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, format } from 'date-fns';

export interface WorkTypeUsage {
  work_title: string;
  total_count: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
  approval_rate: number;
  unique_users: number;
}

export interface WorkTypeUserBreakdown {
  user_id: string;
  user_name: string;
  user_email: string;
  work_title: string;
  submission_count: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
}

export interface WorkTypeTrend {
  date: string;
  work_title: string;
  count: number;
}

export interface WorkTypeAnalyticsFilters {
  startDate?: Date | null;
  endDate?: Date | null;
  userId?: string | null;
  status?: string | null;
  workTitle?: string | null;
  hasProductLink?: boolean | null;
}

export function useWorkTypeAnalytics(filters: WorkTypeAnalyticsFilters = {}) {
  const { user } = useAuth();
  const { startDate, endDate, userId, status, workTitle, hasProductLink } = filters;

  return useQuery({
    queryKey: ['work-type-analytics', startDate?.toISOString(), endDate?.toISOString(), userId, status, workTitle, hasProductLink],
    queryFn: async () => {
      // Build query
      let query = supabase.from('proof_of_work').select('*');

      // Apply date filters
      if (startDate) {
        query = query.gte('created_at', startOfDay(startDate).toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endOfDay(endDate).toISOString());
      }

      // Apply user filter
      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Apply status filter
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Apply work title filter
      if (workTitle && workTitle !== 'all') {
        query = query.eq('work_title', workTitle);
      }

      // Apply product link filter
      if (hasProductLink === true) {
        query = query.not('product_link', 'is', null).neq('product_link', '');
      } else if (hasProductLink === false) {
        query = query.or('product_link.is.null,product_link.eq.');
      }

      const { data: proofs, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // Get unique work titles for usage stats
      const workTypeMap = new Map<string, {
        total: number;
        approved: number;
        pending: number;
        rejected: number;
        users: Set<string>;
      }>();

      (proofs || []).forEach((proof) => {
        const title = proof.work_title || 'Unknown';
        const existing = workTypeMap.get(title) || {
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          users: new Set<string>(),
        };

        existing.total += 1;
        existing.users.add(proof.user_id);

        if (proof.status === 'approved') existing.approved += 1;
        else if (proof.status === 'pending') existing.pending += 1;
        else if (proof.status === 'rejected') existing.rejected += 1;

        workTypeMap.set(title, existing);
      });

      // Build usage statistics
      const usageStats: WorkTypeUsage[] = Array.from(workTypeMap.entries())
        .map(([title, stats]) => ({
          work_title: title,
          total_count: stats.total,
          approved_count: stats.approved,
          pending_count: stats.pending,
          rejected_count: stats.rejected,
          approval_rate: stats.approved + stats.rejected > 0
            ? (stats.approved / (stats.approved + stats.rejected)) * 100
            : 0,
          unique_users: stats.users.size,
        }))
        .sort((a, b) => b.total_count - a.total_count);

      // Get unique user IDs for profiles
      const userIds = [...new Set((proofs || []).map((p) => p.user_id))];

      // Fetch profiles
      let profiles: { user_id: string; name: string; email: string }[] = [];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .in('user_id', userIds);
        profiles = profileData || [];
      }

      const profileMap = new Map(profiles.map((p) => [p.user_id, { name: p.name, email: p.email }]));

      // Build user breakdown by work type
      const userWorkTypeMap = new Map<string, {
        user_id: string;
        work_title: string;
        total: number;
        approved: number;
        pending: number;
        rejected: number;
      }>();

      (proofs || []).forEach((proof) => {
        const key = `${proof.user_id}_${proof.work_title}`;
        const existing = userWorkTypeMap.get(key) || {
          user_id: proof.user_id,
          work_title: proof.work_title,
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
        };

        existing.total += 1;
        if (proof.status === 'approved') existing.approved += 1;
        else if (proof.status === 'pending') existing.pending += 1;
        else if (proof.status === 'rejected') existing.rejected += 1;

        userWorkTypeMap.set(key, existing);
      });

      const userBreakdown: WorkTypeUserBreakdown[] = Array.from(userWorkTypeMap.values())
        .map((stat) => {
          const profile = profileMap.get(stat.user_id);
          return {
            user_id: stat.user_id,
            user_name: profile?.name || 'Unknown',
            user_email: profile?.email || '',
            work_title: stat.work_title,
            submission_count: stat.total,
            approved_count: stat.approved,
            pending_count: stat.pending,
            rejected_count: stat.rejected,
          };
        })
        .sort((a, b) => b.submission_count - a.submission_count);

      // Build daily trends by work type (last 30 days of filtered data)
      const trendMap = new Map<string, number>();
      (proofs || []).forEach((proof) => {
        const date = format(new Date(proof.created_at), 'yyyy-MM-dd');
        const key = `${date}_${proof.work_title}`;
        trendMap.set(key, (trendMap.get(key) || 0) + 1);
      });

      const trends: WorkTypeTrend[] = Array.from(trendMap.entries())
        .map(([key, count]) => {
          const [date, ...titleParts] = key.split('_');
          return {
            date,
            work_title: titleParts.join('_'),
            count,
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      // Get all unique work titles
      const allWorkTitles = [...new Set((proofs || []).map((p) => p.work_title))].sort();

      // Get all users for filter dropdown
      const allUsers = userIds.map((id) => {
        const profile = profileMap.get(id);
        return {
          user_id: id,
          name: profile?.name || 'Unknown',
          email: profile?.email || '',
        };
      }).sort((a, b) => a.name.localeCompare(b.name));

      return {
        usageStats,
        userBreakdown,
        trends,
        allWorkTitles,
        allUsers,
        totalProofs: proofs?.length || 0,
      };
    },
    enabled: user?.role === 'admin',
  });
}

// Fetch all users for the filter dropdown
export function useAllUsersForFilter() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-users-filter'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .order('name', { ascending: true });

      if (error) throw error;
      return profiles || [];
    },
    enabled: user?.role === 'admin',
  });
}

// Fetch all work titles for the filter dropdown
export function useAllWorkTitlesForFilter() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-work-titles-filter'],
    queryFn: async () => {
      const { data: proofs, error } = await supabase
        .from('proof_of_work')
        .select('work_title');

      if (error) throw error;

      const uniqueTitles = [...new Set((proofs || []).map((p) => p.work_title))].sort();
      return uniqueTitles;
    },
    enabled: user?.role === 'admin',
  });
}
