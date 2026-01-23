import React from 'react';
import { cn } from '@/lib/utils';
import { Clock, UserSearch, CheckCircle } from 'lucide-react';

interface ChatLiveIndicatorProps {
  hasAssignedAgent: boolean;
  isChatActive?: boolean;
  isConnected?: boolean;
  estimatedResponseTime?: string;
  hasMessages?: boolean;
  isAgentOnline?: boolean;
  className?: string;
}

export const ChatLiveIndicator: React.FC<ChatLiveIndicatorProps> = ({
  hasAssignedAgent,
  isChatActive = true,
  isConnected = true,
  estimatedResponseTime = '1-2 hours',
  hasMessages = false,
  isAgentOnline = false,
  className,
}) => {
  // Only show "Agent is Live" when admin has explicitly assigned themselves
  // hasAssignedAgent becomes true only when assigned_agent_id is set in chat_sessions
  if (hasAssignedAgent && isChatActive) {
    return (
      <div className={cn('flex flex-col items-end gap-0.5', className)}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Agent is Live
          </span>
        </div>
      </div>
    );
  }

  // No agent assigned but user has sent messages → Show "Waiting for agent"
  if (!hasAssignedAgent && hasMessages) {
    return (
      <div className={cn('flex flex-col items-end gap-0.5', className)}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <UserSearch className="w-3 h-3" />
            Waiting for agent
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Response in ~{estimatedResponseTime}</span>
        </div>
      </div>
    );
  }

  // No agent assigned and no messages → No indicator (hide completely)
  if (!hasAssignedAgent) {
    return null;
  }

  // Chat ended → Show offline status
  return (
    <div className={cn('flex flex-col items-end gap-0.5', className)}>
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
          Offline
        </span>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>Response in ~{estimatedResponseTime}</span>
      </div>
    </div>
  );
};
