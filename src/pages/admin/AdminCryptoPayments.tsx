import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MoreHorizontal,
  ExternalLink,
  Copy,
  Check,
  Wallet,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Equal,
  Image as ImageIcon,
  Eye
} from 'lucide-react';
import { useCryptoPayments, CryptoPayment } from '@/hooks/useCryptoPayments';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const AdminCryptoPayments: React.FC = () => {
  const { toast } = useToast();
  const { 
    payments, 
    isLoading, 
    paymentCounts, 
    updatePaymentStatus,
    isUpdatingStatus 
  } = useCryptoPayments();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedPayment, setSelectedPayment] = useState<CryptoPayment | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Count underpaid payments
  const underpaidCount = payments.filter(payment => {
    if (!payment.order_total || !payment.amount || payment.status !== 'pending') return false;
    const diff = Math.abs(payment.amount - payment.order_total);
    const percentDiff = (diff / payment.order_total) * 100;
    return payment.amount < payment.order_total && percentDiff > 1;
  }).length;

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.wallet_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.wallet_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.transaction_hash?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.order_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Handle underpaid filter
    if (activeTab === 'underpaid') {
      if (!payment.order_total || !payment.amount || payment.status !== 'pending') return false;
      const diff = Math.abs(payment.amount - payment.order_total);
      const percentDiff = (diff / payment.order_total) * 100;
      return matchesSearch && payment.amount < payment.order_total && percentDiff > 1;
    }
    
    const matchesTab = activeTab === 'all' || payment.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const handleCopyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast({ title: 'Copied!', description: 'Transaction hash copied to clipboard.' });
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleVerify = async () => {
    if (!selectedPayment) return;
    await updatePaymentStatus({
      paymentId: selectedPayment.id,
      status: 'verified',
      adminNotes: adminNotes || undefined,
      paymentDetails: {
        userName: selectedPayment.user_name || 'User',
        userEmail: selectedPayment.user_email || '',
        userId: selectedPayment.user_id,
        amount: selectedPayment.amount,
        currencySymbol: selectedPayment.currency_symbol,
        walletName: selectedPayment.wallet_name,
        transactionHash: selectedPayment.transaction_hash || undefined,
        paymentPurpose: selectedPayment.payment_purpose,
      },
    });
    setVerifyDialogOpen(false);
    setSelectedPayment(null);
    setAdminNotes('');
  };

  const handleReject = async () => {
    if (!selectedPayment) return;
    await updatePaymentStatus({
      paymentId: selectedPayment.id,
      status: 'rejected',
      adminNotes: adminNotes || undefined,
      paymentDetails: {
        userName: selectedPayment.user_name || 'User',
        userEmail: selectedPayment.user_email || '',
        userId: selectedPayment.user_id,
        amount: selectedPayment.amount,
        currencySymbol: selectedPayment.currency_symbol,
        walletName: selectedPayment.wallet_name,
        transactionHash: selectedPayment.transaction_hash || undefined,
        paymentPurpose: selectedPayment.payment_purpose,
      },
    });
    setRejectDialogOpen(false);
    setSelectedPayment(null);
    setAdminNotes('');
  };

  // Payment matching helper
  const getPaymentMatchStatus = (payment: CryptoPayment) => {
    if (!payment.order_total || !payment.amount) return null;
    const diff = Math.abs(payment.amount - payment.order_total);
    const percentDiff = (diff / payment.order_total) * 100;
    
    if (diff < 0.01) return { status: 'exact', label: 'Exact Match', color: 'text-emerald-600 bg-emerald-50' };
    if (percentDiff <= 1) return { status: 'close', label: 'Close Match', color: 'text-amber-600 bg-amber-50' };
    if (payment.amount > payment.order_total) return { status: 'overpaid', label: 'Overpaid', color: 'text-blue-600 bg-blue-50' };
    return { status: 'underpaid', label: 'Underpaid', color: 'text-red-600 bg-red-50' };
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
          <h1 className="text-3xl font-bold text-foreground">Crypto Payments</h1>
          <p className="text-muted-foreground mt-1">
            View and verify pending USDT wallet payments from users.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">Pending</p>
                  <p className="text-3xl font-bold text-amber-700">{paymentCounts.pending}</p>
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
                  <p className="text-3xl font-bold text-emerald-700">{paymentCounts.verified}</p>
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
                  <p className="text-3xl font-bold text-red-700">{paymentCounts.rejected}</p>
                </div>
                <XCircle className="w-10 h-10 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments Table */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Payment Submissions
              </CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search payments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 flex-wrap">
                <TabsTrigger value="pending" className="gap-1">
                  Pending
                  {paymentCounts.pending > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">{paymentCounts.pending}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="underpaid" className="gap-1">
                  <TrendingDown className="w-3 h-3" />
                  Underpaid
                  {underpaidCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5">{underpaidCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="verified">Verified</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                {filteredPayments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No {activeTab === 'all' ? '' : activeTab} payments found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Wallet</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Proof</TableHead>
                          <TableHead>Tx Hash</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => {
                          const explorerUrl = payment.transaction_hash 
                            ? getBlockchainExplorerUrl(payment.transaction_hash, payment.wallet_name)
                            : null;
                          const matchStatus = getPaymentMatchStatus(payment);

                          return (
                            <TableRow key={payment.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">{payment.user_name || 'Unknown'}</span>
                                  <span className="text-xs text-muted-foreground">{payment.user_email}</span>
                                  {payment.order_number && (
                                    <span className="text-xs text-primary">{payment.order_number}</span>
                                  )}
                                  {payment.payment_purpose === 'postpaid' && (
                                    <Badge variant="outline" className="w-fit mt-1 text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-600 bg-amber-500/10">
                                      Postpaid Dues
                                    </Badge>
                                  )}
                                </div>
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
                                <div className="flex flex-col gap-1">
                                  <span className="font-semibold text-primary">
                                    {payment.currency_symbol}{payment.amount.toFixed(2)}
                                  </span>
                                  {payment.order_total && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground">
                                        Order: {payment.currency_symbol}{payment.order_total.toFixed(2)}
                                      </span>
                                      {matchStatus && (
                                        <span className={cn(
                                          "text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5",
                                          matchStatus.color
                                        )}>
                                          {matchStatus.status === 'exact' && <Equal className="w-3 h-3" />}
                                          {matchStatus.status === 'overpaid' && <TrendingUp className="w-3 h-3" />}
                                          {matchStatus.status === 'underpaid' && <TrendingDown className="w-3 h-3" />}
                                          {matchStatus.label}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {payment.payment_proof_url ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-1 text-xs"
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setProofDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="w-3 h-3" />
                                    View
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" />
                                    No proof
                                  </span>
                                )}
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
                              <TableCell>{getStatusBadge(payment.status)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm">{format(new Date(payment.created_at), 'MMM d, yyyy')}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(payment.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {payment.status === 'pending' && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        className="text-emerald-600 gap-2"
                                        onClick={() => {
                                          setSelectedPayment(payment);
                                          setVerifyDialogOpen(true);
                                        }}
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Verify Payment
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-red-600 gap-2"
                                        onClick={() => {
                                          setSelectedPayment(payment);
                                          setRejectDialogOpen(true);
                                        }}
                                      >
                                        <XCircle className="w-4 h-4" />
                                        Reject Payment
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Verify Dialog */}
        <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                Verify Payment
              </DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                {/* Payment Matching Alert */}
                {(() => {
                  const matchStatus = getPaymentMatchStatus(selectedPayment);
                  if (matchStatus && selectedPayment.order_total) {
                    return (
                      <div className={cn(
                        "p-3 rounded-lg border flex items-start gap-2",
                        matchStatus.status === 'exact' && "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30",
                        matchStatus.status === 'close' && "bg-amber-50 border-amber-200 dark:bg-amber-950/30",
                        matchStatus.status === 'overpaid' && "bg-blue-50 border-blue-200 dark:bg-blue-950/30",
                        matchStatus.status === 'underpaid' && "bg-red-50 border-red-200 dark:bg-red-950/30"
                      )}>
                        {matchStatus.status === 'exact' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
                        {matchStatus.status === 'close' && <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
                        {matchStatus.status === 'overpaid' && <TrendingUp className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
                        {matchStatus.status === 'underpaid' && <TrendingDown className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
                        <div className="text-sm">
                          <p className="font-medium">{matchStatus.label}</p>
                          <p className="text-muted-foreground">
                            Payment: {selectedPayment.currency_symbol}{selectedPayment.amount.toFixed(2)} | 
                            Order Total: {selectedPayment.currency_symbol}{selectedPayment.order_total.toFixed(2)}
                            {matchStatus.status === 'underpaid' && (
                              <span className="text-red-600 ml-1">
                                (Short by {selectedPayment.currency_symbol}{(selectedPayment.order_total - selectedPayment.amount).toFixed(2)})
                              </span>
                            )}
                            {matchStatus.status === 'overpaid' && (
                              <span className="text-blue-600 ml-1">
                                (Excess {selectedPayment.currency_symbol}{(selectedPayment.amount - selectedPayment.order_total).toFixed(2)})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">User:</span>
                    <p className="font-medium">{selectedPayment.user_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <p className="font-medium text-primary">
                      {selectedPayment.currency_symbol}{selectedPayment.amount.toFixed(2)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Wallet:</span>
                    <p className="font-medium">{selectedPayment.wallet_name}</p>
                  </div>
                  {selectedPayment.transaction_hash && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Transaction Hash:</span>
                      <p className="font-mono text-xs break-all">{selectedPayment.transaction_hash}</p>
                    </div>
                  )}
                  {selectedPayment.payment_proof_url && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Payment Proof:</span>
                      <div className="mt-2 border rounded-lg overflow-hidden bg-muted/30">
                        <img 
                          src={selectedPayment.payment_proof_url} 
                          alt="Payment proof" 
                          className="w-full max-h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setProofDialogOpen(true)}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Admin Notes (optional)</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this verification..."
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleVerify} 
                disabled={isUpdatingStatus}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm Verification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                Reject Payment
              </DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">User:</span>
                    <p className="font-medium">{selectedPayment.user_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <p className="font-medium">{selectedPayment.currency_symbol}{selectedPayment.amount.toFixed(2)}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Reason for rejection</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Explain why this payment is being rejected..."
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleReject} 
                disabled={isUpdatingStatus}
                variant="destructive"
              >
                {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Reject Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Proof View Dialog */}
        <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Payment Proof
              </DialogTitle>
            </DialogHeader>
            {selectedPayment?.payment_proof_url && (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden bg-muted/30">
                  <img 
                    src={selectedPayment.payment_proof_url} 
                    alt="Payment proof" 
                    className="w-full max-h-[70vh] object-contain"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">User:</span>
                    <p className="font-medium">{selectedPayment.user_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <p className="font-medium text-primary">
                      {selectedPayment.currency_symbol}{selectedPayment.amount.toFixed(2)}
                    </p>
                  </div>
                  {selectedPayment.order_number && (
                    <div>
                      <span className="text-muted-foreground">Order:</span>
                      <p className="font-medium">{selectedPayment.order_number}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p>{getStatusBadge(selectedPayment.status)}</p>
                  </div>
                </div>
                {selectedPayment.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={() => {
                        setProofDialogOpen(false);
                        setVerifyDialogOpen(true);
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Verify Payment
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        setProofDialogOpen(false);
                        setRejectDialogOpen(true);
                      }}
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Payment
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminCryptoPayments;
