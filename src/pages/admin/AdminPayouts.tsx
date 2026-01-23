import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Check,
  X,
  Eye,
  Wallet,
  Loader2,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  EyeOff,
  Download,
  FileText,
  History,
  ArrowRight,
  Building2,
  CreditCard
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAdminPayouts, PayoutRequest, usePayoutStatusHistory } from '@/hooks/usePayoutRequests';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { maskSensitiveField } from '@/lib/maskingUtils';
import { supabase } from '@/integrations/supabase/client';
import { usePayoutRealtimeAdmin, useProfileRealtimeAdmin } from '@/hooks/useRealtimeSubscription';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
  cancelled: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled by user',
};

const AdminPayouts: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [processAction, setProcessAction] = useState<'approved' | 'rejected' | 'completed' | 'pending'>('approved');
  const [newStatus, setNewStatus] = useState<'pending' | 'approved' | 'rejected' | 'completed'>('pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [showUnmasked, setShowUnmasked] = useState(false);
  
  const { 
    payoutRequests, 
    pendingCount,
    totalPending,
    isLoading, 
    processPayout,
    isProcessingPayout 
  } = useAdminPayouts();

  const { settingsMap } = usePlatformSettings();
  const currencySymbol = CURRENCY_SYMBOLS[settingsMap.default_currency] || '$';

  // Enable real-time updates
  usePayoutRealtimeAdmin();
  useProfileRealtimeAdmin();

  // Fetch status history for selected payout
  const { history: statusHistory, isLoading: isLoadingHistory } = usePayoutStatusHistory(selectedPayout?.id || null);

  const filteredPayouts = payoutRequests.filter(payout =>
    payout.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payout.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payout.payment_method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewPayout = (payout: PayoutRequest) => {
    setSelectedPayout(payout);
    setIsViewDialogOpen(true);
  };

  const handleOpenProcess = (payout: PayoutRequest, action: 'approved' | 'rejected' | 'completed' | 'pending') => {
    setSelectedPayout(payout);
    setProcessAction(action);
    setAdminNotes('');
    setIsProcessDialogOpen(true);
  };

  const handleOpenStatusChange = (payout: PayoutRequest) => {
    setSelectedPayout(payout);
    setNewStatus(payout.status as 'pending' | 'approved' | 'rejected' | 'completed');
    setAdminNotes(payout.admin_notes || '');
    setIsStatusDialogOpen(true);
  };

  const handleProcessPayout = () => {
    if (!selectedPayout || !selectedPayout.id || !selectedPayout.user_id) {
      console.error('Invalid payout selection');
      return;
    }
    
    processPayout({
      payoutId: selectedPayout.id,
      status: processAction,
      adminNotes,
      userId: selectedPayout.user_id,
      amount: selectedPayout.amount,
      userName: selectedPayout.user_name,
      userEmail: selectedPayout.user_email,
      previousStatus: selectedPayout.status,
    });
    setIsProcessDialogOpen(false);
  };

  const handleStatusChange = () => {
    if (!selectedPayout || !selectedPayout.id || !selectedPayout.user_id) {
      console.error('Invalid payout selection');
      return;
    }
    
    processPayout({
      payoutId: selectedPayout.id,
      status: newStatus,
      adminNotes,
      userId: selectedPayout.user_id,
      amount: selectedPayout.amount,
      userName: selectedPayout.user_name,
      userEmail: selectedPayout.user_email,
      previousStatus: selectedPayout.status,
    });
    setIsStatusDialogOpen(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-48" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payout Requests</h1>
            <p className="text-muted-foreground mt-1">
              Review and process dropshipper payout requests.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-foreground">{pendingCount}</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="text-xl font-bold text-foreground">{currencySymbol}{totalPending.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search payouts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Payouts Table */}
        <div className="dashboard-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dropshipper</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{payout.user_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{payout.user_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{currencySymbol}{payout.amount.toFixed(2)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize flex items-center gap-1.5">
                      {payout.payment_method === 'crypto' && <Wallet className="w-4 h-4 text-muted-foreground" />}
                      {payout.payment_method === 'bank_transfer' && <Building2 className="w-4 h-4 text-muted-foreground" />}
                      {payout.payment_method === 'upi' && <CreditCard className="w-4 h-4 text-muted-foreground" />}
                      {payout.payment_method === 'paypal' && <DollarSign className="w-4 h-4 text-muted-foreground" />}
                      {payout.payment_method === 'crypto' ? 'USDT Wallet' : payout.payment_method.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge className={cn("border w-fit", statusColors[payout.status])}>
                        {statusLabels[payout.status] || payout.status}
                      </Badge>
                      {payout.status === 'cancelled' && payout.admin_notes && (
                        <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={payout.admin_notes}>
                          {payout.admin_notes.replace(/^Cancelled by user:?\s*/i, '').substring(0, 50) || 'No reason'}
                          {payout.admin_notes.replace(/^Cancelled by user:?\s*/i, '').length > 50 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(payout.created_at), 'MMM d, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleViewPayout(payout)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenStatusChange(payout)}
                        title="Change Status"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      {payout.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenProcess(payout, 'approved')}
                          >
                            <Check className="w-4 h-4 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenProcess(payout, 'rejected')}
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      {payout.status === 'approved' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenProcess(payout, 'completed')}
                          className="text-xs"
                        >
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredPayouts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No payout requests found.
            </div>
          )}
        </div>

        {/* View Payout Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Payout Request Details</DialogTitle>
              <DialogDescription>
                Requested on {selectedPayout && format(new Date(selectedPayout.created_at), 'PPp')}
              </DialogDescription>
            </DialogHeader>
            {selectedPayout && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Dropshipper</p>
                    <p className="font-medium">{selectedPayout.user_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-semibold text-lg">{currencySymbol}{selectedPayout.amount.toFixed(2)}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize flex items-center gap-1.5">
                    {selectedPayout.payment_method === 'crypto' && <Wallet className="w-4 h-4 text-muted-foreground" />}
                    {selectedPayout.payment_method === 'bank_transfer' && <Building2 className="w-4 h-4 text-muted-foreground" />}
                    {selectedPayout.payment_method === 'upi' && <CreditCard className="w-4 h-4 text-muted-foreground" />}
                    {selectedPayout.payment_method === 'paypal' && <DollarSign className="w-4 h-4 text-muted-foreground" />}
                    {selectedPayout.payment_method === 'crypto' ? 'USDT Wallet' : selectedPayout.payment_method.replace(/_/g, ' ')}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Payment Details</p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowUnmasked(!showUnmasked)}
                      className="h-7 px-2 text-xs gap-1"
                    >
                      {showUnmasked ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          Show Full
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                    {Object.entries(selectedPayout.payment_details).map(([key, value]) => {
                      // Handle bank statement download link
                      if ((key === 'bank_statement_path' || key === 'attachment_path') && value) {
                        const handleDownload = async () => {
                          const { data } = await supabase.storage
                            .from('payout-documents')
                            .createSignedUrl(String(value), 3600);
                          if (data?.signedUrl) {
                            window.open(data.signedUrl, '_blank');
                          }
                        };
                        return (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-muted-foreground capitalize">
                              {key === 'attachment_path' ? 'Supporting Document:' : 'Bank Statement:'}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDownload}
                              className="h-7 px-2 text-xs gap-1"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </Button>
                          </div>
                        );
                      }
                      
                      // Handle address confirmed status
                      if (key === 'address_confirmed') {
                        return (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-muted-foreground">Address Confirmed:</span>
                            <span className={cn(
                              "font-medium",
                              value === 'true' ? "text-emerald-600" : "text-red-600"
                            )}>
                              {value === 'true' ? '✓ Yes' : '✗ No'}
                            </span>
                          </div>
                        );
                      }
                      
                      // Skip empty values
                      if (!value) return null;
                      
                      return (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="font-medium font-mono">
                            {showUnmasked ? value : maskSensitiveField(key, String(value))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Badge className={cn("border", statusColors[selectedPayout.status])}>
                    {(statusLabels[selectedPayout.status] || selectedPayout.status).toUpperCase()}
                  </Badge>
                </div>

                {/* Cancellation Reason - Highlighted for cancelled payouts */}
                {selectedPayout.status === 'cancelled' && selectedPayout.admin_notes && (
                  <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Cancellation Reason</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {selectedPayout.admin_notes.replace(/^Cancelled by user:?\s*/i, '') || 'No reason provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Notes - For non-cancelled payouts */}
                {selectedPayout.status !== 'cancelled' && selectedPayout.admin_notes && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Admin Note:</span> {selectedPayout.admin_notes}
                    </p>
                  </div>
                )}

                {/* Status History / Audit Trail */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Status History</p>
                  </div>
                  {isLoadingHistory ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : statusHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No status changes recorded yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {statusHistory.map((entry) => (
                        <div key={entry.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {entry.old_status ? (
                                <>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {entry.old_status}
                                  </Badge>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                </>
                              ) : null}
                              <Badge className={cn("text-xs border capitalize", statusColors[entry.new_status] || '')}>
                                {entry.new_status}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              By: {entry.changed_by_name}
                            </span>
                            {entry.notes && (
                              <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                                "{entry.notes}"
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Process Payout Dialog */}
        <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>
                {processAction === 'approved' && 'Approve Payout'}
                {processAction === 'rejected' && 'Reject Payout'}
                {processAction === 'completed' && 'Mark as Completed'}
              </DialogTitle>
              <DialogDescription>
                {processAction === 'approved' && 'Approve this payout request for processing.'}
                {processAction === 'rejected' && 'Reject this payout and return funds to wallet.'}
                {processAction === 'completed' && 'Mark this payout as completed after sending funds.'}
              </DialogDescription>
            </DialogHeader>
            {selectedPayout && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-bold text-lg">{currencySymbol}{selectedPayout.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-muted-foreground">Dropshipper:</span>
                    <span className="font-medium">{selectedPayout.user_name}</span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="admin-notes">Admin Notes (optional)</Label>
                  <Textarea
                    id="admin-notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={processAction === 'rejected' ? 'Reason for rejection...' : 'Add a note...'}
                    rows={2}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleProcessPayout}
                disabled={isProcessingPayout}
                className={cn(
                  processAction === 'rejected' && 'bg-red-600 hover:bg-red-700',
                  processAction === 'approved' && 'bg-emerald-600 hover:bg-emerald-700'
                )}
              >
                {isProcessingPayout && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {processAction === 'approved' && <CheckCircle className="w-4 h-4 mr-2" />}
                {processAction === 'rejected' && <XCircle className="w-4 h-4 mr-2" />}
                {processAction === 'completed' && <Check className="w-4 h-4 mr-2" />}
                {processAction === 'approved' && 'Approve'}
                {processAction === 'rejected' && 'Reject'}
                {processAction === 'completed' && 'Complete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Status Dialog */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Change Payout Status</DialogTitle>
              <DialogDescription>
                Manually change the status of this payout request.
              </DialogDescription>
            </DialogHeader>
            {selectedPayout && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-bold text-lg">{currencySymbol}{selectedPayout.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-muted-foreground">Dropshipper:</span>
                    <span className="font-medium">{selectedPayout.user_name}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-muted-foreground">Current Status:</span>
                    <Badge className={cn("border", statusColors[selectedPayout.status])}>
                      {statusLabels[selectedPayout.status] || selectedPayout.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>New Status</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as typeof newStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status-notes">Admin Notes (optional)</Label>
                  <Textarea
                    id="status-notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add a note about this status change..."
                    rows={2}
                  />
                </div>

                {newStatus === 'rejected' && selectedPayout.status !== 'rejected' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-700">
                    Note: Rejecting this payout will refund {currencySymbol}{selectedPayout.amount.toFixed(2)} to the dropshipper's wallet.
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleStatusChange} disabled={isProcessingPayout}>
                {isProcessingPayout && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <RotateCcw className="w-4 h-4 mr-2" />
                Update Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminPayouts;
