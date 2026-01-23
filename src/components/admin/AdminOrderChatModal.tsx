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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Loader2, MessageSquare, User, Shield, AlertTriangle, Check, CheckCheck, Phone } from 'lucide-react';
import { useAdminOrderChat } from '@/hooks/useOrderChat';
import { useOrderTypingIndicator } from '@/hooks/useOrderTypingIndicator';
import { QuickReplySelector } from '@/components/order/QuickReplySelector';
import { SupportLiveIndicator } from '@/components/order/SupportLiveIndicator';
import { TypingIndicator } from '@/components/order/TypingIndicator';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AdminOrderChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  dropshipperName: string;
}

export const AdminOrderChatModal: React.FC<AdminOrderChatModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  dropshipperName,
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoadingMessages,
    customerName,
    dropshipperInfo,
    sendAsCustomer,
    isSending,
  } = useAdminOrderChat(orderId);

  const { isOtherTyping, typingLabel, setTyping, stopTyping } = useOrderTypingIndicator(
    isOpen ? orderId : null,
    'admin'
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOtherTyping]);

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    sendAsCustomer(inputMessage.trim());
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
      <DialogContent className="sm:max-w-[550px] h-[650px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Admin Chat - Impersonating Customer
            </DialogTitle>
            <Badge variant="secondary">
              {orderNumber}
            </Badge>
          </div>
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Dropshipper: <span className="font-medium text-foreground">{dropshipperInfo?.name || dropshipperName}</span>
              </span>
              <span>•</span>
              <span>
                Customer Name: <span className="font-medium text-primary">{customerName}</span>
              </span>
            </div>
            {dropshipperInfo?.mobileNumber && (
              <div className="flex items-center gap-1.5 text-sm">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Mobile:</span>
                <span className="font-medium text-foreground">{dropshipperInfo.mobileNumber}</span>
              </div>
            )}
            <SupportLiveIndicator />
          </div>
        </DialogHeader>

        <Alert variant="default" className="mx-4 mt-2 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
            Messages you send will appear as if they're from "{customerName}" to the dropshipper.
            All actions are logged for audit purposes.
          </AlertDescription>
        </Alert>

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
                Send a message as the customer to start the conversation
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isCustomer = msg.sender_type === 'customer';
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      isCustomer ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!isCustomer && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-blue-500/10 text-blue-600 text-xs">
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        'max-w-[70%] rounded-2xl px-4 py-2',
                        isCustomer
                          ? 'bg-amber-500 text-white'
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-[10px] font-medium mb-1 opacity-80">
                        {isCustomer ? `${customerName} (You as Admin)` : 'Dropshipper'}
                      </p>
                      <p className="text-sm break-words">{msg.message}</p>
                      <div
                        className={cn(
                          'flex items-center gap-1 mt-1',
                          isCustomer ? 'justify-end' : ''
                        )}
                      >
                        <span
                          className={cn(
                            'text-[10px]',
                            isCustomer ? 'text-white/70' : 'text-muted-foreground'
                          )}
                        >
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                        {isCustomer && (
                          msg.is_read ? (
                            <CheckCheck className="w-3 h-3 text-white/70" />
                          ) : (
                            <Check className="w-3 h-3 text-white/70" />
                          )
                        )}
                      </div>
                    </div>
                    {isCustomer && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-amber-500 text-white text-xs">
                          {customerName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
              {isOtherTyping && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-500/10 text-blue-600 text-xs">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <TypingIndicator label={typingLabel || 'Dropshipper is typing...'} />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t bg-amber-50/50 dark:bg-amber-950/10">
          <p className="text-xs text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Sending as: {customerName}
          </p>
          <div className="flex gap-2">
            <QuickReplySelector 
              onSelect={(message) => setInputMessage(message)}
              customerName={customerName}
            />
            <Input
              placeholder="Type a message as the customer..."
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
              className="bg-amber-500 hover:bg-amber-600"
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
