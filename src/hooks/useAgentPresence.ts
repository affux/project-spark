import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { playNotificationSound } from '@/lib/notificationSound';
import { useChatReassignmentSettings } from '@/hooks/useChatReassignmentSettings';
import { useToast } from '@/hooks/use-toast';

export const useAgentPresence = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const [inactivityWarning, setInactivityWarning] = useState(false);
  
  const isAdmin = user?.role === 'admin';
  
  // Get settings for auto-offline
  const { settings } = useChatReassignmentSettings();

  // Fetch current agent presence
  const { data: presence, isLoading } = useQuery({
    queryKey: ['agent-presence', user?.id],
    queryFn: async () => {
      if (!user?.id || !isAdmin) return null;

      const { data, error } = await supabase
        .from('support_agent_presence')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id && isAdmin,
  });

  // Fetch all online agents
  const { data: onlineAgents = [] } = useQuery({
    queryKey: ['online-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_agent_presence')
        .select(`
          *,
          profiles:user_id (name, email)
        `)
        .eq('is_online', true)
        .order('active_chat_count', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  // Go online mutation
  const goOnlineMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('support_agent_presence')
        .upsert({
          user_id: user.id,
          is_online: true,
          last_seen_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      lastActivityRef.current = Date.now();
      setInactivityWarning(false);
      queryClient.invalidateQueries({ queryKey: ['agent-presence'] });
      queryClient.invalidateQueries({ queryKey: ['online-agents'] });
    },
  });

  // Go offline mutation - uses edge function to handle chat reassignment
  const goOfflineMutation = useMutation({
    mutationFn: async (disconnectReason: 'logout' | 'manual_leave' | 'inactivity' = 'logout') => {
      if (!user?.id) throw new Error('Not authenticated');

      // Call the edge function to properly handle going offline
      // This will reassign chats and send system messages
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-presence-update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            is_online: false,
            disconnect_reason: disconnectReason,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to go offline');
      }

      return response.json();
    },
    onSuccess: (_, disconnectReason) => {
      setInactivityWarning(false);
      queryClient.invalidateQueries({ queryKey: ['agent-presence'] });
      queryClient.invalidateQueries({ queryKey: ['online-agents'] });
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      
      if (disconnectReason === 'inactivity') {
        toast({
          title: 'Auto-offline',
          description: 'You have been set to offline due to inactivity.',
          variant: 'default',
        });
      }
    },
  });

  // Update activity - resets inactivity timer
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setInactivityWarning(false);
  }, []);

  // Update heartbeat
  const updateHeartbeat = useCallback(async () => {
    if (!user?.id || !isAdmin || !presence?.is_online) return;

    try {
      await supabase
        .from('support_agent_presence')
        .update({
          last_seen_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Failed to update agent heartbeat:', error);
    }
  }, [user?.id, isAdmin, presence?.is_online]);

  // Listen for new chat assignments
  useEffect(() => {
    if (!user?.id || !isAdmin) return;

    const channel = supabase
      .channel('agent-chat-assignments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_sessions',
          filter: `assigned_agent_id=eq.${user.id}`,
        },
        (payload) => {
          const newSession = payload.new as any;
          const oldSession = payload.old as any;

          // New assignment - also counts as activity
          if (newSession.assigned_agent_id === user.id && 
              oldSession.assigned_agent_id !== user.id) {
            updateActivity();
            playNotificationSound();
            
            // Show browser notification
            if (Notification.permission === 'granted') {
              new Notification('New Chat Assigned', {
                body: 'A new chat has been assigned to you',
                icon: '/favicon.ico',
                tag: 'chat-assignment',
              });
            }

            queryClient.invalidateQueries({ queryKey: ['agent-presence'] });
            queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isAdmin, queryClient, updateActivity]);

  // Setup heartbeat
  useEffect(() => {
    if (!isAdmin || !presence?.is_online) return;

    heartbeatIntervalRef.current = setInterval(() => {
      updateHeartbeat();
    }, 30000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [isAdmin, presence?.is_online, updateHeartbeat]);

  // Auto-offline due to inactivity
  useEffect(() => {
    if (!isAdmin || !presence?.is_online || !settings.agent_auto_offline_enabled) {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
      }
      return;
    }

    const timeoutMs = settings.agent_inactivity_timeout * 1000;
    const warningMs = Math.max(timeoutMs - 60000, timeoutMs * 0.9); // Warning 1 min before or 90%

    inactivityTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      
      // Show warning before going offline
      if (elapsed >= warningMs && elapsed < timeoutMs) {
        setInactivityWarning(true);
      }
      
      // Go offline due to inactivity
      if (elapsed >= timeoutMs) {
        console.log('Agent going offline due to inactivity');
        goOfflineMutation.mutate('inactivity');
      }
    }, 10000); // Check every 10 seconds

    return () => {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
      }
    };
  }, [isAdmin, presence?.is_online, settings.agent_auto_offline_enabled, settings.agent_inactivity_timeout]);

  // Track user activity
  useEffect(() => {
    if (!isAdmin || !presence?.is_online) return;

    const handleActivity = () => {
      updateActivity();
    };

    // Track various user activities
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [isAdmin, presence?.is_online, updateActivity]);

  // Handle page unload - go offline with disconnect reason
  useEffect(() => {
    if (!user?.id || !isAdmin) return;

    const handleBeforeUnload = () => {
      const payload = JSON.stringify({
        user_id: user.id,
        is_online: false,
        disconnect_reason: 'browser_close',
      });
      
      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-presence-update`,
        payload
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id, isAdmin]);

  return {
    presence,
    isLoading,
    isOnline: presence?.is_online ?? false,
    activeChatCount: presence?.active_chat_count ?? 0,
    onlineAgents,
    goOnline: goOnlineMutation.mutate,
    goOffline: goOfflineMutation.mutate,
    isGoingOnline: goOnlineMutation.isPending,
    isGoingOffline: goOfflineMutation.isPending,
    updateActivity,
    inactivityWarning,
    inactivityTimeout: settings.agent_inactivity_timeout,
  };
};
