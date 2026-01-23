import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Wallet,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  History
} from 'lucide-react';
import { useCryptoPayments, CryptoPayment } from '@/hooks/useCryptoPayments';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const UserCryptoHistory: React.FC = () => {
  const { toast } = useToast();
  const { payments, isLoading } = useCryptoPayments();
  const [copiedHash, setCopiedHash] = React.useState<string | null>(null);

  const handleCopyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast({ title: 'Copied!', description: 'Transaction hash copied to clipboard.' });
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30"><Clock className="w-3 h-3" />Pending</Badge>;
      case 'verified':
        return <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30"><CheckCircle2 className="w-3 h-3" />Verified</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="gap-1 text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30"><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBlockchainExplorerUrl = (hash: string, walletName: string) => {
    const lowerName = walletName.toLowerCase();
    if (lowerName.includes('btc') || lowerName.includes('bitcoin')) {
      return `https://www.blockchain.com/btc/tx/${hash}`;
    } else if (lowerName.includes('eth') || lowerName.includes('ethereum')) {
      return `https://etherscan.io/tx/${hash}`;
    } else if (lowerName.includes('usdt') || lowerName.includes('trc')) {
      return `https://tronscan.org/#/transaction/${hash}`;
    }
    return null;
  };

  // Stats
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const verifiedCount = payments.filter(p => p.status === 'verified').length;
  const rejectedCount = payments.filter(p => p.status === 'rejected').length;
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-64" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <History className="w-8 h-8" />
            Crypto Payment History
          </h1>
          <p className="text-muted-foreground mt-1">
            View all your USDT wallet payment submissions and their verification status.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">Pending</p>
                  <p className="text-3xl font-bold text-amber-700">{pendingCount}</p>
                  {totalPending > 0 && (
                    <p className="text-xs text-amber-600 mt-1">${totalPending.toFixed(2)} awaiting</p>
                  )}
                </div>
                <Clock className="w-10 h-10 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600">Verified</p>
                  <p className="text-3xl font-bold text-emerald-700">{verifiedCount}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-emerald-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Rejected</p>
                  <p className="text-3xl font-bold text-red-700">{rejectedCount}</p>
                </div>
                <XCircle className="w-10 h-10 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Your Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>You haven't submitted any USDT wallet payments yet.</p>
                <p className="text-sm mt-1">When you pay for orders using USDT wallet, they'll appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Tx Hash</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const explorerUrl = payment.transaction_hash 
                        ? getBlockchainExplorerUrl(payment.transaction_hash, payment.wallet_name)
                        : null;

                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <span className="font-medium text-primary">
                              {payment.order_number || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{payment.wallet_name}</span>
                              <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                                {payment.wallet_address.slice(0, 8)}...{payment.wallet_address.slice(-6)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-primary">
                              {payment.currency_symbol}{payment.amount.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {payment.transaction_hash ? (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-xs truncate max-w-[100px]">
                                  {payment.transaction_hash.slice(0, 8)}...
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleCopyHash(payment.transaction_hash!)}
                                >
                                  {copiedHash === payment.transaction_hash ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                                {explorerUrl && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    asChild
                                  >
                                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Not provided
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getStatusBadge(payment.status)}
                              {payment.admin_notes && payment.status !== 'pending' && (
                                <p className="text-xs text-muted-foreground max-w-[150px] truncate" title={payment.admin_notes}>
                                  {payment.admin_notes}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{format(new Date(payment.created_at), 'MMM d, yyyy')}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(payment.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserCryptoHistory;
