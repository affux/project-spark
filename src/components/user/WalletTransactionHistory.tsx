import React from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownLeft, Receipt } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  order_id: string | null;
  created_at: string;
}

interface WalletTransactionHistoryProps {
  transactions: Transaction[];
  currencySymbol?: string;
  maxItems?: number;
}

export const WalletTransactionHistory: React.FC<WalletTransactionHistoryProps> = ({
  transactions,
  currencySymbol = '$',
  maxItems = 10,
}) => {
  const displayTransactions = transactions.slice(0, maxItems);

  const getTransactionIcon = (type: string) => {
    if (type === 'order_commission' || type === 'credit' || type === 'refund') {
      return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-rose-500" />;
  };

  const getTransactionColor = (type: string) => {
    if (type === 'order_commission' || type === 'credit' || type === 'refund') {
      return 'text-emerald-600 dark:text-emerald-400';
    }
    return 'text-rose-600 dark:text-rose-400';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      order_commission: 'Commission',
      credit: 'Credit',
      debit: 'Debit',
      payout: 'Payout',
      refund: 'Refund',
      adjustment: 'Adjustment',
    };
    return labels[type] || type;
  };

  const getTypeBadgeVariant = (type: string): 'default' | 'secondary' | 'outline' => {
    if (type === 'order_commission') return 'default';
    if (type === 'payout') return 'secondary';
    return 'outline';
  };

  if (displayTransactions.length === 0) {
    return (
      <div className="dashboard-card">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Receipt className="w-4 h-4" />
          Transaction History
        </h3>
        <div className="text-center py-8 text-muted-foreground">
          <p>No transactions yet</p>
          <p className="text-sm mt-1">Complete orders to see your earnings here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Receipt className="w-4 h-4" />
        Transaction History
      </h3>
      <ScrollArea className="h-[320px] pr-4">
        <div className="space-y-3">
          {displayTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-full bg-background">
                  {getTransactionIcon(tx.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {tx.description || getTypeLabel(tx.type)}
                    </span>
                    <Badge variant={getTypeBadgeVariant(tx.type)} className="text-xs">
                      {getTypeLabel(tx.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{format(new Date(tx.created_at), 'MMM d, yyyy • h:mm a')}</span>
                    {tx.order_id && (
                      <>
                        <span>•</span>
                        <span className="font-mono">Order ref</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className={cn('text-sm font-semibold', getTransactionColor(tx.type))}>
                {tx.type === 'order_commission' || tx.type === 'credit' || tx.type === 'refund'
                  ? '+'
                  : '-'}
                {currencySymbol}
                {Math.abs(tx.amount).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
