import React, { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAdminChat, type ChatConversation } from '@/hooks/useAdminChat';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useAdminChatCustomerName } from '@/hooks/useAdminChatCustomerName';
import { useAdminReassignChatName } from '@/hooks/useAdminReassignChatName';
import { useIndianNames } from '@/hooks/useIndianNames';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  Search,
  User,
  ArrowLeft,
  Plus,
  Edit2,
  X,
  CheckSquare,
  Square,
  Users,
  XCircle,
  UserCheck,
  UserMinus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import type { ChatMessage } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChatRealtimeAdmin, useRealtimeConnection } from '@/hooks/useRealtimeSubscription';
import { useAgentViewingPresence } from '@/hooks/useAgentViewingPresence';
import { ChatLiveIndicator } from '@/components/chat/ChatLiveIndicator';
import { ChatDateSeparator } from '@/components/chat/ChatDateSeparator';
import { ChatReadReceipt } from '@/components/chat/ChatReadReceipt';

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
}

const AdminChat: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentAdmin } = useAuth();
  const {
    conversations,
    isLoadingConversations,
    fetchUserMessages,
    sendMessage,
    isSending,
    markAsRead,
    endChat,
    isEndingChat,
    assignToMe,
    isAssigning,
    unassign,
    isUnassigning,
  } = useAdminChat();

  // Enable real-time updates
  useChatRealtimeAdmin();
  const { isConnected } = useRealtimeConnection();
  
  // Get platform settings for default end message
  const { settingsMap } = usePlatformSettings();

  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyWithIndianName, setShowOnlyWithIndianName] = useState(false);
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [newConversationSearch, setNewConversationSearch] = useState('');
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
  const [isEndChatDialogOpen, setIsEndChatDialogOpen] = useState(false);
  const [endChatMessage, setEndChatMessage] = useState('');
  const [endChatReason, setEndChatReason] = useState('resolved');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track that admin is viewing this chat (for user's "Agent is viewing" indicator)
  useAgentViewingPresence(selectedConversation?.user_id);

  // Indian names for reassignment
  const { names: indianNames, isLoading: isLoadingNames } = useIndianNames();
  const { reassignName, isReassigning, bulkAssignNames, isBulkAssigning, removeName, isRemoving } = useAdminReassignChatName();

  // Initialize end chat message from settings when dialog opens
  useEffect(() => {
    if (isEndChatDialogOpen && settingsMap?.chat_end_message) {
      setEndChatMessage(settingsMap.chat_end_message);
    }
  }, [isEndChatDialogOpen, settingsMap?.chat_end_message]);

  // Calculate stats
  const totalConversations = conversations.length;
  const conversationsWithName = conversations.filter(c => c.indian_name).length;

  // Toggle selection of a conversation
  const toggleConversationSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Select/deselect all visible conversations
  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredConversations.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredConversations.map(c => c.user_id)));
    }
  };

  // Exit bulk mode
  const exitBulkMode = () => {
    setIsBulkMode(false);
    setSelectedUserIds(new Set());
  };

  // Fetch all users for new conversation dialog
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-for-chat'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .order('name');
      
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  // Filter users who don't have existing conversations
  const existingUserIds = new Set(conversations.map(c => c.user_id));
  const availableUsers = allUsers.filter(
    u => !existingUserIds.has(u.user_id) &&
      (u.name.toLowerCase().includes(newConversationSearch.toLowerCase()) ||
       u.email.toLowerCase().includes(newConversationSearch.toLowerCase()))
  );

  // Typing indicator for the selected conversation
  const { isOtherTyping, typingUserName, setTyping } = useTypingIndicator(selectedConversation?.user_id);

  // Get assigned Indian name for the selected conversation
  const { customerName: assignedIndianName } = useAdminChatCustomerName(selectedConversation?.user_id);

  // Fetch messages for selected user
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['admin-chat-messages', selectedConversation?.user_id],
    queryFn: () => fetchUserMessages(selectedConversation!.user_id),
    enabled: !!selectedConversation?.user_id,
  });

  const filteredConversations = conversations.filter(
    (c) =>
      (c.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.user_email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!showOnlyWithIndianName || c.indian_name)
  );

  const handleSelectConversation = (conv: ChatConversation) => {
    setSelectedConversation(conv);
    if (conv.unread_count > 0) {
      markAsRead(conv.user_id);
    }
  };

  const handleStartNewConversation = (user: UserProfile) => {
    // Create a temporary conversation object
    const newConv: ChatConversation = {
      user_id: user.user_id,
      user_name: user.name,
      user_email: user.email,
      last_message: '',
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    };
    setSelectedConversation(newConv);
    setIsNewConversationOpen(false);
    setNewConversationSearch('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    setTyping(e.target.value.length > 0);
  };

  const handleSend = () => {
    if (inputMessage.trim() && selectedConversation) {
      sendMessage({ userId: selectedConversation.user_id, message: inputMessage.trim() });
      setInputMessage('');
      setTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // While admin is actively viewing a conversation, immediately mark incoming user messages as read.
  // This ensures the user sees "Seen" without needing the admin to re-click the conversation.
  useEffect(() => {
    if (!selectedConversation?.user_id) return;

    // If chats are assigned, only the assigned agent should trigger read receipts.
    if (
      selectedConversation.assigned_agent_id &&
      currentAdmin?.id &&
      selectedConversation.assigned_agent_id !== currentAdmin.id
    ) {
      return;
    }

    const hasUnreadUserMessages = messages.some(
      (m) => m.sender_role === 'user' && m.is_read === false
    );

    if (hasUnreadUserMessages) {
      markAsRead(selectedConversation.user_id);
    }
  }, [messages, selectedConversation?.user_id, selectedConversation?.assigned_agent_id, currentAdmin?.id, markAsRead]);

  // Refetch messages when new ones arrive
  useEffect(() => {
    if (selectedConversation) {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-messages', selectedConversation.user_id] });
    }
  }, [conversations, selectedConversation, queryClient]);

  if (isLoadingConversations) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-48" />
          <div className="flex gap-4 h-[calc(100vh-200px)]">
            <Skeleton className="w-80 h-full rounded-xl" />
            <Skeleton className="flex-1 h-full rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Support Chat</h1>
              <p className="text-muted-foreground">Manage user conversations</p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {conversationsWithName} / {totalConversations} with assigned names
          </Badge>
        </div>

        {/* Chat Interface */}
        <div className="flex gap-4 h-[calc(100vh-220px)]">
          {/* Conversations List */}
          <div className={cn(
            "w-80 border rounded-xl flex flex-col bg-card",
            selectedConversation && "hidden md:flex"
          )}>
            {/* Search and New Conversation */}
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-indian-name"
                  checked={showOnlyWithIndianName}
                  onCheckedChange={(checked) => setShowOnlyWithIndianName(checked === true)}
                />
                <Label htmlFor="filter-indian-name" className="text-xs text-muted-foreground cursor-pointer">
                  Only with assigned name
                </Label>
              </div>
              <div className="flex gap-2">
                <Dialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1 gap-2">
                      <Plus className="w-4 h-4" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Start New Conversation</DialogTitle>
                      <DialogDescription>
                        Select a user to start a conversation with
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search users..."
                          value={newConversationSearch}
                          onChange={(e) => setNewConversationSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <ScrollArea className="h-[300px]">
                        {availableUsers.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <User className="w-10 h-10 mb-2 opacity-50" />
                            <p className="text-sm">No users available</p>
                            <p className="text-xs">All users already have conversations</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {availableUsers.map((user) => (
                              <button
                                key={user.user_id}
                                onClick={() => handleStartNewConversation(user)}
                                className="w-full p-3 text-left rounded-lg hover:bg-accent/50 transition-colors flex items-center gap-3"
                              >
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <User className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{user.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant={isBulkMode ? "default" : "outline"} 
                  className="flex-1 gap-2"
                  onClick={() => isBulkMode ? exitBulkMode() : setIsBulkMode(true)}
                >
                  <Users className="w-4 h-4" />
                  {isBulkMode ? 'Cancel' : 'Bulk'}
                </Button>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {isBulkMode && (
              <div className="p-3 border-b bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectAll}
                      className="gap-1 h-7 px-2"
                    >
                      {selectedUserIds.size === filteredConversations.length ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      {selectedUserIds.size === filteredConversations.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {selectedUserIds.size} selected
                  </Badge>
                </div>
                
                {selectedUserIds.size > 0 && (
                  <Dialog open={isBulkAssignDialogOpen} onOpenChange={setIsBulkAssignDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="w-full gap-2">
                        <Edit2 className="w-3.5 h-3.5" />
                        Assign Name to {selectedUserIds.size} Conversation{selectedUserIds.size > 1 ? 's' : ''}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Bulk Assign Indian Name</DialogTitle>
                        <DialogDescription>
                          Assign the same Indian name to {selectedUserIds.size} selected conversation{selectedUserIds.size > 1 ? 's' : ''}.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label>Select Name</Label>
                          <Select
                            onValueChange={(value) => {
                              bulkAssignNames({ 
                                userIds: Array.from(selectedUserIds), 
                                indianNameId: value 
                              });
                              setIsBulkAssignDialogOpen(false);
                              exitBulkMode();
                            }}
                            disabled={isBulkAssigning || isLoadingNames}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose an Indian name..." />
                            </SelectTrigger>
                            <SelectContent>
                              {indianNames.filter(n => n.is_active).map((name) => (
                                <SelectItem key={name.id} value={name.id}>
                                  {name.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}

            {/* Conversations */}
            <ScrollArea className="flex-1">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <MessageCircle className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.user_id}
                      className={cn(
                        "w-full p-4 text-left hover:bg-accent/50 transition-colors flex items-start gap-3",
                        selectedConversation?.user_id === conv.user_id && !isBulkMode && "bg-accent",
                        isBulkMode && selectedUserIds.has(conv.user_id) && "bg-primary/10"
                      )}
                    >
                      {isBulkMode ? (
                        <button
                          onClick={() => toggleConversationSelection(conv.user_id)}
                          className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 hover:bg-primary/20 transition-colors"
                        >
                          {selectedUserIds.has(conv.user_id) ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSelectConversation(conv)}
                          className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"
                        >
                          <User className="w-5 h-5 text-primary" />
                        </button>
                      )}
                      <button
                        onClick={() => isBulkMode ? toggleConversationSelection(conv.user_id) : handleSelectConversation(conv)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{conv.user_name}</p>
                          {conv.unread_count > 0 && (
                            <Badge className="bg-red-500 text-white text-xs px-1.5">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.user_email}
                        </p>
                        {conv.indian_name && (
                          <p className="text-xs text-primary truncate mt-0.5">
                            Chatting as: {conv.indian_name}
                          </p>
                        )}
                        {/* Assignment status badge */}
                        {conv.session_status === 'closed' ? (
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground w-fit">
                              Closed {conv.close_reason ? `(${conv.close_reason})` : ''}
                            </Badge>
                            {conv.previous_agent_name && (
                              <span className="text-xs text-muted-foreground">
                                Previously: {conv.previous_agent_name}
                              </span>
                            )}
                          </div>
                        ) : conv.assigned_agent_id ? (
                          <Badge variant="default" className="text-xs mt-0.5 bg-green-600">
                            Assigned
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs mt-0.5 text-amber-600 border-amber-600">
                            Unassigned
                          </Badge>
                        )}
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {conv.last_message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(conv.last_message_at), 'MMM d, h:mm a')}
                        </p>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className={cn(
            "flex-1 border rounded-xl flex flex-col bg-card",
            !selectedConversation && "hidden md:flex"
          )}>
            {!selectedConversation ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a user to start chatting</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-4 border-b">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{selectedConversation.user_name}</p>
                      {assignedIndianName && (
                        <Badge variant="secondary" className="text-xs">
                          Chatting as: {assignedIndianName}
                        </Badge>
                      )}
                      {/* Assignment status */}
                      {selectedConversation.assigned_agent_id ? (
                        <Badge variant="default" className="text-xs bg-green-600">
                          Assigned
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                          Unassigned
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedConversation.user_email}</p>
                  </div>
                  
                  {/* Show live indicator only if assigned */}
                  {selectedConversation.assigned_agent_id && (
                    <ChatLiveIndicator hasAssignedAgent={true} isChatActive={true} isConnected={isConnected} />
                  )}
                  
                  {/* Assign/Unassign Button */}
                  {selectedConversation.assigned_agent_id === currentAdmin?.id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => unassign(selectedConversation.user_id)}
                      disabled={isUnassigning}
                    >
                      {isUnassigning ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserMinus className="w-3.5 h-3.5" />
                      )}
                      Unassign Me
                    </Button>
                  ) : selectedConversation.assigned_agent_id ? (
                    <Badge variant="secondary" className="text-xs">
                      Assigned to another agent
                    </Badge>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1"
                      onClick={() => assignToMe(selectedConversation.user_id)}
                      disabled={isAssigning}
                    >
                      {isAssigning ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
                      )}
                      Assign to Me
                    </Button>
                  )}
                  
                  {/* Reassign Name Button */}
                  <Dialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Edit2 className="w-3.5 h-3.5" />
                        {assignedIndianName ? 'Change Name' : 'Assign Name'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {assignedIndianName ? 'Change Assigned Name' : 'Assign Indian Name'}
                        </DialogTitle>
                        <DialogDescription>
                          Select an Indian name to use for this support conversation.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label>Select Name</Label>
                          <Select
                            onValueChange={(value) => {
                              reassignName({ userId: selectedConversation.user_id, indianNameId: value });
                              setIsReassignDialogOpen(false);
                            }}
                            disabled={isReassigning || isLoadingNames}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose an Indian name..." />
                            </SelectTrigger>
                            <SelectContent>
                              {indianNames.filter(n => n.is_active).map((name) => (
                                <SelectItem key={name.id} value={name.id}>
                                  {name.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {assignedIndianName && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full gap-2"
                            onClick={() => {
                              removeName(selectedConversation.user_id);
                              setIsReassignDialogOpen(false);
                            }}
                            disabled={isRemoving}
                          >
                            <X className="w-4 h-4" />
                            Remove Assigned Name
                          </Button>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {/* End Chat Button */}
                  <Dialog open={isEndChatDialogOpen} onOpenChange={setIsEndChatDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        End Chat
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>End Chat Session</DialogTitle>
                        <DialogDescription>
                          This will send a closing message, clear all chat messages for this user, and remove any assigned name. The user will need to start a new conversation.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label>Close Reason</Label>
                          <Select value={endChatReason} onValueChange={setEndChatReason}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="resolved">Issue Resolved</SelectItem>
                              <SelectItem value="no_response">No Response from User</SelectItem>
                              <SelectItem value="spam">Spam / Inappropriate</SelectItem>
                              <SelectItem value="transferred">Transferred to Another Channel</SelectItem>
                              <SelectItem value="duplicate">Duplicate Conversation</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Closing Message</Label>
                          <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={endChatMessage}
                            onChange={(e) => setEndChatMessage(e.target.value)}
                            placeholder="Enter a closing message for the user..."
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => setIsEndChatDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              if (selectedConversation) {
                                endChat({ 
                                  userId: selectedConversation.user_id, 
                                  endMessage: endChatMessage,
                                  closeReason: endChatReason,
                                });
                                setIsEndChatDialogOpen(false);
                                setSelectedConversation(null);
                              }
                            }}
                            disabled={isEndingChat || !endChatMessage.trim()}
                          >
                            {isEndingChat ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <XCircle className="w-4 h-4 mr-2" />
                            )}
                            End Chat & Clear Messages
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-sm">No messages in this conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg: ChatMessage, index: number) => {
                        const prevMsg = index > 0 ? messages[index - 1] : undefined;
                        const showDateSeparator = !prevMsg || !isSameDay(
                          new Date(msg.created_at), 
                          new Date(prevMsg.created_at)
                        );
                        
                        return (
                          <React.Fragment key={msg.id}>
                            {showDateSeparator && (
                              <ChatDateSeparator date={new Date(msg.created_at)} />
                            )}
                            <div
                              className={cn(
                                "flex flex-col",
                                msg.sender_role === 'admin' ? 'items-end' : 'items-start'
                              )}
                            >
                              {/* Sender name label */}
                              <p className={cn(
                                "text-xs font-medium mb-1 px-1",
                                msg.sender_role === 'admin' ? 'text-primary' : 'text-muted-foreground'
                              )}>
                                {msg.sender_role === 'admin' ? 'Admin' : selectedConversation?.user_name || 'User'}
                              </p>
                              <div
                                className={cn(
                                  "max-w-[70%] rounded-lg px-4 py-2",
                                  msg.sender_role === 'admin'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                )}
                              >
                                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                <div className={cn(
                                  'flex items-center gap-1 mt-1',
                                  msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'
                                )}>
                                  <p
                                    className={cn(
                                      "text-[10px]",
                                      msg.sender_role === 'admin'
                                        ? 'text-primary-foreground/70'
                                        : 'text-muted-foreground'
                                    )}
                                  >
                                    {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                                  </p>
                                  {msg.sender_role === 'admin' && (
                                    <ChatReadReceipt isRead={msg.is_read} />
                                  )}
                                </div>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                      {/* Typing indicator */}
                      {isOtherTyping && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg px-4 py-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">{typingUserName || 'User'} is typing</span>
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

                {/* Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a reply..."
                      disabled={isSending}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!inputMessage.trim() || isSending}
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminChat;
