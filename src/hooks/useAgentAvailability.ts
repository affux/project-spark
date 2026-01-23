import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AgentAvailability {
  isAnyAgentOnline: boolean;
  onlineAgentCount: number;
  isLoading: boolean;
  hasAssignedAgent: boolean;
}

export const useAgentAvailability = (): AgentAvailability => {
  const { user } = useAuth();
  const [isAnyAgentOnline, setIsAnyAgentOnline] = useState(false);
  const [onlineAgentCount, setOnlineAgentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAssignedAgent, setHasAssignedAgent] = useState(false);

  const checkAvailability = async () => {
    try {
      // First check if user has an assigned agent (this means support is "live" for them)
      if (user?.id) {
        const { data: session } = await supabase
          .from('chat_sessions')
          .select('assigned_agent_id, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (session?.assigned_agent_id) {
          setHasAssignedAgent(true);
          setIsAnyAgentOnline(true);
          setOnlineAgentCount(1);
          setIsLoading(false);
          return;
        }
      }

      // Check for agents who are online from presence table
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('support_agent_presence')
        .select('id')
        .eq('is_online', true)
        .gte('last_seen_at', fiveMinutesAgo);

      if (error) {
        console.error('Error checking agent availability:', error);
        // If there's an error with presence, still show as online if we have assigned agent
        return;
      }

      const count = data?.length || 0;
      setOnlineAgentCount(count);
      setIsAnyAgentOnline(count > 0 || hasAssignedAgent);
    } catch (error) {
      console.error('Error checking agent availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAvailability();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('agent-availability')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_agent_presence',
        },
        () => {
          checkAvailability();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
        },
        () => {
          checkAvailability();
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(checkAvailability, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.id]);

  return { isAnyAgentOnline, onlineAgentCount, isLoading, hasAssignedAgent };
};
