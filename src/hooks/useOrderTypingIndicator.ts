import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useOrderTypingIndicator = (orderId: string | null, userType: 'user' | 'admin') => {
  const { user } = useAuth();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string>('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  const roomName = orderId ? `order-typing-${orderId}` : null;

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
            return key !== user.id && presenceData?.is_typing;
          })
          .map(([key, value]) => ({
            user_id: key,
            userType: (value as any[])[0]?.userType || 'user',
          }));

        if (typingUsers.length > 0) {
          setIsOtherTyping(true);
          // Show appropriate label based on who is typing
          const typingUser = typingUsers[0];
          if (typingUser.userType === 'user') {
            setTypingLabel('Dropshipper is typing...');
          } else {
            setTypingLabel('Customer is typing...');
          }
        } else {
          setIsOtherTyping(false);
          setTypingLabel('');
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            is_typing: false,
            userType,
            timestamp: Date.now(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [roomName, user?.id, userType]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current || !user?.id) return;

    const now = Date.now();
    // Throttle typing updates to once per 500ms
    if (isTyping && now - lastTypingRef.current < 500) return;
    lastTypingRef.current = now;

    try {
      await channelRef.current.track({
        is_typing: isTyping,
        userType,
        timestamp: now,
      });

      // Auto-clear typing after 3 seconds
      if (isTyping) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          channelRef.current?.track({
            is_typing: false,
            userType,
            timestamp: Date.now(),
          });
        }, 3000);
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [user?.id, userType]);

  const stopTyping = useCallback(() => {
    setTyping(false);
  }, [setTyping]);

  return {
    isOtherTyping,
    typingLabel,
    setTyping,
    stopTyping,
  };
};
