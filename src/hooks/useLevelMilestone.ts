import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { calculateUserLevel, UserLevel } from '@/lib/userLevelUtils';
import { useToast } from '@/hooks/use-toast';

interface MilestoneData {
  completedOrders: number;
  currentLevel: UserLevel;
}

const LEVEL_MESSAGES: Record<UserLevel, { title: string; description: string }> = {
  bronze: {
    title: '🥉 Welcome!',
    description: 'Start completing orders to earn higher badges!',
  },
  silver: {
    title: '🥈 Silver Badge Unlocked!',
    description: 'Congratulations! You\'ve reached Silver status. Keep going for Gold!',
  },
  gold: {
    title: '🥇 Gold Badge Achieved!',
    description: 'Amazing! You\'ve reached the highest level. You\'re a top performer!',
  },
};

export const useLevelMilestone = () => {
  const { user, session } = useAuth();
  const { settingsMap } = usePlatformSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const previousLevelRef = useRef<UserLevel | null>(null);
  const hasInitializedRef = useRef(false);

  // Fetch current completed order count
  const { data: milestoneData } = useQuery<MilestoneData | null>({
    queryKey: ['user-milestone-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { count, error } = await (supabase
        .from('orders')
        .select('*', { count: 'exact', head: true }) as any)
        .eq('dropshipper_user_id', user.id)
        .eq('status', 'completed');
      
      if (error) throw error;
      
      const completedOrders = count || 0;
      const currentLevel = calculateUserLevel(
        completedOrders,
        settingsMap.level_threshold_silver,
        settingsMap.level_threshold_gold
      );
      
      return { completedOrders, currentLevel };
    },
    enabled: !!user?.id && !!session,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Check for level changes and show toast
  useEffect(() => {
    if (!milestoneData) return;
    
    const { currentLevel } = milestoneData;
    
    // Initialize on first load without showing notification
    if (!hasInitializedRef.current) {
      previousLevelRef.current = currentLevel;
      hasInitializedRef.current = true;
      return;
    }
    
    // Check if level has changed (upgraded)
    if (previousLevelRef.current && previousLevelRef.current !== currentLevel) {
      const levelOrder: UserLevel[] = ['bronze', 'silver', 'gold'];
      const prevIndex = levelOrder.indexOf(previousLevelRef.current);
      const currentIndex = levelOrder.indexOf(currentLevel);
      
      // Only show notification if upgraded (not downgraded)
      if (currentIndex > prevIndex) {
        const message = LEVEL_MESSAGES[currentLevel];
        toast({
          title: message.title,
          description: message.description,
          duration: 8000,
        });
        
        // Invalidate related queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['user-profile-level'] });
        queryClient.invalidateQueries({ queryKey: ['user-completed-orders-count'] });
      }
    }
    
    previousLevelRef.current = currentLevel;
  }, [milestoneData, toast, queryClient]);

  // Subscribe to order changes for real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('order-milestone-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `dropshipper_user_id=eq.${user.id}`,
        },
        (payload) => {
          // Refetch milestone data when an order is updated
          if (payload.new && (payload.new as { status: string }).status === 'completed') {
            queryClient.invalidateQueries({ queryKey: ['user-milestone-check', user.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return milestoneData;
};
