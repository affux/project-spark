import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatCustomerName {
  id: string;
  user_id: string;
  indian_name_id: string;
  assigned_at: string;
  indian_name?: {
    id: string;
    name: string;
  };
}

export const useChatCustomerName = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch assigned customer name for the user's support chat
  const { data: chatCustomerName, isLoading } = useQuery({
    queryKey: ['chat-customer-name', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('chat_customer_names')
        .select(`
          *,
          indian_name:indian_names(id, name)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as ChatCustomerName | null;
    },
    enabled: !!user?.id,
  });

  // Assign a random customer name if not already assigned
  const assignCustomerNameMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if already assigned
      const { data: existing } = await supabase
        .from('chat_customer_names')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) return existing;

      // Get a random active Indian name
      const { data: names, error: namesError } = await supabase
        .from('indian_names')
        .select('id')
        .eq('is_active', true);

      if (namesError) throw namesError;
      if (!names || names.length === 0) throw new Error('No Indian names available');

      const randomName = names[Math.floor(Math.random() * names.length)];

      const { data, error } = await supabase
        .from('chat_customer_names')
        .insert({
          user_id: user.id,
          indian_name_id: randomName.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-customer-name', user?.id] });
    },
  });

  return {
    customerName: chatCustomerName?.indian_name?.name || null,
    isLoading,
    assignCustomerName: assignCustomerNameMutation.mutate,
    isAssigning: assignCustomerNameMutation.isPending,
  };
};