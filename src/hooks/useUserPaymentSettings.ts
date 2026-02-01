import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserPaymentSettings {
  id: string;
  user_id: string;
  enabled_methods: {
    upi: boolean;
    wallet: boolean;
    bank_transfer: boolean;
    usd_wallet: boolean;
  };
  custom_upi_id: string | null;
  custom_upi_qr_url: string | null;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

const defaultEnabledMethods = {
  upi: true,
  wallet: true,
  bank_transfer: true,
  usd_wallet: true,
};

// Helper to safely parse enabled_methods from database JSON
const parseEnabledMethods = (data: unknown): typeof defaultEnabledMethods => {
  if (!data || typeof data !== 'object') {
    return defaultEnabledMethods;
  }
  const obj = data as Record<string, unknown>;
  return {
    upi: typeof obj.upi === 'boolean' ? obj.upi : true,
    wallet: typeof obj.wallet === 'boolean' ? obj.wallet : true,
    bank_transfer: typeof obj.bank_transfer === 'boolean' ? obj.bank_transfer : true,
    usd_wallet: typeof obj.usd_wallet === 'boolean' ? obj.usd_wallet : true,
  };
};

export const useUserPaymentSettings = (userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch settings for a specific user
  const { data: settings, isLoading } = useQuery({
    queryKey: ['user-payment-settings', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('user_payment_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      // Return default settings if none exist
      if (!data) {
        return {
          user_id: userId,
          enabled_methods: defaultEnabledMethods,
          custom_upi_id: null,
          custom_upi_qr_url: null,
          notes: null,
        } as Partial<UserPaymentSettings>;
      }
      
      // Parse enabled_methods safely from JSON
      return {
        ...data,
        enabled_methods: parseEnabledMethods(data.enabled_methods),
      } as UserPaymentSettings;
    },
    enabled: !!userId,
  });

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (newSettings: Partial<UserPaymentSettings> & { user_id: string }) => {
      const { data: existing } = await supabase
        .from('user_payment_settings')
        .select('id')
        .eq('user_id', newSettings.user_id)
        .maybeSingle();

      const { data: { user } } = await supabase.auth.getUser();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_payment_settings')
          .update({
            enabled_methods: newSettings.enabled_methods,
            custom_upi_id: newSettings.custom_upi_id,
            custom_upi_qr_url: newSettings.custom_upi_qr_url,
            notes: newSettings.notes,
            updated_by: user?.id,
          })
          .eq('user_id', newSettings.user_id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_payment_settings')
          .insert({
            user_id: newSettings.user_id,
            enabled_methods: newSettings.enabled_methods,
            custom_upi_id: newSettings.custom_upi_id,
            custom_upi_qr_url: newSettings.custom_upi_qr_url,
            notes: newSettings.notes,
            updated_by: user?.id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-payment-settings', userId] });
      toast({
        title: 'Settings Saved',
        description: 'User payment settings have been updated.',
      });
    },
    onError: (error) => {
      console.error('Error saving payment settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save payment settings.',
        variant: 'destructive',
      });
    },
  });

  return {
    settings,
    isLoading,
    saveSettings: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
};

// Hook for user to check their own payment methods
export const useMyPaymentSettings = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['my-payment-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_payment_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // Return null settings with hasCustomSettings=false if no custom settings exist
      // This tells the UI to follow global settings only
      if (!data) {
        return {
          settings: {
            enabled_methods: defaultEnabledMethods,
            custom_upi_id: null,
            custom_upi_qr_url: null,
          },
          hasCustomSettings: false, // Admin hasn't manually set this user's settings
        };
      }
      
      // Parse enabled_methods safely from JSON
      return {
        settings: {
          ...data,
          enabled_methods: parseEnabledMethods(data.enabled_methods),
        } as UserPaymentSettings,
        hasCustomSettings: true, // Admin has manually configured this user's settings
      };
    },
  });

  return { 
    settings: data?.settings ?? null, 
    hasCustomSettings: data?.hasCustomSettings ?? false,
    isLoading 
  };
};
