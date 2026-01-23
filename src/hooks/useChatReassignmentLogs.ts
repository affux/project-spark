import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChatReassignmentLog {
  id: string;
  chat_session_id: string;
  user_id: string;
  previous_agent_id: string | null;
  new_agent_id: string | null;
  trigger_reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
  user_profile?: {
    name: string;
    email: string;
  };
  previous_agent_profile?: {
    name: string;
    email: string;
  };
  new_agent_profile?: {
    name: string;
    email: string;
  };
}

export const useChatReassignmentLogs = (limit = 50) => {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['chat-reassignment-logs', limit],
    queryFn: async () => {
      // First get the logs
      const { data: logsData, error: logsError } = await supabase
        .from('chat_reassignment_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (logsError) throw logsError;

      // Get unique user IDs for profile lookup
      const userIds = new Set<string>();
      logsData?.forEach(log => {
        if (log.user_id) userIds.add(log.user_id);
        if (log.previous_agent_id) userIds.add(log.previous_agent_id);
        if (log.new_agent_id) userIds.add(log.new_agent_id);
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(
        profiles?.map(p => [p.user_id, { name: p.name, email: p.email }])
      );

      // Map logs with profile data
      return logsData?.map(log => ({
        ...log,
        user_profile: profileMap.get(log.user_id),
        previous_agent_profile: log.previous_agent_id ? profileMap.get(log.previous_agent_id) : undefined,
        new_agent_profile: log.new_agent_id ? profileMap.get(log.new_agent_id) : undefined,
      })) as ChatReassignmentLog[];
    },
  });

  return {
    logs,
    isLoading,
  };
};
