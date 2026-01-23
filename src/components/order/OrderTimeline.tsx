import React from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Clock, CreditCard, Package, Truck, XCircle, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusHistoryItem {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by_type: string;
  notes: string | null;
  created_at: string;
}

interface OrderTimelineProps {
  history: StatusHistoryItem[];
  className?: string;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending_payment: { label: 'Pending Payment', icon: Clock, color: 'text-amber-500' },
  paid_by_user: { label: 'Payment Submitted', icon: CreditCard, color: 'text-blue-500' },
  processing: { label: 'Processing', icon: Package, color: 'text-purple-500' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-emerald-500' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-500' },
};

const getChangedByIcon = (type: string) => {
  switch (type) {
    case 'admin':
      return User;
    case 'user':
      return User;
    default:
      return Bot;
  }
};

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ history, className }) => {
  if (history.length === 0) {
    return (
      <div className={cn("p-4 rounded-xl bg-muted/30 border text-center", className)}>
        <p className="text-sm text-muted-foreground">No status history available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-sm font-medium text-muted-foreground">Order Timeline</p>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-4">
          {history.map((item, index) => {
            const config = statusConfig[item.new_status] || { 
              label: item.new_status.replace(/_/g, ' '), 
              icon: Clock, 
              color: 'text-muted-foreground' 
            };
            const StatusIcon = config.icon;
            const ChangedByIcon = getChangedByIcon(item.changed_by_type);
            const isLatest = index === 0;

            return (
              <div key={item.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div
                  className={cn(
                    "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-background",
                    isLatest ? "border-primary" : "border-muted"
                  )}
                >
                  <StatusIcon className={cn("w-5 h-5", config.color)} />
                </div>

                {/* Content */}
                <div className={cn(
                  "flex-1 p-3 rounded-lg border",
                  isLatest ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn(
                        "font-medium",
                        isLatest && "text-primary"
                      )}>
                        {config.label}
                      </p>
                      {item.old_status && (
                        <p className="text-xs text-muted-foreground">
                          Changed from: {statusConfig[item.old_status]?.label || item.old_status.replace(/_/g, ' ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), 'h:mm a')}
                      </p>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <ChangedByIcon className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {item.changed_by_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
