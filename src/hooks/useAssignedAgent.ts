import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

interface AssignedAgent {
  id: string;
  name: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  isChatClosed: boolean;
}

export const useAssignedAgent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: assignedAgent, isLoading, refetch } = useQuery({
    queryKey: ['assigned-agent', user?.id],
    queryFn: async (): Promise<AssignedAgent | null> => {
      if (!user?.id) {
        console.log('[useAssignedAgent] No user ID');
        return null;
      }

      console.log('[useAssignedAgent] Fetching for user:', user.id);

      // Get the most recent active chat session for this user
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('assigned_agent_id, status, user_messages_cleared_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('[useAssignedAgent] Session:', session, 'Error:', sessionError);

      // Only show agent when admin has explicitly assigned themselves (assigned_agent_id exists)
      if (!session?.assigned_agent_id) {
        console.log('[useAssignedAgent] No assigned agent - waiting for agent');
        return null;
      }

      const isChatClosed = session.status === 'closed' || session.status === 'user_left';

      // Check for chat customer name (admin's pseudonym display)
      const { data: customerName } = await supabase
        .from('chat_customer_names')
        .select(`
          indian_name:indian_names(name)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      // Get agent presence - only relevant if chat is not closed
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: presence } = await supabase
        .from('support_agent_presence')
        .select('is_online, last_seen_at')
        .eq('user_id', session.assigned_agent_id)
        .maybeSingle();

      // Agent is only "online" if chat is active AND presence shows online
      const isOnline = !isChatClosed && 
        presence?.is_online === true && 
        presence?.last_seen_at && 
        new Date(presence.last_seen_at) >= new Date(fiveMinutesAgo);

      // If there's an Indian name assigned, use it as display name
      if (customerName?.indian_name) {
        const indianName = customerName.indian_name as { name: string };
        console.log('[useAssignedAgent] Using Indian name as agent:', indianName.name);
        
        return {
          id: session.assigned_agent_id,
          name: indianName.name,
          isOnline: !!isOnline,
          lastSeenAt: presence?.last_seen_at || null,
          isChatClosed,
        };
      }

      // No Indian name, use the secure RPC function to get only the agent's name
      // This prevents exposure of sensitive profile data (email, IP, wallet balance, etc.)
      const { data: agentName, error: agentError } = await supabase
        .rpc('get_assigned_agent_name', { p_user_id: user.id });

      console.log('[useAssignedAgent] Agent name from RPC:', agentName);

      if (agentError || !agentName) {
        // Fallback to "Support" if we can't get the name
        return {
          id: session.assigned_agent_id,
          name: 'Support',
          isOnline: !!isOnline,
          lastSeenAt: presence?.last_seen_at || null,
          isChatClosed,
        };
      }

      return {
        id: session.assigned_agent_id,
        name: agentName,
        isOnline: !!isOnline,
        lastSeenAt: presence?.last_seen_at || null,
        isChatClosed,
      };
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Subscribe to real-time changes for immediate updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`assigned-agent-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['assigned-agent', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_agent_presence',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['assigned-agent', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_customer_names',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['assigned-agent', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh when new messages arrive (especially admin messages)
          queryClient.invalidateQueries({ queryKey: ['assigned-agent', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    assignedAgent,
    isLoading,
    hasAssignedAgent: !!assignedAgent,
    isChatClosed: assignedAgent?.isChatClosed ?? false,
  };
};
