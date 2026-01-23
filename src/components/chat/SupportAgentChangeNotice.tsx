import React from 'react';
import { RefreshCw } from 'lucide-react';

interface SupportAgentChangeNoticeProps {
  previousName: string;
  newName: string;
}

export const SupportAgentChangeNotice: React.FC<SupportAgentChangeNoticeProps> = ({
  previousName,
  newName,
}) => {
  return (
    <div className="flex items-center justify-center my-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-muted-foreground text-xs">
        <RefreshCw className="w-3 h-3" />
        <span>
          Support agent changed from <span className="font-medium">{previousName}</span> to{' '}
          <span className="font-medium">{newName}</span>
        </span>
      </div>
    </div>
  );
};
