import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAgentPresence } from '@/hooks/useAgentPresence';
import { Circle, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AgentPresenceToggle = () => {
  const { 
    isOnline, 
    activeChatCount, 
    goOnline, 
    goOffline, 
    isGoingOnline, 
    isGoingOffline,
    isLoading,
    inactivityWarning,
    updateActivity,
  } = useAgentPresence();

  const isToggling = isGoingOnline || isGoingOffline;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Circle 
          className={cn(
            "h-3 w-3",
            isOnline 
              ? inactivityWarning 
                ? 'fill-yellow-500 text-yellow-500 animate-pulse' 
                : 'fill-green-500 text-green-500' 
              : 'fill-gray-400 text-gray-400'
          )} 
        />
        <span className="text-sm font-medium">
          {isOnline ? (inactivityWarning ? 'Away' : 'Online') : 'Offline'}
        </span>
      </div>

      {inactivityWarning && isOnline && (
        <Badge 
          variant="outline" 
          className="text-xs gap-1 border-yellow-500 text-yellow-600 animate-pulse cursor-pointer"
          onClick={updateActivity}
        >
          <AlertTriangle className="h-3 w-3" />
          Click to stay online
        </Badge>
      )}

      {isOnline && !inactivityWarning && (
        <Badge variant="secondary" className="text-xs">
          {activeChatCount} active {activeChatCount === 1 ? 'chat' : 'chats'}
        </Badge>
      )}

      <Button
        variant={isOnline ? 'outline' : 'default'}
        size="sm"
        onClick={() => isOnline ? goOffline('manual_leave') : goOnline()}
        disabled={isToggling}
      >
        {isToggling ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        {isOnline ? 'Go Offline' : 'Go Online'}
      </Button>
    </div>
  );
};
