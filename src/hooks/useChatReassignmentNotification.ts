import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface ReassignmentEvent {
  previousAgentName: string | null;
  newAgentName: string | null;
  timestamp: Date;
  reason: string;
}

interface AgentDisconnectEvent {
  agentName: string | null;
  timestamp: Date;
  isReconnecting: boolean;
}

export const useChatReassignmentNotification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastReassignment, setLastReassignment] = useState<ReassignmentEvent | null>(null);
  const [currentAgentName, setCurrentAgentName] = useState<string>('Support');
  const [agentDisconnected, setAgentDisconnected] = useState<AgentDisconnectEvent | null>(null);
  const [chatStatus, setChatStatus] = useState<string>('active');
  const previousAgentNameRef = useRef<string>('Support');
  const hasShownToastRef = useRef<Set<string>>(new Set());
  const lastDisconnectMessageRef = useRef<string | null>(null);

  // Fetch current agent name
  const fetchCurrentAgentName = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: customerName } = await supabase
        .from('chat_customer_names')
        .select('indian_name_id')
        .eq('user_id', user.id)
        .single();

      if (customerName?.indian_name_id) {
        const { data: nameData } = await supabase
          .from('indian_names')
          .select('name')
          .eq('id', customerName.indian_name_id)
          .single();

        if (nameData?.name) {
          const newName = nameData.name;
          
          // Check if name changed (reassignment happened)
          if (previousAgentNameRef.current !== 'Support' && 
              previousAgentNameRef.current !== newName) {
            // Reassignment detected
            const eventKey = `${previousAgentNameRef.current}-${newName}-${Date.now()}`;
            
            if (!hasShownToastRef.current.has(eventKey)) {
              hasShownToastRef.current.add(eventKey);
              
              setLastReassignment({
                previousAgentName: previousAgentNameRef.current,
                newAgentName: newName,
                timestamp: new Date(),
                reason: 'agent_change',
              });

              // Clear agent disconnected state
              setAgentDisconnected(null);

              // Show toast notification
              toast({
                title: 'Support Agent Changed',
                description: `We have reassigned your chat to ${newName} to assist you.`,
                duration: 5000,
              });
            }
          }
          
          previousAgentNameRef.current = newName;
          setCurrentAgentName(newName);
        }
      }
    } catch (error) {
      console.error('Failed to fetch agent name:', error);
    }
  }, [user?.id, toast]);

  // Fetch chat session status
  const fetchChatStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('status, assigned_agent_id')
        .eq('user_id', user.id)
        .single();

      if (session) {
        setChatStatus(session.status);
        
        // If status changed to waiting_for_support, agent might have disconnected
        if (session.status === 'waiting_for_support' && !session.assigned_agent_id) {
          setAgentDisconnected({
            agentName: previousAgentNameRef.current,
            timestamp: new Date(),
            isReconnecting: true,
          });
        } else if (session.status === 'active' && session.assigned_agent_id) {
          // Agent is assigned, clear disconnect state
          setAgentDisconnected(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch chat status:', error);
    }
  }, [user?.id]);

  // Subscribe to chat_customer_names changes for real-time name updates
  useEffect(() => {
    if (!user?.id) return;

    // Initial fetch
    fetchCurrentAgentName();
    fetchChatStatus();

    // Subscribe to changes
    const channel = supabase
      .channel('chat-reassignment-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_customer_names',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCurrentAgentName();
          queryClient.invalidateQueries({ queryKey: ['chat-customer-name'] });
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
        (payload) => {
          const message = payload.new as { id: string; message: string; sender_role: string };
          
          // Prevent duplicate toast for the same message
          if (lastDisconnectMessageRef.current === message.id) {
            return;
          }
          
          // Check if it's a system message about agent disconnect
          if (message.sender_role === 'system') {
            lastDisconnectMessageRef.current = message.id;
            
            if (message.message.includes('temporarily left the chat')) {
              // Agent disconnected
              setAgentDisconnected({
                agentName: previousAgentNameRef.current,
                timestamp: new Date(),
                isReconnecting: true,
              });
              
              toast({
                title: 'Agent Disconnected',
                description: 'Your support agent has disconnected. We are reconnecting you now.',
                duration: 5000,
              });
            } else if (message.message.includes('has reconnected')) {
              // Agent reconnected
              setAgentDisconnected(null);
              
              toast({
                title: 'Agent Reconnected',
                description: 'Your support agent has reconnected and will continue assisting you.',
                duration: 5000,
              });
            }
          }
          
          // Check if it's an admin message about reassignment (inactivity)
          if (message.sender_role === 'admin' && 
              message.message.includes('support representative has been changed')) {
            // Refresh the agent name
            fetchCurrentAgentName();
            setAgentDisconnected(null);
            
            // Show toast for the system message
            toast({
              title: 'Support Agent Reassigned',
              description: 'We have reassigned your chat to another support agent to assist you.',
              duration: 5000,
            });
          }
          
          // Refresh messages
          queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const session = payload.new as { status: string; assigned_agent_id: string | null };
          
          setChatStatus(session.status);
          
          // Handle status transitions
          if (session.status === 'waiting_for_support' && !session.assigned_agent_id) {
            setAgentDisconnected({
              agentName: previousAgentNameRef.current,
              timestamp: new Date(),
              isReconnecting: true,
            });
          } else if (session.status === 'active' && session.assigned_agent_id) {
            // Agent assigned - refresh agent name and clear disconnect state
            setAgentDisconnected(null);
            fetchCurrentAgentName();
          }
          
          queryClient.invalidateQueries({ queryKey: ['chat-session'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchCurrentAgentName, fetchChatStatus, queryClient, toast]);

  return {
    currentAgentName,
    lastReassignment,
    agentDisconnected,
    chatStatus,
    isAgentDisconnected: !!agentDisconnected,
    isWaitingForSupport: chatStatus === 'waiting_for_support',
    refreshAgentName: fetchCurrentAgentName,
    refreshChatStatus: fetchChatStatus,
  };
};
