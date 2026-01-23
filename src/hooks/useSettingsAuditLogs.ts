import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SettingsAuditLog {
  id: string;
  action_type: string;
  entity_type: string;
  admin_id: string | null;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  reason: string | null;
  created_at: string;
  admin_email?: string;
}

export const useSettingsAuditLogs = (limit: number = 20) => {
  const { user, session } = useAuth();

  const logsQuery = useQuery({
    queryKey: ['settings-audit-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', 'platform_settings')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching settings audit logs:', error);
        throw error;
      }

      // Fetch admin emails for display
      const adminIds = [...new Set(data?.map(log => log.admin_id).filter(Boolean))];
      let adminEmails: Record<string, string> = {};
      
      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email')
          .in('user_id', adminIds);
        
        profiles?.forEach(p => {
          adminEmails[p.user_id] = p.email;
        });
      }

      return (data || []).map(log => ({
        ...log,
        admin_email: log.admin_id ? adminEmails[log.admin_id] : undefined,
      })) as SettingsAuditLog[];
    },
    enabled: user?.role === 'admin' && !!session,
  });

  return {
    logs: logsQuery.data || [],
    isLoading: logsQuery.isLoading,
    error: logsQuery.error,
    refetch: logsQuery.refetch,
  };
};
