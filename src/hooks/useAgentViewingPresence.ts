import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef } from 'react';

/**
 * Hook for admin to track that they are viewing a specific user's chat.
 * Updates agent_chat_presence table with heartbeat.
 */
export const useAgentViewingPresence = (viewingUserId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const heartbeatRef = useRef<number | null>(null);

  // Update or create presence entry
  const updatePresenceMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Upsert presence - agent can only view one chat at a time
      const { error } = await supabase
        .from('agent_chat_presence')
        .upsert(
          {
            agent_id: user.id,
            viewing_user_id: userId,
            last_seen_at: new Date().toISOString(),
          },
          {
            onConflict: 'agent_id',
          }
        );

      if (error) throw error;
    },
  });

  // Remove presence entry when leaving
  const removePresenceMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('agent_chat_presence')
        .delete()
        .eq('agent_id', user.id);

      if (error) throw error;
    },
  });

  // Start heartbeat when viewing a user's chat
  useEffect(() => {
    if (!viewingUserId || !user?.id) {
      // Clear presence when not viewing any chat
      removePresenceMutation.mutate();
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }

    // Initial presence update
    updatePresenceMutation.mutate(viewingUserId);

    // Heartbeat every 10 seconds
    heartbeatRef.current = window.setInterval(() => {
      updatePresenceMutation.mutate(viewingUserId);
    }, 10000);

    return () => {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      // Clean up presence on unmount
      removePresenceMutation.mutate();
    };
  }, [viewingUserId, user?.id]);

  // Clean up on window unload
  useEffect(() => {
    const handleUnload = () => {
      if (user?.id) {
        // Use sendBeacon for reliable cleanup
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/agent_chat_presence?agent_id=eq.${user.id}`,
          ''
        );
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user?.id]);

  return {
    updatePresence: updatePresenceMutation.mutate,
    removePresence: removePresenceMutation.mutate,
  };
};

/**
 * Hook for user to check if an agent is currently viewing their chat.
 */
export const useIsAgentViewingChat = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isAgentViewing, isLoading } = useQuery({
    queryKey: ['agent-viewing-presence', user?.id],
    queryFn: async (): Promise<{ isViewing: boolean; agentId: string | null }> => {
      if (!user?.id) return { isViewing: false, agentId: null };

      // Check if any agent is viewing this user's chat within the last 15 seconds
      const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('agent_chat_presence')
        .select('agent_id, last_seen_at')
        .eq('viewing_user_id', user.id)
        .gte('last_seen_at', fifteenSecondsAgo)
        .maybeSingle();

      if (error) {
        console.error('Error checking agent viewing presence:', error);
        return { isViewing: false, agentId: null };
      }

      return {
        isViewing: !!data,
        agentId: data?.agent_id || null,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Check every 5 seconds
  });

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`agent-viewing-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_chat_presence',
          filter: `viewing_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['agent-viewing-presence', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    isAgentViewing: isAgentViewing?.isViewing ?? false,
    agentId: isAgentViewing?.agentId ?? null,
    isLoading,
  };
};
