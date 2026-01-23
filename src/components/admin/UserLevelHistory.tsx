import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, User, ArrowRight, Calendar } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { format } from 'date-fns';

const levelColors: Record<string, string> = {
  bronze: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  silver: 'bg-slate-400/10 text-slate-600 border-slate-400/20',
  gold: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
};

export const UserLevelHistory: React.FC = () => {
  const { logs, isLoading } = useAuditLogs(100);

  // Filter logs for user level changes
  const levelChangeLogs = logs.filter(log => log.action_type === 'user_level_change');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            User Level History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>User Level History</CardTitle>
            <CardDescription>
              Track all user level changes made by administrators
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {levelChangeLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No level changes recorded yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {levelChangeLogs.map((log) => {
                const newLevel = log.new_value?.user_level || 'unknown';
                const oldLevel = log.metadata?.old_level || 'N/A';
                
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">User ID:</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono truncate max-w-[150px]">
                          {log.entity_id?.slice(0, 8)}...
                        </code>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {oldLevel !== 'N/A' && (
                          <>
                            <Badge variant="outline" className={levelColors[oldLevel] || ''}>
                              {oldLevel}
                            </Badge>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          </>
                        )}
                        <Badge variant="outline" className={levelColors[newLevel] || ''}>
                          {newLevel}
                        </Badge>
                      </div>
                      {log.reason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.reason}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
