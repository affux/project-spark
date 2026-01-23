import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useChatReassignmentSettings } from '@/hooks/useChatReassignmentSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NotificationSoundPreview } from './NotificationSoundPreview';
import { LiveAgentPreview } from './LiveAgentPreview';
import { 
  Users, 
  Clock, 
  Bell, 
  Shield, 
  FileText,
  RefreshCw,
  Volume2,
  PlayCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UserX,
  MessageSquare
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const ChatReassignmentSettings = () => {
  const { settings, isLoading, updateSetting, isUpdating } = useChatReassignmentSettings();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <CardTitle>Auto Reassignment</CardTitle>
          </div>
          <CardDescription>
            Automatically reassign chats when users leave or agents become unavailable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-reassignment">Enable Auto Reassignment</Label>
              <p className="text-sm text-muted-foreground">
                When disabled, chats remain unassigned after a user leaves
              </p>
            </div>
            <Switch
              id="auto-reassignment"
              checked={settings.chat_auto_reassignment_enabled}
              onCheckedChange={(checked) => updateSetting('chat_auto_reassignment_enabled', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      {/* User Leave Detection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>User Leave Detection</CardTitle>
          </div>
          <CardDescription>
            Configure how user departure from chat is detected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Inactivity Timeout</Label>
                <p className="text-sm text-muted-foreground">
                  Time after which user is considered inactive
                </p>
              </div>
              <Badge variant="secondary">{settings.chat_inactivity_timeout}s</Badge>
            </div>
            <Slider
              value={[settings.chat_inactivity_timeout]}
              onValueChange={([value]) => updateSetting('chat_inactivity_timeout', value)}
              min={30}
              max={600}
              step={30}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="immediate-leave">Immediate Leave on Tab Close</Label>
              <p className="text-sm text-muted-foreground">
                Mark user as left immediately when they close the tab
              </p>
            </div>
            <Switch
              id="immediate-leave"
              checked={settings.chat_immediate_leave_on_close}
              onCheckedChange={(checked) => updateSetting('chat_immediate_leave_on_close', checked)}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Grace Period Before Reassignment</Label>
                <p className="text-sm text-muted-foreground">
                  Time window for user to return without reassignment
                </p>
              </div>
              <Badge variant="secondary">{settings.chat_grace_period}s</Badge>
            </div>
            <Slider
              value={[settings.chat_grace_period]}
              onValueChange={([value]) => updateSetting('chat_grace_period', value)}
              min={10}
              max={300}
              step={10}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Agent Selection Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Agent Selection Rules</CardTitle>
          </div>
          <CardDescription>
            Configure how agents are selected for reassignment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Assignment Strategy</Label>
            <Select
              value={settings.chat_assignment_strategy}
              onValueChange={(value) => updateSetting('chat_assignment_strategy', value)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="least_active">Least Active Chats</SelectItem>
                <SelectItem value="round_robin">Round Robin</SelectItem>
                <SelectItem value="priority_based">Priority Based</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              How agents are selected when multiple are available
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="exclude-previous">Exclude Previous Agent</Label>
              <p className="text-sm text-muted-foreground">
                Prevent reassignment to the same agent if others are available
              </p>
            </div>
            <Switch
              id="exclude-previous"
              checked={settings.chat_exclude_previous_agent}
              onCheckedChange={(checked) => updateSetting('chat_exclude_previous_agent', checked)}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Max Concurrent Chats per Agent</Label>
                <p className="text-sm text-muted-foreground">
                  Maximum number of active chats an agent can handle
                </p>
              </div>
              <Badge variant="secondary">{settings.max_chats_per_agent}</Badge>
            </div>
            <Slider
              value={[settings.max_chats_per_agent]}
              onValueChange={([value]) => updateSetting('max_chats_per_agent', value)}
              min={1}
              max={50}
              step={1}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="busy-fallback">Allow Busy Agent Fallback</Label>
              <p className="text-sm text-muted-foreground">
                Assign to busy agents if no idle agents are available
              </p>
            </div>
            <Switch
              id="busy-fallback"
              checked={settings.chat_allow_busy_agent_fallback}
              onCheckedChange={(checked) => updateSetting('chat_allow_busy_agent_fallback', checked)}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-assign-availability">Auto Assign on Availability</Label>
              <p className="text-sm text-muted-foreground">
                Automatically assign waiting chats when agent becomes available
              </p>
            </div>
            <Switch
              id="auto-assign-availability"
              checked={settings.chat_auto_assign_on_availability}
              onCheckedChange={(checked) => updateSetting('chat_auto_assign_on_availability', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Agent Inactivity Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-primary" />
            <CardTitle>Agent Inactivity & Auto-Offline</CardTitle>
          </div>
          <CardDescription>
            Automatically set agents to offline after periods of inactivity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="agent-auto-offline">Enable Auto-Offline</Label>
              <p className="text-sm text-muted-foreground">
                Automatically set agents to offline after inactivity
              </p>
            </div>
            <Switch
              id="agent-auto-offline"
              checked={settings.agent_auto_offline_enabled}
              onCheckedChange={(checked) => updateSetting('agent_auto_offline_enabled', checked)}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Agent Inactivity Timeout</Label>
                <p className="text-sm text-muted-foreground">
                  Time before agent is automatically set to offline
                </p>
              </div>
              <Badge variant="secondary">
                {Math.floor(settings.agent_inactivity_timeout / 60)}m {settings.agent_inactivity_timeout % 60}s
              </Badge>
            </div>
            <Slider
              value={[settings.agent_inactivity_timeout]}
              onValueChange={([value]) => updateSetting('agent_inactivity_timeout', value)}
              min={60}
              max={1800}
              step={60}
              disabled={isUpdating || !settings.agent_auto_offline_enabled}
            />
            <p className="text-xs text-muted-foreground">
              Range: 1 minute to 30 minutes. Agent will see a warning 1 minute before timeout.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Typing Indicator Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>Typing Indicator</CardTitle>
          </div>
          <CardDescription>
            Configure typing indicator timeout for chat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Typing Indicator Timeout</Label>
                <p className="text-sm text-muted-foreground">
                  How long typing indicator shows after user stops typing
                </p>
              </div>
              <Badge variant="secondary">{settings.typing_indicator_timeout}s</Badge>
            </div>
            <Slider
              value={[settings.typing_indicator_timeout]}
              onValueChange={([value]) => updateSetting('typing_indicator_timeout', value)}
              min={2}
              max={15}
              step={1}
              disabled={isUpdating}
            />
            <p className="text-xs text-muted-foreground">
              Shorter timeout = more responsive indicator. Longer timeout = fewer status updates.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notifications & Alerts</CardTitle>
          </div>
          <CardDescription>
            Configure notification settings for reassignment events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notify-agent">Notify New Agent</Label>
              <p className="text-sm text-muted-foreground">
                Send in-app notification when a chat is assigned
              </p>
            </div>
            <Switch
              id="notify-agent"
              checked={settings.chat_notify_new_agent}
              onCheckedChange={(checked) => updateSetting('chat_notify_new_agent', checked)}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notify-failure">Notify Admin on Failure</Label>
              <p className="text-sm text-muted-foreground">
                Alert admin when reassignment fails (no agents available)
              </p>
            </div>
            <Switch
              id="notify-failure"
              checked={settings.chat_notify_admin_on_failure}
              onCheckedChange={(checked) => updateSetting('chat_notify_admin_on_failure', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sound Preview Card */}
      <NotificationSoundPreview
        soundEnabled={settings.chat_notify_agent_sound}
        onSoundEnabledChange={(enabled) => updateSetting('chat_notify_agent_sound', enabled)}
        isUpdating={isUpdating}
      />

      {/* Audit & Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Audit & Logs</CardTitle>
          </div>
          <CardDescription>
            Configure logging of reassignment events for audit purposes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enable-logs">Enable Reassignment Logs</Label>
              <p className="text-sm text-muted-foreground">
                Log all reassignment events with details
              </p>
            </div>
            <Switch
              id="enable-logs"
              checked={settings.chat_enable_reassignment_logs}
              onCheckedChange={(checked) => updateSetting('chat_enable_reassignment_logs', checked)}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Log Retention Period</Label>
                <p className="text-sm text-muted-foreground">
                  Days to keep reassignment logs
                </p>
              </div>
              <Badge variant="secondary">{settings.chat_log_retention_days} days</Badge>
            </div>
            <Slider
              value={[settings.chat_log_retention_days]}
              onValueChange={([value]) => updateSetting('chat_log_retention_days', value)}
              min={7}
              max={365}
              step={7}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Abuse Protection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Abuse & Edge Case Protection</CardTitle>
          </div>
          <CardDescription>
            Prevent abuse and handle edge cases in reassignment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="prevent-rapid">Prevent Rapid Reassignment</Label>
              <p className="text-sm text-muted-foreground">
                Cooldown period between reassignments to prevent loops
              </p>
            </div>
            <Switch
              id="prevent-rapid"
              checked={settings.chat_prevent_rapid_reassignment}
              onCheckedChange={(checked) => updateSetting('chat_prevent_rapid_reassignment', checked)}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Max Reassignments per Chat</Label>
                <p className="text-sm text-muted-foreground">
                  Maximum times a chat can be reassigned
                </p>
              </div>
              <Badge variant="secondary">{settings.chat_max_reassignments}</Badge>
            </div>
            <Slider
              value={[settings.chat_max_reassignments]}
              onValueChange={([value]) => updateSetting('chat_max_reassignments', value)}
              min={1}
              max={20}
              step={1}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="lock-after-max">Lock Chat After Max Reassignments</Label>
              <p className="text-sm text-muted-foreground">
                Prevent further reassignments after limit is reached
              </p>
            </div>
            <Switch
              id="lock-after-max"
              checked={settings.chat_lock_after_max_reassignments}
              onCheckedChange={(checked) => updateSetting('chat_lock_after_max_reassignments', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Live Agent Preview */}
      <LiveAgentPreview />

      {/* Test Simulation */}
      <TestSimulationCard settings={settings} />
    </div>
  );
};

const TestSimulationCard = ({ settings }: { settings: ReturnType<typeof useChatReassignmentSettings>['settings'] }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    success: boolean;
    message: string;
    details?: {
      sessionId?: string;
      previousAgent?: string;
      newAgent?: string;
      status?: string;
    };
  } | null>(null);

  const runSimulation = async () => {
    setIsSimulating(true);
    setSimulationResult(null);

    try {
      // Get current user as the simulated "user" for testing
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Step 1: Create a test chat session
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          status: 'active',
          last_user_activity_at: new Date().toISOString()
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Step 2: Get an available agent to assign
      const { data: agent, error: agentError } = await supabase
        .from('support_agent_presence')
        .select('user_id')
        .eq('is_online', true)
        .order('active_chat_count', { ascending: true })
        .limit(1)
        .single();

      let assignedAgentId = agent?.user_id || null;

      if (assignedAgentId) {
        // Assign the agent to the session
        await supabase
          .from('chat_sessions')
          .update({ 
            assigned_agent_id: assignedAgentId,
            status: 'active' 
          })
          .eq('id', session.id);
      }

      // Step 3: Simulate user leaving
      const { data: reassignResult, error: reassignError } = await supabase.functions.invoke('chat-reassignment', {
        body: {
          action: 'user_left',
          session_id: session.id,
          user_id: user.id
        }
      });

      if (reassignError) throw reassignError;

      // Step 4: Check the result
      const { data: updatedSession } = await supabase
        .from('chat_sessions')
        .select('*, assigned_agent_id, previous_agent_id, status')
        .eq('id', session.id)
        .single();

      // Get agent names for display
      let previousAgentName = 'None';
      let newAgentName = 'None';

      if (updatedSession?.previous_agent_id) {
        const { data: prevAgent } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', updatedSession.previous_agent_id)
          .single();
        previousAgentName = prevAgent?.name || 'Unknown';
      }

      if (updatedSession?.assigned_agent_id) {
        const { data: newAgent } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', updatedSession.assigned_agent_id)
          .single();
        newAgentName = newAgent?.name || 'Unknown';
      }

      // Step 5: Clean up test session
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', session.id);

      setSimulationResult({
        success: true,
        message: 'Simulation completed successfully!',
        details: {
          sessionId: session.id.slice(0, 8) + '...',
          previousAgent: previousAgentName,
          newAgent: newAgentName,
          status: updatedSession?.status || 'unknown'
        }
      });

      toast.success('Simulation completed successfully');
    } catch (error: any) {
      console.error('Simulation error:', error);
      setSimulationResult({
        success: false,
        message: error.message || 'Simulation failed'
      });
      toast.error('Simulation failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <Card className="border-dashed border-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-primary" />
          <CardTitle>Test Simulation</CardTitle>
          <Badge variant="outline" className="ml-2">Testing</Badge>
        </div>
        <CardDescription>
          Simulate user leave and agent reassignment to test your configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
          <h4 className="font-medium text-sm">Simulation Steps:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Create a test chat session</li>
            <li>Assign an available agent (if any online)</li>
            <li>Simulate user leaving the chat</li>
            <li>Trigger reassignment logic</li>
            <li>Display results and clean up</li>
          </ol>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            onClick={runSimulation} 
            disabled={isSimulating || !settings.chat_auto_reassignment_enabled}
            className="gap-2"
          >
            {isSimulating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Simulation...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Run Simulation
              </>
            )}
          </Button>
          
          {!settings.chat_auto_reassignment_enabled && (
            <p className="text-sm text-muted-foreground">
              Enable Auto Reassignment to run simulation
            </p>
          )}
        </div>

        {simulationResult && (
          <div className={`rounded-lg p-4 ${
            simulationResult.success 
              ? 'bg-green-500/10 border border-green-500/20' 
              : 'bg-destructive/10 border border-destructive/20'
          }`}>
            <div className="flex items-start gap-3">
              {simulationResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              )}
              <div className="space-y-2">
                <p className={`font-medium ${
                  simulationResult.success ? 'text-green-500' : 'text-destructive'
                }`}>
                  {simulationResult.message}
                </p>
                {simulationResult.details && (
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Session ID:</span> {simulationResult.details.sessionId}</p>
                    <p><span className="text-muted-foreground">Previous Agent:</span> {simulationResult.details.previousAgent}</p>
                    <p><span className="text-muted-foreground">New Agent:</span> {simulationResult.details.newAgent}</p>
                    <p><span className="text-muted-foreground">Final Status:</span> <Badge variant="secondary">{simulationResult.details.status}</Badge></p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
