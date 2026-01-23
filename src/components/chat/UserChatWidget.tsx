import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useAIChat } from '@/hooks/useAIChat';
import { useChatPresence } from '@/hooks/useChatPresence';
import { useChatReassignmentNotification } from '@/hooks/useChatReassignmentNotification';
import { useAssignedAgent } from '@/hooks/useAssignedAgent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, X, Send, Loader2, Bot, Sparkles, Paperclip, RefreshCw, MessageSquarePlus, XCircle, Clock, UserSearch, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const UserChatWidget: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { messages, isLoading, unreadCount, sendMessage, isSending, markAsRead, isChatEnded, closeReasonLabel, startNewConversation, isStartingNewConversation } = useChat();
  const { isOtherTyping, setTyping } = useTypingIndicator();
  const { messages: aiMessages, isLoading: aiIsLoading, sendMessage: sendAIMessage } = useAIChat();
  const { 
    currentAgentName, 
    lastReassignment, 
    agentDisconnected, 
    chatStatus,
    isAgentDisconnected,
    isWaitingForSupport,
  } = useChatReassignmentNotification();
  const displayAgentName = isChatEnded ? 'Support' : (currentAgentName || 'Support');
  const { hasAssignedAgent, assignedAgent } = useAssignedAgent();
  const { updateActivity, isInGracePeriod, gracePeriodRemaining } = useChatPresence({
    inactivityTimeout: 30,
    gracePeriod: 30,
    immediateLeaveOnClose: true,
  });
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [aiInputMessage, setAiInputMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async (attachmentUrl?: string, attachmentType?: string, attachmentName?: string) => {
    if (inputMessage.trim() || attachmentUrl) {
      const messageText = inputMessage.trim() || (attachmentUrl ? `[Attachment: ${attachmentName}]` : '');
      sendMessage(messageText);
      setInputMessage('');
      setTyping(false);
    }
  };

  const handleAISend = () => {
    if (aiInputMessage.trim() && !aiIsLoading) {
      sendAIMessage(aiInputMessage.trim());
      setAiInputMessage('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    setTyping(e.target.value.length > 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAIKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAISend();
    }
  };

  const handleChatOpen = () => {
    setIsChatOpen(true);
    setIsAIOpen(false);
    markAsRead();
    updateActivity(); // Update activity when opening chat
  };

  const handleAIOpen = () => {
    setIsAIOpen(true);
    setIsChatOpen(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please select a file under 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
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

      // Send message with attachment info
      const attachmentMessage = `[Attachment]\nFile: ${file.name}\nURL: ${publicUrl}`;
      sendMessage(attachmentMessage);

      toast({
        title: 'File uploaded',
        description: 'Your file has been attached to the message.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not upload file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiMessages]);

  useEffect(() => {
    if (isChatOpen && unreadCount > 0) {
      markAsRead();
    }
  }, [isChatOpen, unreadCount, markAsRead]);

  const aiUnreadCount = 0; // AI doesn't have unread count

  return (
    <>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.txt"
        className="hidden"
      />

      {/* Support Chat Window */}
      {isChatOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] h-[500px] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex flex-col p-4 border-b bg-primary text-primary-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border-2 border-primary-foreground/20">
                  <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground font-semibold">
                    {(displayAgentName.charAt(0) || 'S').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {isChatEnded
                      ? 'Chat ended'
                      : (isAgentDisconnected
                        ? displayAgentName
                        : (displayAgentName !== 'Support' ? displayAgentName : 'Support Chat'))}
                  </span>
                  {isChatEnded ? (
                    <span className="text-xs text-primary-foreground/80">This conversation is closed</span>
                  ) : hasAssignedAgent ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                      </span>
                      <span className="text-xs font-medium text-primary-foreground/90 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {assignedAgent?.name || 'Agent'} is Live
                      </span>
                    </div>
                  ) : isAgentDisconnected ? (
                    <span className="text-xs text-amber-200 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Reconnecting...
                    </span>
                  ) : messages.length > 0 ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                      </span>
                      <span className="text-xs font-medium text-primary-foreground/90 flex items-center gap-1">
                        <UserSearch className="w-3 h-3" />
                        Waiting for agent
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-primary-foreground/70">Send a message to start</span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setIsChatOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Grace period indicator for user inactivity */}
            {isInGracePeriod && (
              <div className="mt-2 flex items-center gap-2 text-xs bg-primary-foreground/10 rounded px-2 py-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Session paused... ({gracePeriodRemaining}s)</span>
              </div>
            )}

            {/* Agent disconnected banner */}
            {isAgentDisconnected && !isInGracePeriod && (
              <div className="mt-2 flex items-center gap-2 text-xs bg-amber-500/20 rounded px-2 py-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Agent disconnected. Finding a new representative...</span>
              </div>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Send a message to start the conversation</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isUser = msg.sender_role === 'user';
                  // Use type assertion for system role since it may come from edge function
                  const senderRole = msg.sender_role as string;
                  const isSystemRole = senderRole === 'system';
                  const isReassignmentMessage = !isUser && 
                    msg.message.includes('support representative has been changed');
                  const isAgentDisconnectMessage = (isSystemRole || !isUser) && 
                    msg.message.includes('temporarily left the chat');
                  const isAgentReconnectMessage = (isSystemRole || !isUser) && 
                    msg.message.includes('has reconnected');
                  const isWaitingMessage = !isUser && 
                    msg.message.includes('All support agents are currently busy');
                  
                  // Check if this is any kind of system/status message
                  const isStatusMessage = isSystemRole || isReassignmentMessage || 
                    isAgentDisconnectMessage || isAgentReconnectMessage || isWaitingMessage;
                  
                  // System message styling for various types
                  if (isStatusMessage) {
                    let icon = <RefreshCw className="w-3 h-3" />;
                    let bgColor = 'bg-muted/50';
                    let textColor = 'text-muted-foreground';
                    
                    if (isAgentDisconnectMessage) {
                      icon = <RefreshCw className="w-3 h-3 animate-spin" />;
                      bgColor = 'bg-amber-100 dark:bg-amber-900/30';
                      textColor = 'text-amber-700 dark:text-amber-400';
                    } else if (isAgentReconnectMessage) {
                      icon = <span className="w-3 h-3 flex items-center justify-center">✓</span>;
                      bgColor = 'bg-green-100 dark:bg-green-900/30';
                      textColor = 'text-green-700 dark:text-green-400';
                    } else if (isWaitingMessage) {
                      icon = <Loader2 className="w-3 h-3 animate-spin" />;
                      bgColor = 'bg-blue-100 dark:bg-blue-900/30';
                      textColor = 'text-blue-700 dark:text-blue-400';
                    } else if (isReassignmentMessage) {
                      icon = <RefreshCw className="w-3 h-3" />;
                      bgColor = 'bg-primary/10';
                      textColor = 'text-primary';
                    }
                    
                    return (
                      <div key={msg.id} className="flex items-center justify-center my-3">
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs max-w-[85%] text-center",
                          bgColor,
                          textColor
                        )}>
                          {icon}
                          <span>{msg.message}</span>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-2",
                        isUser ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {!isUser && (
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
                            {(displayAgentName.charAt(0) || 'S').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[75%] rounded-lg px-3 py-2",
                          isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {!isUser && (
                          <p className="text-[10px] font-medium text-emerald-600 mb-0.5">
                            {displayAgentName}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <p
                          className={cn(
                            "text-[10px] mt-1",
                            isUser
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          )}
                        >
                          {format(new Date(msg.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {/* Typing indicator */}
                {!isChatEnded && isOtherTyping && (
                  <div className="flex gap-2 justify-start">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
                        {(displayAgentName.charAt(0) || 'S').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{displayAgentName} is typing</span>
                        <span className="flex gap-0.5">
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input or Chat Ended */}
          <div className="p-3 border-t">
            {isChatEnded ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <XCircle className="w-4 h-4" />
                  <span>Chat ended</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Reason: {closeReasonLabel}
                </p>
                <Button
                  onClick={() => startNewConversation()}
                  disabled={isStartingNewConversation}
                  size="sm"
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
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                </Button>
                <Input
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  disabled={isSending}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!inputMessage.trim() || isSending}
                  size="icon"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Chat Window */}
      {isAIOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-violet-500 to-purple-600 text-white">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bot className="w-5 h-5" />
                <Sparkles className="w-2.5 h-2.5 absolute -top-1 -right-1 text-yellow-300" />
              </div>
              <div>
                <span className="font-semibold">AI Assistant</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-8 w-8"
              onClick={() => setIsAIOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={aiScrollRef}>
            {aiMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-sm font-medium text-foreground">Hi! I'm your AI Assistant</p>
                <p className="text-xs mt-1 max-w-[240px]">
                  Ask me about account issues, KYC, storefronts, orders, or any other questions!
                </p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {['How do I set up my storefront?', 'Help with KYC', 'Track my earnings'].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendAIMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {aiMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2",
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                          : 'bg-muted'
                      )}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Bot className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                          <span className="text-xs font-medium text-violet-600 dark:text-violet-400">AI Assistant</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content || (aiIsLoading && msg.role === 'assistant' ? '...' : '')}</p>
                      <p
                        className={cn(
                          "text-[10px] mt-1",
                          msg.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
                        )}
                      >
                        {format(msg.timestamp, 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
                {aiIsLoading && aiMessages[aiMessages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t bg-muted/30">
            <div className="flex gap-2">
              <Input
                value={aiInputMessage}
                onChange={(e) => setAiInputMessage(e.target.value)}
                onKeyPress={handleAIKeyPress}
                placeholder="Ask me anything..."
                disabled={aiIsLoading}
                className="flex-1"
              />
              <Button
                onClick={handleAISend}
                disabled={!aiInputMessage.trim() || aiIsLoading}
                size="icon"
                className="bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                {aiIsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              AI responses are for guidance only. For account changes, use official channels.
            </p>
          </div>
        </div>
      )}

      {/* Jiggle animation style */}
      <style>{`
        @keyframes jiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(3deg); }
        }
      `}</style>
    </>
  );
};
