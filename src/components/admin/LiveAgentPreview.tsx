import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  ArrowRight, 
  RefreshCw, 
  UserCheck, 
  UserX, 
  MessageSquare,
  Clock,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Agent {
  user_id: string;
  is_online: boolean;
  active_chat_count: number;
  last_seen_at: string | null;
  profiles: {
    name: string;
    email: string;
  } | null;
}

interface WaitingChat {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
}

export const LiveAgentPreview = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [waitingChats, setWaitingChats] = useState<WaitingChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch agents
      const { data: agentData, error: agentError } = await supabase
        .from('support_agent_presence')
        .select('user_id, is_online, active_chat_count, last_seen_at')
        .order('is_online', { ascending: false })
        .order('active_chat_count', { ascending: true });

      if (agentError) throw agentError;
      
      // Fetch profile names separately
      const userIds = (agentData || []).map(a => a.user_id);
      let profilesMap: Record<string, { name: string; email: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .in('user_id', userIds);
        
        profilesData?.forEach(p => {
          profilesMap[p.user_id] = { name: p.name, email: p.email };
        });
      }
      
      const agentsWithProfiles: Agent[] = (agentData || []).map(a => ({
        ...a,
        profiles: profilesMap[a.user_id] || null,
      }));
      
      setAgents(agentsWithProfiles);

      // Fetch waiting chats
      const { data: chatData, error: chatError } = await supabase
        .from('chat_sessions')
        .select('id, user_id, status, created_at')
        .eq('status', 'waiting_for_support')
        .order('created_at', { ascending: true });

      if (chatError) throw chatError;
      setWaitingChats(chatData || []);
    } catch (error) {
      console.error('Error fetching live data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to real-time updates
    const agentChannel = supabase
      .channel('live-agent-preview')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_agent_presence' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_sessions' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(agentChannel);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const onlineAgents = agents.filter(a => a.is_online);
  const offlineAgents = agents.filter(a => !a.is_online);
  const totalActiveChats = agents.reduce((sum, a) => sum + a.active_chat_count, 0);

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Live Agent Status</CardTitle>
            <div className="flex items-center gap-1 ml-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-500">Live</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
        <CardDescription>
          Real-time view of agent status and chat assignments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
            <p className="text-2xl font-bold text-green-500">{onlineAgents.length}</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{offlineAgents.length}</p>
            <p className="text-xs text-muted-foreground">Offline</p>
          </div>
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{totalActiveChats}</p>
            <p className="text-xs text-muted-foreground">Active Chats</p>
          </div>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center">
            <p className="text-2xl font-bold text-amber-500">{waitingChats.length}</p>
            <p className="text-xs text-muted-foreground">Waiting</p>
          </div>
        </div>

        <Separator />

        {/* Reassignment Flow Visualization */}
        <div>
          <h4 className="text-sm font-medium mb-3">Assignment Flow</h4>
          <div className="flex items-center justify-between gap-2 p-4 rounded-lg bg-muted/50">
            {/* Waiting Queue */}
            <div className="flex-1 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-amber-500/20 mb-2">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-xs text-muted-foreground">Waiting Queue</p>
              <p className="text-sm font-semibold">{waitingChats.length} chats</p>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground" />

            {/* Assignment Engine */}
            <div className="flex-1 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/20 mb-2">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Auto Assign</p>
              <p className="text-sm font-semibold">Least Active</p>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground" />

            {/* Available Agents */}
            <div className="flex-1 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-500/20 mb-2">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="text-sm font-semibold">{onlineAgents.length} agents</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Agent List */}
        <div>
          <h4 className="text-sm font-medium mb-3">Support Agents</h4>
          <div className="space-y-2">
            {agents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No agents configured yet
              </p>
            ) : (
              agents.map((agent) => (
                <div 
                  key={agent.user_id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    agent.is_online 
                      ? "bg-green-500/5 border-green-500/20" 
                      : "bg-muted/50 border-border/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                      agent.is_online ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
                    )}>
                      {agent.profiles?.name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {agent.profiles?.name || 'Unknown Agent'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {agent.profiles?.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{agent.active_chat_count}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">active</p>
                    </div>
                    <Badge variant={agent.is_online ? "default" : "secondary"} className={cn(
                      agent.is_online && "bg-green-500 hover:bg-green-600"
                    )}>
                      {agent.is_online ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Waiting Chats */}
        {waitingChats.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">Waiting for Support</h4>
              <div className="space-y-2">
                {waitingChats.slice(0, 5).map((chat) => (
                  <div 
                    key={chat.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">Chat #{chat.id.slice(0, 8)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(chat.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                {waitingChats.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{waitingChats.length - 5} more waiting
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
