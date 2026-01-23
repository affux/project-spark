import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CreditCard, X } from 'lucide-react';
import { usePostpaid } from '@/hooks/usePostpaid';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { differenceInDays, addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PostpaidDueReminderProps {
  onOpenPostpaidPanel?: () => void;
}

export const PostpaidDueReminder: React.FC<PostpaidDueReminderProps> = ({ onOpenPostpaidPanel }) => {
  const { postpaidStatus, isLoading } = usePostpaid();
  const { settingsMap } = usePlatformSettings();
  const currencySymbol = CURRENCY_SYMBOLS[settingsMap.default_currency] || '$';
  const [dismissed, setDismissed] = useState(false);

  // Don't show if loading, not enabled, no dues, or dismissed
  if (isLoading || !postpaidStatus?.enabled || !postpaidStatus?.outstandingDues || postpaidStatus.outstandingDues <= 0 || dismissed) {
    return null;
  }

  const { outstandingDues, dueCycle } = postpaidStatus;

  // Calculate urgency based on a hypothetical due date
  // In a real implementation, you'd track the actual transaction dates
  const daysUntilDue = dueCycle ? Math.max(0, dueCycle - 7) : null; // Simulate days remaining
  const isUrgent = daysUntilDue !== null && daysUntilDue <= 3;
  const isWarning = daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue > 3;

  return (
    <Alert 
      variant={isUrgent ? "destructive" : "default"}
      className={cn(
        "relative mb-4",
        isUrgent && "border-red-500/50 bg-red-500/10",
        isWarning && "border-amber-500/50 bg-amber-500/10",
        !isUrgent && !isWarning && "border-primary/50 bg-primary/5"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          isUrgent ? "bg-red-500/20" : isWarning ? "bg-amber-500/20" : "bg-primary/20"
        )}>
          {isUrgent ? (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          ) : (
            <Clock className="h-5 w-5 text-amber-500" />
          )}
        </div>
        
        <div className="flex-1">
          <AlertTitle className="flex items-center gap-2 mb-1">
            Postpaid Balance Due
            {isUrgent && (
              <Badge variant="destructive" className="text-xs">Urgent</Badge>
            )}
            {isWarning && (
              <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Due Soon</Badge>
            )}
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-sm">
              You have <span className="font-semibold">{currencySymbol}{outstandingDues.toFixed(2)}</span> in pending postpaid dues.
              {dueCycle && (
                <span className="text-muted-foreground">
                  {' '}Payment cycle: {dueCycle} days.
                </span>
              )}
            </p>
            {onOpenPostpaidPanel && (
              <Button
                size="sm"
                variant={isUrgent ? "destructive" : "default"}
                onClick={onOpenPostpaidPanel}
                className="mt-2"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pay Now
              </Button>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};
