import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChatReassignmentSettings } from '@/hooks/useChatReassignmentSettings';

interface TypingState {
  user_id: string;
  is_typing: boolean;
  timestamp: number;
}

export const useTypingIndicator = (conversationUserId?: string) => {
  const { user } = useAuth();
  const { settings } = useChatReassignmentSettings();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState<string>('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);
  const typingClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const roomName = conversationUserId 
    ? `typing-${conversationUserId}` 
    : user?.id 
      ? `typing-${user.id}` 
      : null;

  // Get typing timeout from settings (default 5 seconds)
  const typingTimeoutMs = (settings.typing_indicator_timeout || 5) * 1000;

  useEffect(() => {
    if (!roomName || !user?.id) return;

    const channel = supabase.channel(roomName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typingUsers = Object.entries(state)
          .filter(([key, value]) => {
            const presenceData = (value as any[])[0];
            // Also check if typing timestamp is within timeout window
            const isRecent = presenceData?.timestamp && 
              (Date.now() - presenceData.timestamp) < typingTimeoutMs;
            return key !== user.id && presenceData?.is_typing && isRecent;
          })
          .map(([key, value]) => ({
            user_id: key,
            name: (value as any[])[0]?.name || 'Someone',
          }));

        if (typingUsers.length > 0) {
          setIsOtherTyping(true);
          setTypingUserName(typingUsers[0].name);
          
          // Auto-clear typing indicator after timeout
          if (typingClearTimeoutRef.current) {
            clearTimeout(typingClearTimeoutRef.current);
          }
          typingClearTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false);
            setTypingUserName('');
          }, typingTimeoutMs);
        } else {
          setIsOtherTyping(false);
          setTypingUserName('');
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            is_typing: false,
            name: user.role === 'admin' ? 'Admin' : user.name,
            timestamp: Date.now(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (typingClearTimeoutRef.current) {
        clearTimeout(typingClearTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [roomName, user?.id, user?.name, user?.role, typingTimeoutMs]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current || !user?.id) return;

    const now = Date.now();
    // Throttle typing updates to once per 500ms
    if (isTyping && now - lastTypingRef.current < 500) return;
    lastTypingRef.current = now;

    try {
      await channelRef.current.track({
        is_typing: isTyping,
        name: user.role === 'admin' ? 'Admin' : user.name,
        timestamp: now,
      });

      // Auto-clear typing after configurable timeout
      if (isTyping) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          channelRef.current?.track({
            is_typing: false,
            name: user.role === 'admin' ? 'Admin' : user.name,
            timestamp: Date.now(),
          });
        }, typingTimeoutMs);
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [user?.id, user?.name, user?.role, typingTimeoutMs]);

  const stopTyping = useCallback(() => {
    setTyping(false);
  }, [setTyping]);

  return {
    isOtherTyping,
    typingUserName,
    setTyping,
    stopTyping,
  };
};
