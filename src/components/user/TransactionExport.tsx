import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

interface TransactionExportProps {
  transactions: Transaction[];
  currencySymbol: string;
}

export const TransactionExport: React.FC<TransactionExportProps> = ({ transactions, currencySymbol }) => {
  const { toast } = useToast();

  const exportToCSV = () => {
    if (transactions.length === 0) {
      toast({
        title: 'No Data',
        description: 'No transactions to export.',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Date', 'Type', 'Description', 'Amount'];
    const rows = transactions.map(tx => [
      format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm:ss'),
      tx.type.replace(/_/g, ' '),
      tx.description || tx.type.replace(/_/g, ' '),
      `${tx.amount > 0 ? '+' : ''}${currencySymbol}${tx.amount.toFixed(2)}`,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Successful',
      description: `${transactions.length} transactions exported to CSV.`,
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
      <Download className="w-4 h-4" />
      Export CSV
    </Button>
  );
};
