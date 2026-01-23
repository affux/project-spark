import React, { useState } from 'react';
import { useLoginAttempts } from '@/hooks/useLoginAttempts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  Globe, 
  Mail, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export const LoginAttemptsWidget: React.FC = () => {
  const { attempts, blockedEntities, stats, isLoading, refetch, cleanupAttempts } = useLoginAttempts();
  const { toast } = useToast();
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    try {
      await cleanupAttempts();
      await refetch();
      toast({
        title: 'Cleanup Complete',
        description: 'Old login attempts have been removed.',
      });
    } catch (error) {
      toast({
        title: 'Cleanup Failed',
        description: 'Could not clean up old attempts.',
        variant: 'destructive',
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const activeBlocks = blockedEntities.filter(e => e.is_blocked);
  const recentFailures = blockedEntities.filter(e => !e.is_blocked && e.failed_attempts >= 3);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Login Security Monitor</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleCleanup}
              disabled={isCleaningUp}
            >
              {isCleaningUp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-foreground">{stats.total_attempts_24h}</div>
            <div className="text-xs text-muted-foreground">Total (24h)</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-500/10">
            <div className="text-2xl font-bold text-red-500">{stats.failed_attempts_24h}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-500/10">
            <div className="text-2xl font-bold text-green-500">{stats.successful_attempts_24h}</div>
            <div className="text-xs text-muted-foreground">Success</div>
          </div>
        </div>

        {/* Alert Banner for Active Blocks */}
        {activeBlocks.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-500">
                {activeBlocks.length} {activeBlocks.length === 1 ? 'entity' : 'entities'} currently blocked
              </p>
              <p className="text-xs text-muted-foreground">
                Due to too many failed login attempts
              </p>
            </div>
          </div>
        )}

        {/* Warning Banner for Near-Blocks */}
        {recentFailures.length > 0 && activeBlocks.length === 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-500">
                {recentFailures.length} suspicious {recentFailures.length === 1 ? 'pattern' : 'patterns'}
              </p>
              <p className="text-xs text-muted-foreground">
                Multiple failed attempts detected
              </p>
            </div>
          </div>
        )}

        {/* Tabs for different views */}
        <Tabs defaultValue="blocked" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="blocked" className="gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              Blocked ({activeBlocks.length})
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Recent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blocked" className="mt-3">
            <ScrollArea className="h-[200px]">
              {activeBlocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ShieldCheck className="h-10 w-10 text-green-500 mb-2" />
                  <p className="text-sm font-medium text-foreground">All Clear</p>
                  <p className="text-xs text-muted-foreground">No blocked entities</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeBlocks.map((entity, index) => (
                    <div 
                      key={`${entity.type}-${entity.identifier}-${index}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {entity.type === 'email' ? (
                          <Mail className="h-4 w-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <Globe className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {entity.identifier}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entity.failed_attempts} failed attempts
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive" className="flex-shrink-0">
                        Blocked
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="recent" className="mt-3">
            <ScrollArea className="h-[200px]">
              {attempts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Shield className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">No Recent Attempts</p>
                  <p className="text-xs text-muted-foreground">Login attempts will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {attempts.slice(0, 20).map((attempt) => (
                    <div 
                      key={attempt.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border ${
                        attempt.was_successful 
                          ? 'bg-green-500/5 border-green-500/20' 
                          : 'bg-red-500/5 border-red-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {attempt.was_successful ? (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {attempt.email}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {attempt.ip_address && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {attempt.ip_address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(attempt.attempted_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <span>{stats.unique_emails_24h} unique emails</span>
          <span>{stats.unique_ips_24h} unique IPs</span>
        </div>
      </CardContent>
    </Card>
  );
};
