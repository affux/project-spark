import React, { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Loader2, Paperclip, Bell, BellOff, Star, MessageSquarePlus, XCircle } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { useChatRating } from '@/hooks/useChatRating';
import { useAuth } from '@/contexts/AuthContext';

import { format, isSameDay, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useChatRealtimeUser, useChatSessionRealtimeUser, useRealtimeConnection } from '@/hooks/useRealtimeSubscription';
import { ChatLiveIndicator } from '@/components/chat/ChatLiveIndicator';
import { ChatDateSeparator } from '@/components/chat/ChatDateSeparator';
import { ChatReadReceipt } from '@/components/chat/ChatReadReceipt';

import { useAssignedAgent } from '@/hooks/useAssignedAgent';
import { useIsAgentViewingChat } from '@/hooks/useAgentViewingPresence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { playAgentAssignedSound } from '@/lib/notificationSound';
import { useQueryClient } from '@tanstack/react-query';

const UserChat: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    isSending, 
    markAsRead, 
    unreadCount,
    isChatEnded,
    closeReasonLabel,
    startNewConversation,
    isStartingNewConversation,
  } = useChat();
  const { isOtherTyping, setTyping, stopTyping } = useTypingIndicator(user?.id || '');
  const { settings: publicSettings } = usePublicSettings();
  
  const { hasRatedRecently, submitRating, isSubmitting: isSubmittingRating } = useChatRating();
  const [inputMessage, setInputMessage] = useState('');
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const { assignedAgent } = useAssignedAgent();
  const { isAgentViewing } = useIsAgentViewingChat();
  // Only show agent name AFTER admin has assigned themselves - use assignedAgent.name which is the Indian name
  const displaySupportName = assignedAgent?.name || 'Support Team';
  
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleStartNewConversation = () => {
    startNewConversation();
    toast({
      title: 'Ready',
      description: 'You can now start a new conversation.',
    });
  };

  // Track previous agent to detect assignment
  const prevAgentRef = useRef<string | null>(null);
  
  // Enable real-time updates for messages and session
  useChatRealtimeUser(user?.id);
  useChatSessionRealtimeUser(user?.id);
  const { isConnected } = useRealtimeConnection();
  
  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Notify when agent is assigned
  useEffect(() => {
    const currentAgentId = assignedAgent?.id || null;
    const previousAgentId = prevAgentRef.current;
    
    // Agent was just assigned (went from null to having an agent)
    if (currentAgentId && !previousAgentId && messages.length > 0) {
      // Play sound notification
      playAgentAssignedSound();
      
      // Show toast notification
      toast({
        title: '🎉 Agent Assigned!',
        description: `${assignedAgent?.name || 'A support agent'} is now ready to help you.`,
      });
      
      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Support Agent Assigned', {
          body: `${assignedAgent?.name || 'A support agent'} is now ready to help you.`,
          icon: '/favicon.ico',
        });
      }
    }
    
    prevAgentRef.current = currentAgentId;
  }, [assignedAgent, messages.length, toast]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive notifications for new messages.',
        });
      }
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Fallback: while agent is assigned, poll briefly for read-receipt updates
  // (some environments can miss realtime UPDATE events).
  useEffect(() => {
    if (!user?.id) return;
    if (!assignedAgent || isChatEnded) return;

    const hasUnreadUserMessages = messages.some(
      (m) => m.sender_role === 'user' && m.is_read === false
    );
    if (!hasUnreadUserMessages) return;

    const interval = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'], exact: false });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [user?.id, assignedAgent, isChatEnded, messages, queryClient]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (unreadCount > 0) {
      markAsRead();
    }
  }, [unreadCount, markAsRead]);

  const handleSend = () => {
    if (inputMessage.trim() && !isSending) {
      stopTyping(); // Stop typing indicator when sending
      sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    if (e.target.value.trim()) {
      setTyping(true);
    } else {
      stopTyping();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      // Send attachment as a message with the URL
      const attachmentMessage = file.type.startsWith('image/')
        ? `[Image: ${publicUrl}]`
        : `[File: ${file.name}] ${publicUrl}`;

      sendMessage(attachmentMessage);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not upload the file. Please try again.',
        variant: 'destructive',
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmitRating = async () => {
    if (selectedRating > 0 && user?.id) {
      submitRating({ rating: selectedRating, feedback: ratingFeedback || undefined });
      
      // Send automatic thank you message
      const thankYouMessage = `Thank you for rating your support experience! Your feedback helps us improve our service. ⭐`;
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        message: thankYouMessage,
        sender_role: 'admin',
        is_read: false,
      });
      
      setShowRatingPrompt(false);
      setSelectedRating(0);
      setRatingFeedback('');
    }
  };

  // Helper to check if we need a date separator
  const shouldShowDateSeparator = (currentMsg: typeof messages[0], prevMsg?: typeof messages[0]) => {
    if (!prevMsg) return true;
    return !isSameDay(new Date(currentMsg.created_at), new Date(prevMsg.created_at));
  };

  const renderMessage = (msg: typeof messages[0], index: number) => {
    const isUser = msg.sender_role === 'user';
    const content = msg.message;
    const prevMsg = index > 0 ? messages[index - 1] : undefined;
    const showDateSeparator = shouldShowDateSeparator(msg, prevMsg);

    // Check if message contains an image
    const imageMatch = content.match(/\[Image: (https?:\/\/[^\]]+)\]/);
    const fileMatch = content.match(/\[File: ([^\]]+)\] (https?:\/\/\S+)/);

    // Check if this is a system message (agent joined or chat ended)
    const isSystemMessage = !isUser && (
      content.includes('has joined the chat') ||
      content.includes('has left the chat') ||
      content.includes('conversation has been closed') ||
      content.includes('Thank you for contacting') ||
      content.includes('chat has ended')
    );

    // Render system messages with special styling and animation
    if (isSystemMessage) {
      return (
        <React.Fragment key={msg.id}>
          {showDateSeparator && (
            <ChatDateSeparator date={new Date(msg.created_at)} />
          )}
          <div className="flex justify-center my-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div className={cn(
              "border rounded-full px-4 py-2 flex items-center gap-2 shadow-sm transition-all",
              content.includes('has joined') 
                ? "bg-green-500/10 border-green-500/30" 
                : "bg-accent/50 border-border/50"
            )}>
              {content.includes('has joined') ? (
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground" />
              )}
              <p className={cn(
                "text-xs text-center",
                content.includes('has joined') ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
              )}>
                {content}
              </p>
            </div>
          </div>
        </React.Fragment>
      );
    }

    return (
      <React.Fragment key={msg.id}>
        {showDateSeparator && (
          <ChatDateSeparator date={new Date(msg.created_at)} />
        )}
        <div
          className={cn(
            'flex flex-col animate-in fade-in-0 duration-200',
            isUser ? 'items-end slide-in-from-right-2' : 'items-start slide-in-from-left-2'
          )}
        >
          {/* Sender name label */}
          <p className={cn(
            "text-xs font-medium mb-1 px-1",
            isUser ? 'text-primary' : 'text-muted-foreground'
          )}>
            {isUser ? 'You' : displaySupportName}
          </p>
          <div
            className={cn(
              'max-w-[80%] rounded-2xl px-4 py-2',
              isUser
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted text-foreground rounded-bl-md'
            )}
          >
            {imageMatch ? (
              <div className="space-y-2">
                <img
                  src={imageMatch[1]}
                  alt="Attached image"
                  className="max-w-full rounded-lg max-h-64 object-contain"
                />
              </div>
            ) : fileMatch ? (
              <a
                href={fileMatch[2]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 underline"
              >
                <Paperclip className="w-4 h-4" />
                {fileMatch[1]}
              </a>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{content}</p>
            )}
            <div className={cn(
              'flex items-center gap-1 mt-1',
              isUser ? 'justify-end' : 'justify-start'
            )}>
              <p
                className={cn(
                  'text-[10px]',
                  isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}
              >
                {format(new Date(msg.created_at), 'h:mm a')}
              </p>
              {isUser && (
                <ChatReadReceipt
                  isRead={msg.is_read}
                  readAt={msg.read_at}
                  // Once an agent is assigned, show double-tick as "delivered" even before it's read.
                  isDelivered={!!assignedAgent && !isChatEnded && !msg.is_read}
                />
              )}
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-primary" />
            Chat Support
          </h1>
          <p className="text-muted-foreground mt-1">
            Talk to our support team directly for quick assistance.
          </p>
        </div>

        {/* Notification Permission Alert */}
        {notificationPermission !== 'granted' && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <BellOff className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Enable Notifications</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Enable notifications to receive alerts when support replies to your messages.
              <Button
                variant="outline"
                size="sm"
                className="ml-4 border-amber-500 text-amber-700 hover:bg-amber-500/20"
                onClick={requestNotificationPermission}
              >
                <Bell className="w-4 h-4 mr-2" />
                Enable Notifications
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Chat Card */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="border-b shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {assignedAgent ? getInitials(assignedAgent.name || displaySupportName) : (
                        <MessageCircle className="w-5 h-5" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online status dot with animation and tooltip */}
                  {assignedAgent && !isChatEnded && (
                    <span 
                      className={cn(
                        "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background cursor-pointer",
                        assignedAgent.isOnline 
                          ? "bg-green-500 animate-pulse" 
                          : "bg-gray-400"
                      )}
                      title={
                        assignedAgent.isOnline 
                          ? "Online now" 
                          : assignedAgent.lastSeenAt 
                            ? `Last seen ${formatDistanceToNow(new Date(assignedAgent.lastSeenAt), { addSuffix: true })}`
                            : "Offline"
                      }
                    />
                  )}
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {assignedAgent ? assignedAgent.name : (isChatEnded ? 'Chat ended' : displaySupportName)}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    {isChatEnded ? (
                      'This conversation is closed'
                    ) : isOtherTyping ? (
                      <span className="text-primary animate-pulse">Typing...</span>
                    ) : isAgentViewing && assignedAgent ? (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Viewing this chat
                      </span>
                    ) : assignedAgent ? (
                      'Your assigned support agent'
                    ) : (
                      'We typically reply within a few minutes'
                    )}
                  </CardDescription>
                </div>
              </div>
              <ChatLiveIndicator 
                hasAssignedAgent={!!assignedAgent && !isChatEnded}
                isChatActive={!isChatEnded}
                isConnected={isConnected}
                hasMessages={messages.length > 0}
                estimatedResponseTime="1-2 hours"
              />
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Greeting Message */}
                  {publicSettings.chat_greeting_message && (
                    <>
                      <ChatDateSeparator date={new Date()} />
                      <div className="flex flex-col items-start">
                        <p className="text-xs font-medium mb-1 px-1 text-muted-foreground">
                          {displaySupportName}
                        </p>
                        <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2 bg-muted text-foreground">
                          <p className="text-sm whitespace-pre-wrap">{publicSettings.chat_greeting_message}</p>
                        </div>
                      </div>
                    </>
                  )}
                  {messages.length === 0 && !publicSettings.chat_greeting_message ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                      <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
                      <p className="font-medium">Start a conversation</p>
                      <p className="text-sm">Send a message to begin chatting with our support team</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, index) => renderMessage(msg, index))}
                      {!isChatEnded && isOtherTyping && (
                        <div className="flex flex-col items-start animate-in fade-in-0 slide-in-from-left-2 duration-200">
                          <p className="text-xs font-medium mb-1 px-1 text-muted-foreground">
                            {displaySupportName}
                          </p>
                          <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-primary/60 animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 rounded-full bg-primary/60 animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }} />
                              <span className="w-2 h-2 rounded-full bg-primary/60 animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '400ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={scrollRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>

          {/* Input */}
          <div className="p-4 border-t shrink-0 space-y-3">
            {/* Chat Ended Indicator */}
            {isChatEnded && (
              <div className="flex flex-col items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">This conversation has ended</span>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Reason: {closeReasonLabel}
                </p>
                <Button
                  onClick={handleStartNewConversation}
                  disabled={isStartingNewConversation}
                  className="gap-2"
                >
                  {isStartingNewConversation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageSquarePlus className="w-4 h-4" />
                  )}
                  Start New Conversation
                </Button>
              </div>
            )}

            {/* Rating Prompt - only show if chat is not ended */}
            {!isChatEnded && !hasRatedRecently && messages.length > 0 && !showRatingPrompt && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">How was your support experience?</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRatingPrompt(true)}
                  className="gap-2"
                >
                  <Star className="w-4 h-4" />
                  Rate Chat
                </Button>
              </div>
            )}

            {/* Rating Form */}
            {showRatingPrompt && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Rate your experience</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRatingPrompt(false)}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setSelectedRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={cn(
                          "w-8 h-8 transition-colors",
                          star <= selectedRating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        )}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Any additional feedback? (optional)"
                  value={ratingFeedback}
                  onChange={(e) => setRatingFeedback(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
                <Button
                  onClick={handleSubmitRating}
                  disabled={selectedRating === 0 || isSubmittingRating}
                  className="w-full"
                >
                  {isSubmittingRating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Submit Rating
                </Button>
              </div>
            )}

            {/* Message Input - only show if chat is not ended */}
            {!isChatEnded && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    onBlur={stopTyping}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={isSending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputMessage.trim() || isSending}
                    className="shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserChat;
