import React from 'react';
import { CheckCircle2, Clock, CreditCard, Package, Truck, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type OrderStatus = 'pending_payment' | 'paid_by_user' | 'processing' | 'completed' | 'cancelled' | 'postpaid_pending';

interface OrderStatusProgressProps {
  status: OrderStatus;
  className?: string;
}

const steps = [
  { id: 'pending_payment', label: 'Pending Payment', icon: Clock },
  { id: 'paid_by_user', label: 'Payment Submitted', icon: CreditCard },
  { id: 'processing', label: 'Processing', icon: Package },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
];

const getStepIndex = (status: OrderStatus): number => {
  if (status === 'cancelled') return -1;
  const index = steps.findIndex(s => s.id === status);
  return index >= 0 ? index : 0;
};

export const OrderStatusProgress: React.FC<OrderStatusProgressProps> = ({ status, className }) => {
  const currentIndex = getStepIndex(status);
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <div className={cn("p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800", className)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="font-medium text-red-700 dark:text-red-300">Order Cancelled</p>
            <p className="text-sm text-red-600/80 dark:text-red-400/80">This order has been cancelled</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 rounded-xl bg-muted/30 border", className)}>
      <p className="text-sm font-medium mb-4 text-muted-foreground">Order Progress</p>
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isUpcoming = index > currentIndex;

            return (
              <div key={step.id} className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "bg-primary/20 border-primary text-primary animate-pulse",
                    isUpcoming && "bg-muted border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs text-center max-w-[80px]",
                    isCurrent && "font-semibold text-primary",
                    isCompleted && "text-muted-foreground",
                    isUpcoming && "text-muted-foreground/60"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
