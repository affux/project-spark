import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Zap, Search, Loader2 } from 'lucide-react';
import { useQuickReplies, QuickReply } from '@/hooks/useQuickReplies';

interface QuickReplySelectorProps {
  onSelect: (message: string) => void;
  customerName?: string;
}

export const QuickReplySelector: React.FC<QuickReplySelectorProps> = ({
  onSelect,
  customerName = 'Customer',
}) => {
  const { quickReplies, isLoading } = useQuickReplies();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const activeReplies = quickReplies.filter((r) => r.is_active);
  
  const filteredReplies = activeReplies.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.message.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
  );

  const groupedReplies = filteredReplies.reduce((acc, reply) => {
    const cat = reply.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(reply);
    return acc;
  }, {} as Record<string, QuickReply[]>);

  const handleSelect = (reply: QuickReply) => {
    // Replace placeholders
    const message = reply.message.replace(/\{customer\}/gi, customerName);
    onSelect(message);
    setIsOpen(false);
    setSearch('');
  };

  if (activeReplies.length === 0 && !isLoading) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          title="Quick replies"
        >
          <Zap className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="max-h-[300px]">
          {isLoading ? (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReplies.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No templates found
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedReplies).map(([category, replies]) => (
                <div key={category} className="mb-3 last:mb-0">
                  <div className="text-xs font-medium text-muted-foreground px-2 mb-1 capitalize">
                    {category}
                  </div>
                  {replies.map((reply) => (
                    <button
                      key={reply.id}
                      onClick={() => handleSelect(reply)}
                      className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="font-medium text-sm">{reply.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {reply.message}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
