import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAdminChatCustomerName = (userId: string | undefined) => {
  const { data: customerName, isLoading } = useQuery({
    queryKey: ['admin-chat-customer-name', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('chat_customer_names')
        .select(`
          *,
          indian_name:indian_names(id, name)
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data?.indian_name?.name || null;
    },
    enabled: !!userId,
  });

  return {
    customerName,
    isLoading,
  };
};
