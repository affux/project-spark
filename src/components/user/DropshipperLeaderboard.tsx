import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Award, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { calculateUserLevel, UserLevel } from '@/lib/userLevelUtils';

interface LeaderboardEntry {
  user_id: string;
  name: string;
  completed_orders: number;
  level: UserLevel;
  rank: number;
}

const levelColors: Record<UserLevel, string> = {
  bronze: 'bg-gradient-to-r from-amber-200 to-amber-300 text-amber-800 border-amber-400',
  silver: 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 border-slate-400',
  gold: 'bg-gradient-to-r from-yellow-300 to-yellow-400 text-yellow-800 border-yellow-500',
};

const rankIcons: Record<number, React.ReactNode> = {
  1: <Crown className="w-5 h-5 text-yellow-500" />,
  2: <Medal className="w-5 h-5 text-slate-400" />,
  3: <Medal className="w-5 h-5 text-amber-600" />,
};

export const DropshipperLeaderboard: React.FC = () => {
  const { user } = useAuth();
  const { settingsMap } = usePlatformSettings();

  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['dropshipper-leaderboard'],
    queryFn: async () => {
      // Get all dropshippers with their completed order counts
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name')
        .eq('is_active', true)
        .eq('user_status', 'approved');

      if (profilesError) throw profilesError;

      // Get completed orders count for each dropshipper
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('dropshipper_user_id' as any)
        .eq('status', 'completed');

      if (ordersError) throw ordersError;

      // Count orders per dropshipper
      const orderCounts: Record<string, number> = {};
      orders?.forEach(order => {
        const userId = (order as any).dropshipper_user_id;
        orderCounts[userId] = (orderCounts[userId] || 0) + 1;
      });

      // Build leaderboard entries
      const entries: LeaderboardEntry[] = (profiles || [])
        .map(profile => {
          const completedOrders = orderCounts[profile.user_id] || 0;
          const level = calculateUserLevel(
            completedOrders,
            settingsMap.level_threshold_silver,
            settingsMap.level_threshold_gold
          );
          return {
            user_id: profile.user_id,
            name: profile.name,
            completed_orders: completedOrders,
            level,
            rank: 0, // Will be set after sorting
          };
        })
        .filter(entry => entry.completed_orders > 0) // Only show dropshippers with completed orders
        .sort((a, b) => b.completed_orders - a.completed_orders)
        .slice(0, 10) // Top 10
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      return entries;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Find current user's rank
  const userRank = leaderboard?.find(entry => entry.user_id === user?.id);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Top Dropshippers
        </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Award className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No completed orders yet.</p>
            <p className="text-xs">Complete orders to appear on the leaderboard!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Top Dropshippers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {leaderboard.map((entry) => {
          const isCurrentUser = entry.user_id === user?.id;
          return (
            <div
              key={entry.user_id}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg transition-colors',
                isCurrentUser 
                  ? 'bg-primary/10 border border-primary/20' 
                  : 'hover:bg-muted/50'
              )}
            >
              {/* Rank */}
              <div className="w-8 flex justify-center">
                {rankIcons[entry.rank] || (
                  <span className="text-sm font-medium text-muted-foreground">
                    #{entry.rank}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-muted">
                  {entry.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium truncate',
                  isCurrentUser && 'text-primary'
                )}>
                  {entry.name}
                  {isCurrentUser && (
                    <span className="text-xs text-muted-foreground ml-1">(You)</span>
                  )}
                </p>
              </div>

              {/* Orders count */}
              <span className="text-sm text-muted-foreground">
                {entry.completed_orders} orders
              </span>

              {/* Level Badge */}
              <Badge className={cn('gap-1 text-xs border', levelColors[entry.level])}>
                <Award className="w-3 h-3" />
                {entry.level.charAt(0).toUpperCase() + entry.level.slice(1)}
              </Badge>
            </div>
          );
        })}

        {/* Show user's position if not in top 10 */}
        {user && !userRank && (
          <div className="pt-3 mt-3 border-t border-dashed">
            <p className="text-xs text-center text-muted-foreground">
              Complete more orders to appear on the leaderboard!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
