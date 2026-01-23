import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Award, Crown, Package, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTopDropshippers } from '@/hooks/useTopDropshippers';

const rankIcons: Record<number, React.ReactNode> = {
  1: <Crown className="w-5 h-5 text-yellow-500" />,
  2: <Medal className="w-5 h-5 text-slate-400" />,
  3: <Medal className="w-5 h-5 text-amber-600" />,
};

export const AdminManagedLeaderboard: React.FC = () => {
  const { user } = useAuth();
  const { topDropshippers, userRank, isUserInTop10, isLoading } = useTopDropshippers();

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

  if (topDropshippers.length === 0) {
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
            <p className="text-sm">Leaderboard coming soon!</p>
            <p className="text-xs">Check back later to see top performers.</p>
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
        {/* Top 10 Entries */}
        {topDropshippers.map((entry) => {
          const isCurrentUser = entry.user_id === user?.id;
          return (
            <div
              key={entry.id}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg transition-colors',
                isCurrentUser
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted/50'
              )}
            >
              {/* Rank */}
              <div className="w-8 flex justify-center">
                {rankIcons[entry.rank_position] || (
                  <span className="text-sm font-medium text-muted-foreground">
                    #{entry.rank_position}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-muted">
                  {entry.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Name and Stats */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium truncate',
                    isCurrentUser && 'text-primary'
                  )}
                >
                  {entry.display_name}
                  {isCurrentUser && (
                    <span className="text-xs text-muted-foreground ml-1">(You)</span>
                  )}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {(entry.orders_count > 0 || entry.earnings_amount > 0) && (
                    <>
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {entry.orders_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <IndianRupee className="w-3 h-3" />
                        {(entry.earnings_amount || 0).toLocaleString()}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Badge */}
              {entry.badge_title && (
                <Badge className="gap-1 text-xs border bg-gradient-to-r from-amber-200 to-amber-300 text-amber-800 border-amber-400">
                  <Award className="w-3 h-3" />
                  {entry.badge_title}
                </Badge>
              )}
            </div>
          );
        })}

        {/* Current User Position (11th entry) - Only show if not in Top 10 */}
        {user && !isUserInTop10 && (
          <>
            <div className="border-t border-dashed my-2" />
            <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/10 border border-primary/20">
              {/* Rank */}
              <div className="w-8 flex justify-center">
                <span className="text-sm font-medium text-muted-foreground">
                  #{userRank?.admin_defined_position || 11}
                </span>
              </div>

              {/* Avatar */}
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-muted">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-primary">
                  {user.name}
                  <span className="text-xs text-muted-foreground ml-1">(You)</span>
                </p>
              </div>

              {/* Your Position Label */}
              <Badge variant="outline" className="text-xs">
                Your Position
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
