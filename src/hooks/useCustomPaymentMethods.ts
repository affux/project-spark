import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface CustomPaymentMethod {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  is_enabled: boolean;
  custom_message: string | null;
  method_type: string;
  sort_order: number;
  config: Json;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentMethodInput {
  name: string;
  description?: string;
  icon_url?: string;
  is_enabled?: boolean;
  custom_message?: string;
  method_type: 'payment' | 'payout';
  sort_order?: number;
  config?: Json;
}

export interface UpdatePaymentMethodInput {
  id: string;
  name?: string;
  description?: string;
  icon_url?: string;
  is_enabled?: boolean;
  custom_message?: string;
  sort_order?: number;
  config?: Json;
}

export function useCustomPaymentMethods(type?: 'payment' | 'payout') {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const methodsQuery = useQuery({
    queryKey: ['custom-payment-methods', type],
    queryFn: async () => {
      let query = supabase
        .from('custom_payment_methods')
        .select('*')
        .order('sort_order', { ascending: true });

      if (type) {
        query = query.eq('method_type', type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CustomPaymentMethod[];
    },
  });

  const createMethodMutation = useMutation({
    mutationFn: async (input: CreatePaymentMethodInput) => {
      const { data, error } = await supabase
        .from('custom_payment_methods')
        .insert({
          name: input.name,
          description: input.description || null,
          icon_url: input.icon_url || null,
          is_enabled: input.is_enabled ?? true,
          custom_message: input.custom_message || null,
          method_type: input.method_type,
          sort_order: input.sort_order ?? 0,
          config: input.config || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data as CustomPaymentMethod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-payment-methods'] });
      toast({
        title: 'Payment Method Added',
        description: 'The new payment method has been created.',
      });
    },
    onError: (error) => {
      console.error('Error creating payment method:', error);
      toast({
        title: 'Error',
        description: 'Failed to create payment method.',
        variant: 'destructive',
      });
    },
  });

  const updateMethodMutation = useMutation({
    mutationFn: async (input: UpdatePaymentMethodInput) => {
      const { id, ...updates } = input;
      const updateData: Record<string, unknown> = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.icon_url !== undefined) updateData.icon_url = updates.icon_url;
      if (updates.is_enabled !== undefined) updateData.is_enabled = updates.is_enabled;
      if (updates.custom_message !== undefined) updateData.custom_message = updates.custom_message;
      if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;
      if (updates.config !== undefined) updateData.config = updates.config;

      const { data, error } = await supabase
        .from('custom_payment_methods')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CustomPaymentMethod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-payment-methods'] });
      toast({
        title: 'Payment Method Updated',
        description: 'The payment method has been updated.',
      });
    },
    onError: (error) => {
      console.error('Error updating payment method:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment method.',
        variant: 'destructive',
      });
    },
  });

  const deleteMethodMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-payment-methods'] });
      toast({
        title: 'Payment Method Deleted',
        description: 'The payment method has been removed.',
      });
    },
    onError: (error) => {
      console.error('Error deleting payment method:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete payment method.',
        variant: 'destructive',
      });
    },
  });

  const toggleMethodMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('custom_payment_methods')
        .update({ is_enabled })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-payment-methods'] });
    },
    onError: (error) => {
      console.error('Error toggling payment method:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment method status.',
        variant: 'destructive',
      });
    },
  });

  return {
    methods: methodsQuery.data || [],
    isLoading: methodsQuery.isLoading,
    createMethod: createMethodMutation.mutate,
    updateMethod: updateMethodMutation.mutate,
    deleteMethod: deleteMethodMutation.mutate,
    toggleMethod: toggleMethodMutation.mutate,
    isCreating: createMethodMutation.isPending,
    isUpdating: updateMethodMutation.isPending,
    isDeleting: deleteMethodMutation.isPending,
  };
}
