import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatDateSeparatorProps {
  date: Date;
}

export const ChatDateSeparator: React.FC<ChatDateSeparatorProps> = ({ date }) => {
  const getDateLabel = (d: Date): string => {
    if (isToday(d)) {
      return 'Today';
    }
    if (isYesterday(d)) {
      return 'Yesterday';
    }
    return format(d, 'MMMM d, yyyy');
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
        {getDateLabel(date)}
      </div>
    </div>
  );
};
