import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const ChatSettings: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [welcomeMessage, setWelcomeMessage] = useState(
    'Welcome! Thank you for reaching out. A support agent will be assigned to assist you shortly. Please wait while we connect you with our team.'
  );
  const [greetingMessage, setGreetingMessage] = useState(
    'Hello! How can I help you today?'
  );
  const [endMessage, setEndMessage] = useState(
    'This chat session has been closed. Thank you for contacting support. If you need further assistance, please start a new conversation.'
  );

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('key, value')
          .in('key', ['chat_welcome_message', 'chat_greeting_message', 'chat_end_message']);

        data?.forEach((setting) => {
          if (setting.key === 'chat_welcome_message' && setting.value) {
            setWelcomeMessage(setting.value);
          }
          if (setting.key === 'chat_greeting_message' && setting.value) {
            setGreetingMessage(setting.value);
          }
          if (setting.key === 'chat_end_message' && setting.value) {
            setEndMessage(setting.value);
          }
        });
      } catch (error) {
        console.error('Error fetching chat settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settings = [
        { key: 'chat_welcome_message', value: welcomeMessage },
        { key: 'chat_greeting_message', value: greetingMessage },
        { key: 'chat_end_message', value: endMessage },
      ];

      for (const setting of settings) {
        const { data: existing } = await supabase
          .from('platform_settings')
          .select('id')
          .eq('key', setting.key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('platform_settings')
            .update({ value: setting.value })
            .eq('key', setting.key);
        } else {
          await supabase
            .from('platform_settings')
            .insert({ key: setting.key, value: setting.value });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      queryClient.invalidateQueries({ queryKey: ['public-settings'] });

      toast({
        title: 'Chat settings saved',
        description: 'Your chat message settings have been updated.',
      });
    } catch (error) {
      console.error('Error saving chat settings:', error);
      toast({
        title: 'Failed to save',
        description: 'Could not save chat settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Chat Messages</CardTitle>
            <CardDescription>
              Configure automated messages for support chat
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="welcome-message">First Contact Welcome Message</Label>
          <p className="text-xs text-muted-foreground">
            Sent automatically when a user sends their first message in a new chat session
          </p>
          <Textarea
            id="welcome-message"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            placeholder="Enter welcome message..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="greeting-message">Chat Greeting Message</Label>
          <p className="text-xs text-muted-foreground">
            Displayed at the top of the chat window (if enabled)
          </p>
          <Textarea
            id="greeting-message"
            value={greetingMessage}
            onChange={(e) => setGreetingMessage(e.target.value)}
            placeholder="Enter greeting message..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end-message">Chat End Message</Label>
          <p className="text-xs text-muted-foreground">
            Sent when an admin ends/closes a chat session
          </p>
          <Textarea
            id="end-message"
            value={endMessage}
            onChange={(e) => setEndMessage(e.target.value)}
            placeholder="Enter chat end message..."
            rows={3}
          />
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Chat Settings
        </Button>
      </CardContent>
    </Card>
  );
};
