import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, MessageSquare, User, Check, CheckCheck } from 'lucide-react';
import { useOrderChat } from '@/hooks/useOrderChat';
import { useOrderTypingIndicator } from '@/hooks/useOrderTypingIndicator';
import { TypingIndicator } from '@/components/order/TypingIndicator';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { playNotificationSound } from '@/lib/notificationSound';

interface OrderChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
}

export const OrderChatModal: React.FC<OrderChatModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef<number>(0);

  const {
    messages,
    isLoadingMessages,
    customerName,
    sendMessage,
    isSending,
    markAsRead,
    assignCustomerName,
  } = useOrderChat(orderId);

  const { isOtherTyping, typingLabel, setTyping, stopTyping } = useOrderTypingIndicator(
    isOpen ? orderId : null,
    'user'
  );

  // Mark messages as read when opening
  useEffect(() => {
    if (isOpen && messages.some(m => m.sender_type === 'customer' && !m.is_read)) {
      markAsRead();
    }
  }, [isOpen, messages, markAsRead]);

  // Scroll to bottom on new messages and play sound for incoming messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    
    // Play notification sound when new message arrives from admin/customer (not from user)
    if (isOpen && messages.length > prevMessagesCountRef.current && prevMessagesCountRef.current > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage && latestMessage.sender_type !== 'user') {
        playNotificationSound();
      }
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages, isOtherTyping, isOpen]);

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    sendMessage(inputMessage.trim());
    setInputMessage('');
    stopTyping();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Order Chat
            <Badge variant="secondary" className="ml-auto">
              {orderNumber}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground">
                Start a conversation
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isUser = msg.sender_type === 'user';
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      isUser ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!isUser && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
                          {customerName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        'max-w-[70%] rounded-2xl px-4 py-2',
                        isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-sm break-words">{msg.message}</p>
                      <div
                        className={cn(
                          'flex items-center gap-1 mt-1',
                          isUser ? 'justify-end' : ''
                        )}
                      >
                        <span
                          className={cn(
                            'text-[10px]',
                            isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          )}
                        >
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                        {isUser && (
                          msg.is_read ? (
                            <CheckCheck className="w-3 h-3 text-primary-foreground/70" />
                          ) : (
                            <Check className="w-3 h-3 text-primary-foreground/70" />
                          )
                        )}
                      </div>
                    </div>
                    {isUser && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
              {isOtherTyping && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
                      {customerName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <TypingIndicator label={`${customerName} is typing...`} />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={inputMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isSending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={isSending || !inputMessage.trim()}
              size="icon"
              className="bg-muted hover:bg-muted/80 text-foreground"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
