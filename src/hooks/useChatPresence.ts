import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface UseChatPresenceOptions {
  inactivityTimeout?: number; // in seconds (default 30)
  immediateLeaveOnClose?: boolean;
  gracePeriod?: number; // in seconds (default 30)
}

interface ChatSession {
  id: string;
  user_id: string;
  status: 'active' | 'user_left' | 'waiting_for_support' | 'closed';
  assigned_agent_id: string | null;
  previous_agent_id: string | null;
  grace_period_expires_at: string | null;
  user_left_at: string | null;
  last_user_activity_at: string | null;
  reassignment_count: number;
}

export const useChatPresence = (options: UseChatPresenceOptions = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isInGracePeriod, setIsInGracePeriod] = useState(false);
  const [gracePeriodRemaining, setGracePeriodRemaining] = useState(0);

  const {
    inactivityTimeout = 30, // 30 seconds default
    immediateLeaveOnClose = true,
    gracePeriod = 30, // 30 seconds grace period
  } = options;

  // Clear the inactivity timer
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    setIsInGracePeriod(false);
    setGracePeriodRemaining(0);
  }, []);

  // Start the inactivity timer (just tracks inactivity, no auto-reassignment)
  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    
    inactivityTimerRef.current = setTimeout(async () => {
      if (!user?.id) return;
      
      console.log('Inactivity timeout reached - updating session status only (no auto-reassignment)');
      
      try {
        // Just update session status, no agent reassignment
        await supabase
          .from('chat_sessions')
          .update({
            status: 'user_left',
            user_left_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        
        queryClient.invalidateQueries({ queryKey: ['chat-session'] });
      } catch (error) {
        console.error('Failed to update session status:', error);
      }
    }, inactivityTimeout * 1000);
  }, [user?.id, inactivityTimeout, clearInactivityTimer, queryClient]);

  // Update user activity timestamp and reset timer
  const updateActivity = useCallback(async () => {
    if (!user?.id) return;
    lastActivityRef.current = Date.now();
    
    // Clear any pending inactivity timer since user is active
    clearInactivityTimer();

    try {
      await supabase
        .from('chat_sessions')
        .upsert({
          user_id: user.id,
          status: 'active',
          last_user_activity_at: new Date().toISOString(),
          user_left_at: null,
          grace_period_expires_at: null,
        }, {
          onConflict: 'user_id',
        });
    } catch (error) {
      console.error('Failed to update chat activity:', error);
    }
  }, [user?.id, clearInactivityTimer]);

  // Mark user as left (no auto-reassignment)
  const markUserLeft = useCallback(async (_reason: string = 'manual_exit') => {
    if (!user?.id) return;

    setIsInGracePeriod(true);
    setGracePeriodRemaining(gracePeriod);

    try {
      // Just update session status - no agent reassignment
      await supabase
        .from('chat_sessions')
        .upsert({
          user_id: user.id,
          status: 'user_left',
          user_left_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      console.log('User marked as left - no auto-reassignment');

      // Start countdown for UI only
      const countdownInterval = setInterval(() => {
        setGracePeriodRemaining(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setIsInGracePeriod(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Cleanup after grace period
      setTimeout(() => {
        clearInterval(countdownInterval);
        setIsInGracePeriod(false);
        queryClient.invalidateQueries({ queryKey: ['chat-session'] });
      }, gracePeriod * 1000);

    } catch (error) {
      console.error('Failed to mark user as left:', error);
    }
  }, [user?.id, gracePeriod, queryClient]);

  // Restore session when user returns (no auto-assignment)
  const restoreSession = useCallback(async () => {
    if (!user?.id) return;

    // Clear any pending inactivity timer
    clearInactivityTimer();
    setIsInGracePeriod(false);

    try {
      // Check current session state
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle() as { data: ChatSession | null };

      if (session) {
        // User returned - just mark as active, keep existing agent (or none)
        const newStatus = session.assigned_agent_id ? 'active' : 'waiting_for_support';
        
        await supabase
          .from('chat_sessions')
          .update({
            status: newStatus,
            last_user_activity_at: new Date().toISOString(),
            user_left_at: null,
            grace_period_expires_at: null,
          })
          .eq('user_id', user.id);
          
        console.log('User returned - status:', newStatus, '(no auto-assignment)');
      } else {
        // Create new session without agent
        await updateActivity();
      }

      queryClient.invalidateQueries({ queryKey: ['chat-session'] });
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
  }, [user?.id, queryClient, updateActivity, clearInactivityTimer]);

  // Setup presence tracking
  useEffect(() => {
    if (!user?.id) return;

    // Initial session restore
    restoreSession();

    // Setup heartbeat (every 30 seconds)
    heartbeatIntervalRef.current = setInterval(() => {
      // Only update if there was recent activity
      const timeSinceLastActivity = (Date.now() - lastActivityRef.current) / 1000;
      if (timeSinceLastActivity < 60) {
        updateActivity();
      }
    }, 15000);

    // Track user activity to reset inactivity timer
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    const handleActivity = () => {
      const now = Date.now();
      // Debounce activity updates (max once per second)
      if (now - lastActivityRef.current > 1000) {
        lastActivityRef.current = now;
        // Reset inactivity timer on any activity
        startInactivityTimer();
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Handle page visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (immediateLeaveOnClose) {
          markUserLeft('tab_hidden');
        } else {
          // Start inactivity timer when tab is hidden
          startInactivityTimer();
        }
      } else if (document.visibilityState === 'visible') {
        restoreSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle page unload
    const handleBeforeUnload = () => {
      if (immediateLeaveOnClose) {
        // Use sendBeacon for reliable delivery
        const payload = JSON.stringify({
          action: 'user_left',
          user_id: user.id,
          trigger_reason: 'page_close',
        });
        
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-reassignment`,
          payload
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      clearInactivityTimer();
      
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id, updateActivity, markUserLeft, restoreSession, startInactivityTimer, clearInactivityTimer, immediateLeaveOnClose]);

  return {
    updateActivity,
    markUserLeft,
    restoreSession,
    isInGracePeriod,
    gracePeriodRemaining,
  };
};
