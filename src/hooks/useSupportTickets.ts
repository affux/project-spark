import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SupportTicket {
  id: string;
  message: string;
  created_at: string;
  category: string;
  subject: string;
  hasReply: boolean;
  lastReply?: {
    message: string;
    created_at: string;
  };
}

const parseTicketMessage = (message: string): { category: string; subject: string; content: string } | null => {
  if (!message.startsWith('[SUPPORT TICKET]')) return null;
  
  const categoryMatch = message.match(/Category: (.+)/);
  const subjectMatch = message.match(/Subject: (.+)/);
  const contentMatch = message.split('\n\n').slice(1).join('\n\n');
  
  return {
    category: categoryMatch?.[1] || 'Other',
    subject: subjectMatch?.[1] || 'No Subject',
    content: contentMatch || message,
  };
};

export const useSupportTickets = () => {
  const { user } = useAuth();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch all chat messages for the user
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group messages into tickets (user messages that start with [SUPPORT TICKET])
      const ticketMap = new Map<string, SupportTicket>();
      
      messages?.forEach((msg) => {
        if (msg.sender_role === 'user') {
          const parsed = parseTicketMessage(msg.message);
          if (parsed) {
            ticketMap.set(msg.id, {
              id: msg.id,
              message: parsed.content,
              created_at: msg.created_at,
              category: parsed.category,
              subject: parsed.subject,
              hasReply: false,
            });
          }
        }
      });

      // Find replies (admin messages after each ticket)
      const ticketIds = Array.from(ticketMap.keys());
      let currentTicketId: string | null = null;

      messages?.forEach((msg) => {
        if (msg.sender_role === 'user' && ticketIds.includes(msg.id)) {
          currentTicketId = msg.id;
        } else if (msg.sender_role === 'admin' && currentTicketId) {
          const ticket = ticketMap.get(currentTicketId);
          if (ticket) {
            ticket.hasReply = true;
            ticket.lastReply = {
              message: msg.message,
              created_at: msg.created_at,
            };
          }
        }
      });

      // Convert to array and sort by date (newest first)
      return Array.from(ticketMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!user?.id,
  });

  return {
    tickets,
    isLoading,
    totalTickets: tickets.length,
    openTickets: tickets.filter(t => !t.hasReply).length,
    resolvedTickets: tickets.filter(t => t.hasReply).length,
  };
};
