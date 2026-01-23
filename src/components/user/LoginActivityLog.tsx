import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Monitor, 
  LogIn, 
  LogOut, 
  ShoppingBag, 
  Wallet, 
  UserCog,
  MapPin,
  Clock,
  Globe
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface IPLog {
  id: string;
  ip_address: string;
  action_type: string;
  country: string | null;
  city: string | null;
  region: string | null;
  created_at: string;
}

const actionConfig: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  login: { label: 'Login', icon: LogIn, color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  logout: { label: 'Logout', icon: LogOut, color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
  order_placed: { label: 'Order Placed', icon: ShoppingBag, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  payout_request: { label: 'Payout Request', icon: Wallet, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  profile_update: { label: 'Profile Update', icon: UserCog, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
};

export const LoginActivityLog: React.FC = () => {
  const { user } = useAuth();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['user-login-activity', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('ip_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as IPLog[];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          Login Activity
        </CardTitle>
        <CardDescription>
          Your recent account activity and login history
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs && logs.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {logs.map((log, index) => {
                const config = actionConfig[log.action_type] || {
                  label: log.action_type,
                  icon: Monitor,
                  color: 'bg-muted text-muted-foreground',
                };
                const ActionIcon = config.icon;
                const isFirstLogin = index === 0 && log.action_type === 'login';

                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      isFirstLogin ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <ActionIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{config.label}</span>
                        {isFirstLogin && (
                          <Badge variant="outline" className="text-xs bg-primary/10">
                            Current Session
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {log.ip_address}
                        </span>
                        {(log.city || log.country) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {[log.city, log.region, log.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        <span title={format(new Date(log.created_at), 'PPpp')}>
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                        <span className="text-muted-foreground/60">
                          • {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No activity logs found</p>
            <p className="text-sm">Your login history will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
