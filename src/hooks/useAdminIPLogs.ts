import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IPLog {
  id: string;
  user_id: string;
  ip_address: string;
  action_type: string;
  created_at: string;
  country?: string;
  city?: string;
  region?: string;
  user_name?: string;
  user_email?: string;
}

interface UseAdminIPLogsOptions {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  actionType?: string;
}

export const useAdminIPLogs = (options: UseAdminIPLogsOptions = {}) => {
  const [logs, setLogs] = useState<IPLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('ip_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }

      if (options.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      if (options.actionType && options.actionType !== 'all') {
        query = query.eq('action_type', options.actionType);
      }

      const { data: logsData, error: logsError } = await query;

      if (logsError) {
        throw logsError;
      }

      // Fetch user profiles for the logs
      const userIds = [...new Set((logsData || []).map(log => log.user_id))];
      
      let profilesMap: Record<string, { name: string; email: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .in('user_id', userIds);
        
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, profile) => {
            acc[profile.user_id] = { name: profile.name, email: profile.email };
            return acc;
          }, {} as Record<string, { name: string; email: string }>);
        }
      }

      const enrichedLogs: IPLog[] = (logsData || []).map(log => ({
        ...log,
        user_name: profilesMap[log.user_id]?.name || 'Unknown',
        user_email: profilesMap[log.user_id]?.email || 'Unknown',
      }));

      setLogs(enrichedLogs);
    } catch (err) {
      console.error('Error fetching IP logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch IP logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [options.userId, options.startDate?.getTime(), options.endDate?.getTime(), options.actionType]);

  return { logs, isLoading, error, refetch: fetchLogs };
};
