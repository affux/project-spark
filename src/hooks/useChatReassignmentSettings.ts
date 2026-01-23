import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChatReassignmentSettings {
  chat_auto_reassignment_enabled: boolean;
  chat_inactivity_timeout: number;
  chat_immediate_leave_on_close: boolean;
  chat_grace_period: number;
  chat_assignment_strategy: 'least_active' | 'round_robin' | 'priority_based';
  chat_exclude_previous_agent: boolean;
  max_chats_per_agent: number;
  chat_allow_busy_agent_fallback: boolean;
  chat_auto_assign_on_availability: boolean;
  chat_notify_new_agent: boolean;
  chat_notify_agent_sound: boolean;
  chat_notify_admin_on_failure: boolean;
  chat_enable_reassignment_logs: boolean;
  chat_log_retention_days: number;
  chat_prevent_rapid_reassignment: boolean;
  chat_max_reassignments: number;
  chat_lock_after_max_reassignments: boolean;
  // Agent inactivity settings
  agent_auto_offline_enabled: boolean;
  agent_inactivity_timeout: number; // seconds before agent goes offline
  typing_indicator_timeout: number; // seconds before typing indicator clears
}

const defaultSettings: ChatReassignmentSettings = {
  chat_auto_reassignment_enabled: true,
  chat_inactivity_timeout: 300,
  chat_immediate_leave_on_close: true,
  chat_grace_period: 60,
  chat_assignment_strategy: 'least_active',
  chat_exclude_previous_agent: true,
  max_chats_per_agent: 10,
  chat_allow_busy_agent_fallback: true,
  chat_auto_assign_on_availability: true,
  chat_notify_new_agent: true,
  chat_notify_agent_sound: true,
  chat_notify_admin_on_failure: true,
  chat_enable_reassignment_logs: true,
  chat_log_retention_days: 90,
  chat_prevent_rapid_reassignment: true,
  chat_max_reassignments: 5,
  chat_lock_after_max_reassignments: false,
  // Agent inactivity settings
  agent_auto_offline_enabled: true,
  agent_inactivity_timeout: 600, // 10 minutes default
  typing_indicator_timeout: 5, // 5 seconds default
};

export const useChatReassignmentSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings = defaultSettings, isLoading } = useQuery({
    queryKey: ['chat-reassignment-settings'],
    queryFn: async () => {
      const keys = Object.keys(defaultSettings);
      
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', keys);

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach(item => {
        settingsMap[item.key] = item.value;
      });

      // Parse values with proper types
      return {
        chat_auto_reassignment_enabled: settingsMap.chat_auto_reassignment_enabled === 'true',
        chat_inactivity_timeout: parseInt(settingsMap.chat_inactivity_timeout || '300'),
        chat_immediate_leave_on_close: settingsMap.chat_immediate_leave_on_close === 'true',
        chat_grace_period: parseInt(settingsMap.chat_grace_period || '60'),
        chat_assignment_strategy: (settingsMap.chat_assignment_strategy || 'least_active') as ChatReassignmentSettings['chat_assignment_strategy'],
        chat_exclude_previous_agent: settingsMap.chat_exclude_previous_agent === 'true',
        max_chats_per_agent: parseInt(settingsMap.max_chats_per_agent || '10'),
        chat_allow_busy_agent_fallback: settingsMap.chat_allow_busy_agent_fallback === 'true',
        chat_auto_assign_on_availability: settingsMap.chat_auto_assign_on_availability === 'true',
        chat_notify_new_agent: settingsMap.chat_notify_new_agent === 'true',
        chat_notify_agent_sound: settingsMap.chat_notify_agent_sound === 'true',
        chat_notify_admin_on_failure: settingsMap.chat_notify_admin_on_failure === 'true',
        chat_enable_reassignment_logs: settingsMap.chat_enable_reassignment_logs === 'true',
        chat_log_retention_days: parseInt(settingsMap.chat_log_retention_days || '90'),
        chat_prevent_rapid_reassignment: settingsMap.chat_prevent_rapid_reassignment === 'true',
        chat_max_reassignments: parseInt(settingsMap.chat_max_reassignments || '5'),
        chat_lock_after_max_reassignments: settingsMap.chat_lock_after_max_reassignments === 'true',
        // Agent inactivity settings
        agent_auto_offline_enabled: settingsMap.agent_auto_offline_enabled !== 'false',
        agent_inactivity_timeout: parseInt(settingsMap.agent_inactivity_timeout || '600'),
        typing_indicator_timeout: parseInt(settingsMap.typing_indicator_timeout || '5'),
      } as ChatReassignmentSettings;
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          key,
          value,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-reassignment-settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update setting',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateSetting = (key: keyof ChatReassignmentSettings, value: boolean | number | string) => {
    updateSettingMutation.mutate({
      key,
      value: String(value),
    });
  };

  return {
    settings,
    isLoading,
    updateSetting,
    isUpdating: updateSettingMutation.isPending,
  };
};
