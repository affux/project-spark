import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  Save,
  AlertTriangle,
  Download,
  FileText,
  Info,
  RefreshCw,
  Copy,
  Eye
} from 'lucide-react';
import { usePendingPaymentBlock } from '@/hooks/usePendingPaymentBlock';
import { PendingPaymentBlockPopup } from '@/components/popup/PendingPaymentBlockPopup';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { usePayoutRequests } from '@/hooks/usePayoutRequests';
import { useUserDashboard } from '@/hooks/useUserDashboard';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { useKYC } from '@/hooks/useKYC';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AddFundsSection } from '@/components/user/AddFundsSection';
import { CommissionHistory } from '@/components/user/CommissionHistory';
import { EarningsChart } from '@/components/user/EarningsChart';
import { TransactionExport } from '@/components/user/TransactionExport';
import { PostpaidCreditPanel } from '@/components/user/PostpaidCreditPanel';
import { usePostpaid } from '@/hooks/usePostpaid';
import { usePayoutRealtimeUser, useWalletRealtimeUser, useProfileRealtimeUser } from '@/hooks/useRealtimeSubscription';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useQueryClient } from '@tanstack/react-query';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600',
  approved: 'bg-blue-500/10 text-blue-600',
  completed: 'bg-emerald-500/10 text-emerald-600',
  rejected: 'bg-red-500/10 text-red-600',
  cancelled: 'bg-slate-500/10 text-slate-600',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  approved: <CheckCircle className="w-3 h-3" />,
  completed: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled by user',
};

const UserPayments: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankStatement, setBankStatement] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [ifscValidation, setIfscValidation] = useState<{
    valid: boolean | null;
    bank?: string;
    branch?: string;
    error?: string;
    loading: boolean;
  }>({ valid: null, loading: false });
  const [accountNumberError, setAccountNumberError] = useState('');
  
  // UPI state
  const [upiId, setUpiId] = useState('');
  const [upiIdError, setUpiIdError] = useState('');
  
  // Crypto/USD Wallet state
  const [cryptoWalletAddress, setCryptoWalletAddress] = useState('');
  const [cryptoWalletConfirmed, setCryptoWalletConfirmed] = useState(false);
  const [cryptoAttachment, setCryptoAttachment] = useState<File | null>(null);
  
  // Save payment details state
  const [savePaymentDetails, setSavePaymentDetails] = useState(false);
  const [savedPaymentDetails, setSavedPaymentDetails] = useState<{
    bank?: { accountName: string; accountNumber: string; ifscCode: string; bankName?: string; branchName?: string };
    upi?: { upiId: string };
    crypto?: { walletAddress: string };
  } | null>(null);
  const [useSavedDetails, setUseSavedDetails] = useState(false);

  // Cancel confirmation dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [payoutToCancel, setPayoutToCancel] = useState<{ id: string; amount: number } | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Pending payment block state
  const [showPendingPaymentPopup, setShowPendingPaymentPopup] = useState(false);
  const { 
    pendingCount: pendingPaymentCount, 
    pendingOrders: pendingPaymentOrders, 
    isBlocked: isPayoutBlockedByPendingPayments,
    settings: pendingPaymentSettings,
    isLoading: isLoadingPendingPaymentBlock 
  } = usePendingPaymentBlock();

  const { profile, transactions, orders, stats, isLoading: dashboardLoading } = useUserDashboard();
  const { payoutRequests, isLoading: payoutsLoading, createPayout, isCreatingPayout, cancelPayout, isCancellingPayout } = usePayoutRequests();
  const { settingsMap } = usePlatformSettings();
  const { settings: publicSettings, isLoading: isLoadingPublicSettings } = usePublicSettings();
  const { isKYCApproved } = useKYC();
  const { postpaidStatus } = usePostpaid();
  const queryClient = useQueryClient();

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['user-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['payout-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['postpaid-status'] }),
    ]);
  }, [queryClient]);

  const { pullDistance, isRefreshing, handlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });

  // Enable real-time updates
  usePayoutRealtimeUser(user?.id);
  useWalletRealtimeUser(user?.id);
  useProfileRealtimeUser(user?.id);

  const walletBalance = Number(profile?.wallet_balance ?? 0);
  const pendingHold = payoutRequests
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  // If "Payout with Dues" is allowed, hold the dues amount from the withdrawable balance
  const postpaidDuesAmount = Number(postpaidStatus?.outstandingDues ?? 0);
  const allowPayoutWithDuesFlag = Boolean(profile?.allow_payout_with_dues);
  const duesHoldAmount = allowPayoutWithDuesFlag ? postpaidDuesAmount : 0;

  // Show full balance until admin approves; still compute withdrawable to prevent over-withdrawal.
  const availableBalance = walletBalance;
  const withdrawableBalance = Math.max(0, walletBalance - pendingHold - duesHoldAmount);

  const minPayoutAmount = settingsMap.min_payout_amount;
  // Use public settings for payout enabled/disabled status
  const payoutEnabled = publicSettings.payout_enabled;
  const payoutDisabledMessage = publicSettings.payout_disabled_message;
  const payoutMethodsEnabled = publicSettings.payout_methods_enabled;
  
  // Check if user has postpaid dues and is blocked from payouts
  const postpaidDues = Number(postpaidStatus?.outstandingDues ?? 0);
  const allowPayoutWithDues = Boolean(profile?.allow_payout_with_dues);
  const isBlockedByPostpaidDues = postpaidDues > 0 && !allowPayoutWithDues;
  
  const canRequestPayout = payoutEnabled && isKYCApproved && withdrawableBalance >= minPayoutAmount && !isBlockedByPostpaidDues;
  const currencySymbol = CURRENCY_SYMBOLS[settingsMap.default_currency] || '$';
  
  // Get available payment methods based on admin settings
  const availablePaymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer', enabled: payoutMethodsEnabled.bank_transfer },
    { value: 'upi', label: 'UPI', enabled: payoutMethodsEnabled.upi },
    { value: 'paypal', label: 'PayPal', enabled: payoutMethodsEnabled.paypal },
    { value: 'crypto', label: 'USDT Wallet', enabled: payoutMethodsEnabled.crypto },
  ].filter(m => m.enabled);

  // Set default payment method when dialog opens
  useEffect(() => {
    if (isPayoutDialogOpen && !paymentMethod && availablePaymentMethods.length > 0) {
      setPaymentMethod(availablePaymentMethods[0].value);
    }
  }, [isPayoutDialogOpen, paymentMethod, availablePaymentMethods]);
  
  // Calculate total order value and profit
  const totalOrderValue = orders.reduce((sum, o) => sum + (o.selling_price * o.quantity), 0);
  const totalProfit = stats.totalRevenue;

  // Load saved payment details from profile
  useEffect(() => {
    if (profile?.saved_payment_details) {
      const details = profile.saved_payment_details as typeof savedPaymentDetails;
      setSavedPaymentDetails(details);
    }
  }, [profile]);

  // Apply saved details when checkbox is toggled
  useEffect(() => {
    if (useSavedDetails && savedPaymentDetails) {
      if (paymentMethod === 'bank_transfer' && savedPaymentDetails.bank) {
        setAccountName(savedPaymentDetails.bank.accountName);
        setAccountNumber(savedPaymentDetails.bank.accountNumber);
        setConfirmAccountNumber(savedPaymentDetails.bank.accountNumber);
        setIfscCode(savedPaymentDetails.bank.ifscCode);
        if (savedPaymentDetails.bank.bankName) {
          setIfscValidation({
            valid: true,
            bank: savedPaymentDetails.bank.bankName,
            branch: savedPaymentDetails.bank.branchName,
            loading: false
          });
        }
      } else if (paymentMethod === 'upi' && savedPaymentDetails.upi) {
        setUpiId(savedPaymentDetails.upi.upiId);
      } else if (paymentMethod === 'crypto' && savedPaymentDetails.crypto) {
        setCryptoWalletAddress(savedPaymentDetails.crypto.walletAddress);
      }
    }
  }, [useSavedDetails, paymentMethod, savedPaymentDetails]);

  // Validate UPI ID format
  const validateUpiId = (id: string): boolean => {
    // UPI ID format: username@bankhandle (e.g., name@upi, phone@paytm)
    const upiPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    return upiPattern.test(id);
  };

  const handleUpiIdChange = (value: string) => {
    const lowercaseValue = value.toLowerCase();
    setUpiId(lowercaseValue);
    
    if (lowercaseValue.length > 0 && !validateUpiId(lowercaseValue)) {
      setUpiIdError('Invalid UPI ID format (e.g., name@upi, phone@paytm)');
    } else {
      setUpiIdError('');
    }
  };

  // Validate IFSC code with API
  const validateIfsc = async (code: string) => {
    if (code.length !== 11) {
      setIfscValidation({ valid: null, loading: false });
      return;
    }
    
    setIfscValidation({ valid: null, loading: true });
    
    try {
      const { data, error } = await supabase.functions.invoke('validate-ifsc', {
        body: { ifsc: code }
      });
      
      if (error) throw error;
      
      if (data.valid) {
        setIfscValidation({
          valid: true,
          bank: data.bank,
          branch: data.branch,
          loading: false
        });
      } else {
        setIfscValidation({
          valid: false,
          error: data.error || 'Invalid IFSC code',
          loading: false
        });
      }
    } catch (err) {
      setIfscValidation({
        valid: false,
        error: 'Failed to validate IFSC',
        loading: false
      });
    }
  };

  // Handle IFSC code change with debounce
  const handleIfscChange = (value: string) => {
    const uppercaseValue = value.toUpperCase();
    setIfscCode(uppercaseValue);
    
    // Reset validation when typing
    if (uppercaseValue.length < 11) {
      setIfscValidation({ valid: null, loading: false });
    } else if (uppercaseValue.length === 11) {
      validateIfsc(uppercaseValue);
    }
  };

  // Validate account number format
  const handleAccountNumberChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '');
    setAccountNumber(digitsOnly);
    
    if (digitsOnly.length > 0 && (digitsOnly.length < 9 || digitsOnly.length > 18)) {
      setAccountNumberError('Account number must be 9-18 digits');
    } else {
      setAccountNumberError('');
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payoutAmount);
    
    if (amount < minPayoutAmount) {
      toast({
        title: 'Invalid Amount',
        description: `Minimum payout amount is ${currencySymbol}${minPayoutAmount}.`,
        variant: 'destructive',
      });
      return;
    }

    if (amount > withdrawableBalance) {
      toast({
        title: 'Insufficient Balance',
        description: `You can withdraw up to ${currencySymbol}${withdrawableBalance.toFixed(2)} right now.`,
        variant: 'destructive',
      });
      return;
    }

    const paymentDetails: Record<string, string> = {};
    if (paymentMethod === 'bank_transfer') {
      if (!accountName || !accountNumber || !confirmAccountNumber || !ifscCode) {
        toast({
          title: 'Missing Details',
          description: 'Please fill in all bank details.',
          variant: 'destructive',
        });
        return;
      }
      if (accountNumber !== confirmAccountNumber) {
        toast({
          title: 'Account Number Mismatch',
          description: 'Account numbers do not match.',
          variant: 'destructive',
        });
        return;
      }

      // Validate IFSC code format (4 letters + 0 + 6 alphanumeric)
      const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscPattern.test(ifscCode)) {
        toast({
          title: 'Invalid IFSC Code',
          description: 'IFSC code must be 11 characters: 4 letters, followed by 0, then 6 alphanumeric characters.',
          variant: 'destructive',
        });
        return;
      }

      // Upload bank statement if provided
      let bankStatementUrl = '';
      if (bankStatement && user) {
        setIsUploadingFile(true);
        const fileExt = bankStatement.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payout-documents')
          .upload(fileName, bankStatement);
        
        setIsUploadingFile(false);
        
        if (uploadError) {
          toast({
            title: 'Upload Failed',
            description: 'Failed to upload bank statement. Please try again.',
            variant: 'destructive',
          });
          return;
        }
        
        bankStatementUrl = uploadData.path;
      }

      paymentDetails.account_name = accountName;
      paymentDetails.account_number = accountNumber;
      paymentDetails.ifsc_code = ifscCode;
      paymentDetails.bank_statement_path = bankStatementUrl;
      
      // Save bank details to profile if checkbox is checked
      if (savePaymentDetails && user) {
        const newSavedDetails = {
          ...savedPaymentDetails,
          bank: {
            accountName,
            accountNumber,
            ifscCode,
            bankName: ifscValidation.bank,
            branchName: ifscValidation.branch
          }
        };
        await supabase
          .from('profiles')
          .update({ saved_payment_details: newSavedDetails })
          .eq('user_id', user.id);
        setSavedPaymentDetails(newSavedDetails);
      }
    }

    if (paymentMethod === 'upi') {
      if (!upiId || !validateUpiId(upiId)) {
        toast({
          title: 'Invalid UPI ID',
          description: 'Please enter a valid UPI ID (e.g., name@upi).',
          variant: 'destructive',
        });
        return;
      }
      paymentDetails.upi_id = upiId;
      
      // Save UPI details to profile if checkbox is checked
      if (savePaymentDetails && user) {
        const newSavedDetails = {
          ...savedPaymentDetails,
          upi: { upiId }
        };
        await supabase
          .from('profiles')
          .update({ saved_payment_details: newSavedDetails })
          .eq('user_id', user.id);
        setSavedPaymentDetails(newSavedDetails);
      }
    }

    // Handle USD wallet payout
    if (paymentMethod === 'crypto') {
      if (!cryptoWalletAddress.trim()) {
        toast({
          title: 'Missing Wallet Address',
          description: 'Please enter your wallet address.',
          variant: 'destructive',
        });
        return;
      }
      if (!cryptoWalletConfirmed) {
        toast({
          title: 'Confirmation Required',
          description: 'Please confirm that the wallet address is correct.',
          variant: 'destructive',
        });
        return;
      }

      // Upload crypto attachment if provided
      let cryptoAttachmentUrl = '';
      if (cryptoAttachment && user) {
        setIsUploadingFile(true);
        const fileExt = cryptoAttachment.name.split('.').pop();
        const fileName = `${user.id}/crypto-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payout-documents')
          .upload(fileName, cryptoAttachment);
        
        setIsUploadingFile(false);
        
        if (uploadError) {
          toast({
            title: 'Upload Failed',
            description: 'Failed to upload attachment. Please try again.',
            variant: 'destructive',
          });
          return;
        }
        
        cryptoAttachmentUrl = uploadData.path;
      }

      paymentDetails.wallet_address = cryptoWalletAddress;
      paymentDetails.address_confirmed = 'true';
      if (cryptoAttachmentUrl) {
        paymentDetails.attachment_path = cryptoAttachmentUrl;
      }
      
      // Save crypto wallet to profile if checkbox is checked
      if (savePaymentDetails && user) {
        const newSavedDetails = {
          ...savedPaymentDetails,
          crypto: { walletAddress: cryptoWalletAddress }
        };
        await supabase
          .from('profiles')
          .update({ saved_payment_details: newSavedDetails })
          .eq('user_id', user.id);
        setSavedPaymentDetails(newSavedDetails);
      }
    }

    createPayout({
      amount,
      paymentMethod,
      paymentDetails,
    });

    setIsPayoutDialogOpen(false);
    setPayoutAmount('');
    setAccountName('');
    setAccountNumber('');
    setConfirmAccountNumber('');
    setIfscCode('');
    setBankStatement(null);
    setUpiId('');
    setUpiIdError('');
    setCryptoWalletAddress('');
    setCryptoWalletConfirmed(false);
    setCryptoAttachment(null);
    setSavePaymentDetails(false);
    setUseSavedDetails(false);
    setIfscValidation({ valid: null, loading: false });
  };

  // Handler for payout button - check pending payments first
  const handlePayoutButtonClick = async () => {
    if (isPayoutBlockedByPendingPayments) {
      // Log the blocked attempt for audit
      try {
        await supabase.from('audit_logs').insert({
          action_type: 'payout_blocked_pending_payment',
          entity_type: 'payout_request',
          user_id: user?.id,
          metadata: {
            pending_order_count: pendingPaymentCount,
            attempted_action: 'request_payout',
            block_reason: 'Pending order payments',
          },
        });

        // Send email notification to admin
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'payout_blocked_pending_payment',
            userId: user?.id,
            userName: profile?.name || 'Unknown User',
            userEmail: profile?.email || user?.email || 'Unknown',
            pendingOrderCount: pendingPaymentCount,
          },
        });
      } catch (error) {
        console.error('Failed to log blocked payout attempt:', error);
      }
      
      setShowPendingPaymentPopup(true);
      return;
    }
    
    setIsPayoutDialogOpen(true);
  };

  if (dashboardLoading || payoutsLoading || isLoadingPublicSettings || isLoadingPendingPaymentBlock) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  // Calculate pending payouts (funds on hold until admin approval)
  const onHoldPayouts = payoutRequests.filter(p => p.status === 'pending');
  const totalOnHold = onHoldPayouts.reduce((sum, p) => sum + p.amount, 0);
  const pendingPayouts = onHoldPayouts;
  const totalPendingPayout = totalOnHold;
  
  // Generate PDF receipt for completed payout
  const generatePayoutReceipt = (payout: typeof payoutRequests[0]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYOUT RECEIPT', pageWidth / 2, 25, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(30, 41, 59);
    
    // Receipt details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    let y = 55;
    const leftMargin = 20;
    const rightMargin = pageWidth - 20;
    
    // Receipt ID and Date
    doc.setFont('helvetica', 'bold');
    doc.text('Receipt ID:', leftMargin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(payout.id.substring(0, 8).toUpperCase(), leftMargin + 30, y);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', rightMargin - 60, y);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(payout.processed_at || payout.created_at), 'PPP'), rightMargin - 45, y);
    
    y += 15;
    
    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(leftMargin, y, rightMargin, y);
    y += 15;
    
    // Payout Details Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Payout Details', leftMargin, y);
    y += 10;
    
    doc.setFontSize(11);
    const details = [
      ['Status:', 'COMPLETED'],
      ['Amount:', `${currencySymbol}${payout.amount.toFixed(2)}`],
      ['Payment Method:', payout.payment_method === 'crypto' ? 'USDT' : payout.payment_method.replace(/_/g, ' ').toUpperCase()],
      ['Requested On:', format(new Date(payout.created_at), 'PPP')],
      ['Completed On:', payout.processed_at ? format(new Date(payout.processed_at), 'PPP') : 'N/A'],
    ];
    
    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, leftMargin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, leftMargin + 50, y);
      y += 8;
    });
    
    y += 10;
    
    // Payment Details Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Information', leftMargin, y);
    y += 10;
    
    doc.setFontSize(11);
    Object.entries(payout.payment_details).forEach(([key, value]) => {
      if (value && key !== 'bank_statement_path') {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ':';
        doc.setFont('helvetica', 'bold');
        doc.text(formattedKey, leftMargin, y);
        doc.setFont('helvetica', 'normal');
        // Mask sensitive data
        const maskedValue = key.includes('account_number') 
          ? '****' + String(value).slice(-4)
          : String(value);
        doc.text(maskedValue, leftMargin + 50, y);
        y += 8;
      }
    });
    
    y += 15;
    
    // Divider
    doc.line(leftMargin, y, rightMargin, y);
    y += 15;
    
    // Total Amount Box
    doc.setFillColor(240, 253, 244); // green-50
    doc.roundedRect(leftMargin, y, pageWidth - 40, 25, 3, 3, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74); // green-600
    doc.text('Total Paid:', leftMargin + 10, y + 16);
    doc.setFontSize(18);
    doc.text(`${currencySymbol}${payout.amount.toFixed(2)}`, rightMargin - 10, y + 16, { align: 'right' });
    
    y += 40;
    
    // Footer
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, y, { align: 'center' });
    doc.text(`Generated on ${format(new Date(), 'PPP p')}`, pageWidth / 2, y + 6, { align: 'center' });
    
    // Download the PDF
    doc.save(`payout-receipt-${payout.id.substring(0, 8)}.pdf`);
  };

  // Include payout cancellations in the Transaction History feed (even though they don't change wallet balance)
  const payoutCancellationTransactions = payoutRequests
    .filter(p => p.status === 'cancelled')
    .map(p => {
      const reason = (p.admin_notes || '').startsWith('Cancelled by user:')
        ? (p.admin_notes || '').replace('Cancelled by user:', '').trim()
        : '';

      return {
        id: `payout_cancel_${p.id}`,
        type: 'payout_cancelled',
        amount: 0,
        description: `Payout request cancelled${reason ? `: ${reason}` : ''} (${currencySymbol}${p.amount.toFixed(2)})`,
        created_at: p.processed_at || p.created_at,
      };
    });

  const transactionHistory = [...payoutCancellationTransactions, ...transactions]
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50);

  return (
    <DashboardLayout>
      {/* Pending Payment Block Popup */}
      <PendingPaymentBlockPopup
        isOpen={showPendingPaymentPopup}
        onClose={() => setShowPendingPaymentPopup(false)}
        title={pendingPaymentSettings.title}
        message={pendingPaymentSettings.message}
        showOrderCount={pendingPaymentSettings.showOrderCount}
        showViewOrdersLink={pendingPaymentSettings.showViewOrdersLink}
        pendingCount={pendingPaymentCount}
        pendingOrders={pendingPaymentOrders}
      />

      {/* Pull to Refresh Container */}
      <div
        {...handlers}
        className="touch-pan-y"
      >
        {/* Pull to Refresh Indicator */}
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          threshold={80}
          className="mb-2"
        />

        <div className="space-y-6">
          {/* Payout Disabled Warning */}
          {!payoutEnabled && (
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Payout Requests Disabled</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{payoutDisabledMessage}</p>
              </div>
            </div>
          )}

          {/* Pending Payment Warning (subtle indicator when payout is still allowed but pending payments exist) */}
          {pendingPaymentCount > 0 && pendingPaymentSettings.enabled && (
            <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <Info className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200">Pending Order Payments</p>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  You have {pendingPaymentCount} order{pendingPaymentCount !== 1 ? 's' : ''} with pending payments. 
                  Resolve these before requesting a payout.
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Payments & Wallet</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Manage your earnings and request payouts.
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              {isBlockedByPostpaidDues && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 px-3 py-2 rounded-md text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Clear postpaid dues ({currencySymbol}{postpaidDues.toFixed(2)}) to withdraw</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleRefresh()}
                  disabled={isRefreshing}
                  className="h-10 w-10 sm:h-9 sm:w-9 shrink-0"
                  title="Refresh"
                >
                  <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                </Button>
                <Button 
                  className="gap-2 h-10 sm:h-9 px-4 sm:px-3 text-sm min-w-[120px] touch-manipulation" 
                  disabled={!canRequestPayout}
                  onClick={handlePayoutButtonClick}
                >
                  <Send className="w-4 h-4" />
                  Request Payout
                </Button>
              </div>
            </div>
            <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
              <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <form onSubmit={handleRequestPayout}>
                  <DialogHeader className="space-y-1 sm:space-y-2">
                    <DialogTitle className="text-base sm:text-lg">Request Payout</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                      Withdraw your earnings to your bank account. Minimum: {currencySymbol}{minPayoutAmount}
                    </DialogDescription>
                  </DialogHeader>
                    <div className="py-3 sm:py-4 space-y-3 sm:space-y-4">
                      <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Wallet Balance:</span>
                          <span className="font-medium">{currencySymbol}{walletBalance.toFixed(2)}</span>
                        </div>
                        {duesHoldAmount > 0 && (
                          <div className="flex justify-between items-center text-amber-600">
                            <span className="text-sm flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Postpaid Dues Hold:
                            </span>
                            <span className="font-medium">-{currencySymbol}{duesHoldAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {pendingHold > 0 && (
                          <div className="flex justify-between items-center text-muted-foreground">
                            <span className="text-sm">Pending Payouts:</span>
                            <span className="font-medium">-{currencySymbol}{pendingHold.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="border-t pt-2 flex justify-between items-center">
                          <span className="text-sm font-medium">Available for Payout:</span>
                          <span className="font-bold text-base sm:text-lg text-primary">{currencySymbol}{withdrawableBalance.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="grid gap-1.5 sm:gap-2">
                        <Label htmlFor="payout-amount" className="text-xs sm:text-sm">Amount ({currencySymbol})</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="payout-amount"
                            type="number"
                            step="0.01"
                            min={minPayoutAmount}
                            max={withdrawableBalance}
                            value={payoutAmount}
                            onChange={(e) => setPayoutAmount(e.target.value)}
                            placeholder={minPayoutAmount.toString()}
                            className="pl-10 h-10 sm:h-9"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {[500, 1000, 2500].filter(v => v <= withdrawableBalance).map(preset => (
                            <Button
                              key={preset}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPayoutAmount(preset.toString())}
                              className="h-9 sm:h-8 px-3 sm:px-2 text-xs sm:text-sm touch-manipulation"
                            >
                              {currencySymbol}{preset}
                            </Button>
                          ))}
                          <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPayoutAmount(withdrawableBalance.toString())}
                        >
                          Max
                        </Button>
                      </div>
                    </div>

                  <div className="grid gap-2">
                    <Label>Payment Method</Label>
                    {availablePaymentMethods.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No payment methods available. Please contact admin.</p>
                    ) : (
                      <Select value={paymentMethod} onValueChange={(v) => {
                        setPaymentMethod(v);
                        setUseSavedDetails(false);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePaymentMethods.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Use saved details option */}
                  {((paymentMethod === 'bank_transfer' && savedPaymentDetails?.bank) ||
                    (paymentMethod === 'upi' && savedPaymentDetails?.upi) ||
                    (paymentMethod === 'crypto' && savedPaymentDetails?.crypto)) && (
                    <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <Checkbox
                        id="use-saved"
                        checked={useSavedDetails}
                        onCheckedChange={(checked) => setUseSavedDetails(checked === true)}
                      />
                      <Label htmlFor="use-saved" className="text-sm cursor-pointer flex-1">
                        Use saved {paymentMethod === 'bank_transfer' ? 'bank' : paymentMethod === 'upi' ? 'UPI' : 'wallet'} details
                        {paymentMethod === 'bank_transfer' && savedPaymentDetails?.bank && (
                          <span className="text-muted-foreground ml-1">
                            (****{savedPaymentDetails.bank.accountNumber.slice(-4)})
                          </span>
                        )}
                        {paymentMethod === 'upi' && savedPaymentDetails?.upi && (
                          <span className="text-muted-foreground ml-1">
                            ({savedPaymentDetails.upi.upiId})
                          </span>
                        )}
                        {paymentMethod === 'crypto' && savedPaymentDetails?.crypto && (
                          <span className="text-muted-foreground ml-1">
                            ({savedPaymentDetails.crypto.walletAddress.slice(0, 8)}...)
                          </span>
                        )}
                      </Label>
                    </div>
                  )}

                  {paymentMethod === 'upi' && (
                    <div className="space-y-3">
                      <div className="grid gap-2">
                        <Label htmlFor="upi-id">UPI ID</Label>
                        <Input
                          id="upi-id"
                          value={upiId}
                          onChange={(e) => handleUpiIdChange(e.target.value)}
                          placeholder="Enter UPI ID (e.g., name@upi)"
                          disabled={useSavedDetails}
                          className={cn(
                            upiId && !upiIdError && "border-emerald-500",
                            upiIdError && "border-red-500"
                          )}
                        />
                        {upiIdError && (
                          <p className="text-xs text-red-500">{upiIdError}</p>
                        )}
                        {upiId && !upiIdError && (
                          <p className="text-xs text-emerald-600">✓ Valid UPI ID format</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="save-upi"
                          checked={savePaymentDetails}
                          onCheckedChange={(checked) => setSavePaymentDetails(checked === true)}
                          disabled={useSavedDetails}
                        />
                        <Label htmlFor="save-upi" className="text-sm cursor-pointer">
                          <Save className="w-3 h-3 inline mr-1" />
                          Save UPI ID for future payouts
                        </Label>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'bank_transfer' && (
                    <div className="space-y-3">
                      <div className="grid gap-2">
                        <Label htmlFor="account-name">Account Holder Name</Label>
                        <Input
                          id="account-name"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          placeholder="Enter account holder name"
                          disabled={useSavedDetails}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="account-number">Account Number</Label>
                        <Input
                          id="account-number"
                          value={accountNumber}
                          onChange={(e) => handleAccountNumberChange(e.target.value)}
                          placeholder="Enter account number (9-18 digits)"
                          maxLength={18}
                          disabled={useSavedDetails}
                        />
                        {accountNumberError && (
                          <p className="text-xs text-red-500">{accountNumberError}</p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="confirm-account-number">Confirm Account Number</Label>
                        <Input
                          id="confirm-account-number"
                          value={confirmAccountNumber}
                          onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="Re-enter account number"
                          maxLength={18}
                          disabled={useSavedDetails}
                        />
                        {confirmAccountNumber && accountNumber !== confirmAccountNumber && (
                          <p className="text-xs text-red-500">Account numbers do not match</p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ifsc-code">IFSC Code</Label>
                        <div className="relative">
                          <Input
                            id="ifsc-code"
                            value={ifscCode}
                            onChange={(e) => handleIfscChange(e.target.value)}
                            placeholder="Enter IFSC code (e.g., SBIN0001234)"
                            maxLength={11}
                            disabled={useSavedDetails}
                            className={cn(
                              ifscValidation.valid === true && "border-emerald-500 focus-visible:ring-emerald-500",
                              ifscValidation.valid === false && "border-red-500 focus-visible:ring-red-500"
                            )}
                          />
                          {ifscValidation.loading && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                          {ifscValidation.valid === true && !ifscValidation.loading && (
                            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                          )}
                          {ifscValidation.valid === false && !ifscValidation.loading && (
                            <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                          )}
                        </div>
                        {ifscValidation.valid === true && ifscValidation.bank && (
                          <p className="text-xs text-emerald-600">
                            ✓ {ifscValidation.bank} - {ifscValidation.branch}
                          </p>
                        )}
                        {ifscValidation.valid === false && ifscValidation.error && (
                          <p className="text-xs text-red-500">{ifscValidation.error}</p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="bank-statement">Passbook Or 3 Months Bank Statement</Label>
                        <Input
                          id="bank-statement"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setBankStatement(e.target.files?.[0] || null)}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground">Upload PDF or image (optional)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="save-bank"
                          checked={savePaymentDetails}
                          onCheckedChange={(checked) => setSavePaymentDetails(checked === true)}
                          disabled={useSavedDetails}
                        />
                        <Label htmlFor="save-bank" className="text-sm cursor-pointer">
                          <Save className="w-3 h-3 inline mr-1" />
                          Save bank details for future payouts
                        </Label>
                      </div>
                    </div>
                  )}

                  {/* USDT Wallet fields */}
                  {paymentMethod === 'crypto' && (
                    <div className="space-y-3">
                      <div className="grid gap-2">
                        <Label htmlFor="crypto-wallet">USDT Wallet ID / Address <span className="text-red-500">*</span></Label>
                        <Input
                          id="crypto-wallet"
                          value={cryptoWalletAddress}
                          onChange={(e) => setCryptoWalletAddress(e.target.value)}
                          placeholder="Enter your wallet address (e.g., TRC20, ERC20)"
                          disabled={useSavedDetails}
                          className={cn(cryptoWalletAddress && "border-emerald-500")}
                        />
                        {!cryptoWalletAddress && (
                          <p className="text-xs text-muted-foreground">Enter your USDT wallet address for receiving funds</p>
                        )}
                      </div>
                      
                      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <Checkbox
                          id="crypto-confirm"
                          checked={cryptoWalletConfirmed}
                          onCheckedChange={(checked) => setCryptoWalletConfirmed(checked === true)}
                          className="mt-0.5"
                        />
                        <Label htmlFor="crypto-confirm" className="text-sm cursor-pointer leading-tight">
                          <span className="font-medium text-amber-800 dark:text-amber-200">
                            I confirm that the wallet address entered is correct.
                          </span>
                          <span className="block text-xs text-amber-700 dark:text-amber-300 mt-1">
                            Payments sent to the wrong address cannot be recovered.
                          </span>
                        </Label>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="crypto-attachment">Upload Supporting Document (optional)</Label>
                        <Input
                          id="crypto-attachment"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setCryptoAttachment(e.target.files?.[0] || null)}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground">Upload PDF or image if needed for verification</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="save-crypto"
                          checked={savePaymentDetails}
                          onCheckedChange={(checked) => setSavePaymentDetails(checked === true)}
                          disabled={useSavedDetails}
                        />
                        <Label htmlFor="save-crypto" className="text-sm cursor-pointer">
                          <Save className="w-3 h-3 inline mr-1" />
                          Save wallet address for future payouts
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsPayoutDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={
                      isCreatingPayout || 
                      isUploadingFile || 
                      !paymentMethod ||
                      (paymentMethod === 'crypto' && (!cryptoWalletAddress || !cryptoWalletConfirmed))
                    } 
                    className="gap-2"
                  >
                    {(isCreatingPayout || isUploadingFile) && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Send className="w-4 h-4" />
                    {isUploadingFile ? 'Uploading...' : 'Request Payout'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Wallet Balance Card - Enhanced with Trading theme orange glow */}
        <div className="dashboard-card trading-glow wallet-glow-pulse bg-gradient-to-br from-card to-muted/50 border-primary/20 relative overflow-hidden">
          {/* Animated glow overlay for Trading theme */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 trading:opacity-100 pointer-events-none" />
          <div className="flex flex-col gap-6 relative z-10">
            {/* Main Balance Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Available Balance</p>
                  <p className="text-4xl font-bold text-foreground">{currencySymbol}{availableBalance.toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 md:gap-6">
                <div className="text-center">
                  <p className="text-xl md:text-2xl font-bold text-emerald-500">{currencySymbol}{totalProfit.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Total Profit</p>
                </div>
                <div className="text-center">
                  <p className="text-xl md:text-2xl font-bold text-amber-500">{currencySymbol}{totalPendingPayout.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Pending Payouts</p>
                </div>
                <div className="text-center">
                  <p className="text-xl md:text-2xl font-bold text-foreground">{pendingPayouts.length}</p>
                  <p className="text-xs text-muted-foreground">Pending Requests</p>
                </div>
              </div>
            </div>
            
            {/* Balance Breakdown */}
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-3 font-medium">Balance Breakdown</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                  <p className="text-muted-foreground text-xs mb-1">Total Wallet</p>
                  <p className="font-semibold text-foreground">{currencySymbol}{walletBalance.toFixed(2)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                  <p className="text-muted-foreground text-xs mb-1">On Hold (Pending)</p>
                  <p className="font-semibold text-amber-500">-{currencySymbol}{totalOnHold.toFixed(2)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                  <p className="text-muted-foreground text-xs mb-1">Withdrawable</p>
                  <p className="font-semibold text-emerald-500">{currencySymbol}{withdrawableBalance.toFixed(2)}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                  <p className="text-muted-foreground text-xs mb-1">Minimum Payout</p>
                  <p className="font-semibold text-primary">{currencySymbol}{minPayoutAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isKYCApproved && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-700">
            KYC verification is required to request payouts. Please complete your KYC verification first.
          </div>
        )}

        {isKYCApproved && withdrawableBalance < minPayoutAmount && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-700">
            You need at least {currencySymbol}{minPayoutAmount} withdrawable to request a payout. Withdrawable: {currencySymbol}{withdrawableBalance.toFixed(2)}
          </div>
        )}

        {/* Payout Requests - Moved to top */}
        {payoutRequests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Payout Requests</h2>
            <div className="dashboard-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutRequests.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(payout.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {currencySymbol}{payout.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {payout.payment_method === 'crypto' ? 'USDT' : payout.payment_method.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1", statusColors[payout.status])}>
                          {statusIcons[payout.status]}
                          {statusLabels[payout.status] || payout.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          {payout.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPayoutToCancel({ id: payout.id, amount: payout.amount });
                                setCancelDialogOpen(true);
                              }}
                              disabled={isCancellingPayout}
                              className="gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-9 sm:h-8 px-2 sm:px-3 touch-manipulation"
                            >
                              {isCancellingPayout ? (
                                <Loader2 className="w-3.5 h-3.5 sm:w-3 sm:h-3 animate-spin" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                              )}
                              <span className="hidden sm:inline">Cancel</span>
                            </Button>
                          )}
                          {payout.status === 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generatePayoutReceipt(payout)}
                              className="gap-1 text-xs h-9 sm:h-8 px-2 sm:px-3 touch-manipulation"
                            >
                              <Download className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                              <span className="hidden sm:inline">Receipt</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Postpaid Credit Panel */}
        <PostpaidCreditPanel />

        {/* Earnings Chart */}
        <EarningsChart orders={orders} currencySymbol={currencySymbol} />

        {/* Commission History */}
        <CommissionHistory />

        {/* Add Funds Section */}
        <AddFundsSection />

        {/* Transaction History */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">Transaction History</h2>
              <p className="text-xs text-muted-foreground sm:hidden mt-0.5">Swipe left for actions</p>
            </div>
            <TransactionExport transactions={transactionHistory} currencySymbol={currencySymbol} />
          </div>
          <div className="dashboard-card divide-y divide-border overflow-hidden">
            {transactionHistory.length === 0 ? (
              <p className="text-center py-6 sm:py-8 text-sm sm:text-base text-muted-foreground">No transactions yet.</p>
            ) : (
              transactionHistory.map((tx, index) => {
                const isNeutral = tx.type === 'payout_cancelled' || tx.amount === 0;
                const isCredit = !isNeutral && tx.amount > 0;

                const swipeActions = [
                  {
                    id: 'copy',
                    icon: <Copy className="w-4 h-4" />,
                    label: 'Copy ID',
                    onClick: () => {
                      navigator.clipboard.writeText(tx.id);
                      toast({
                        title: "Copied!",
                        description: "Transaction ID copied to clipboard",
                      });
                    },
                    className: "bg-slate-600 hover:bg-slate-700",
                  },
                  {
                    id: 'details',
                    icon: <Eye className="w-4 h-4" />,
                    label: 'Details',
                    onClick: () => {
                      toast({
                        title: tx.type.replace(/_/g, ' ').toUpperCase(),
                        description: (
                          <div className="space-y-1 text-sm">
                            <p><strong>ID:</strong> {tx.id.substring(0, 8)}...</p>
                            <p><strong>Amount:</strong> {currencySymbol}{Math.abs(tx.amount).toFixed(2)}</p>
                            <p><strong>Date:</strong> {format(new Date(tx.created_at), 'PPP p')}</p>
                            {tx.description && <p><strong>Note:</strong> {tx.description}</p>}
                          </div>
                        ),
                      });
                    },
                    className: "bg-primary hover:bg-primary/90",
                  },
                ];

                return (
                  <SwipeableRow
                    key={tx.id}
                    actions={swipeActions}
                    actionsWidth={100}
                    className="opacity-0 animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' } as React.CSSProperties}
                  >
                    <div className="flex items-center justify-between py-3 sm:py-4 first:pt-0 last:pb-0 gap-2 px-4 sm:px-0">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div
                          className={cn(
                            "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0",
                            isNeutral ? 'bg-muted' : isCredit ? 'bg-emerald-500/10' : 'bg-red-500/10'
                          )}
                        >
                          {isNeutral ? (
                            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                          ) : isCredit ? (
                            <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-sm sm:text-base truncate">{tx.description || tx.type.replace(/_/g, ' ')}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {format(new Date(tx.created_at), 'MMM dd, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={cn(
                            "font-semibold text-sm sm:text-base",
                            isNeutral ? 'text-muted-foreground' : isCredit ? 'text-emerald-600' : 'text-red-600'
                          )}
                        >
                          {isNeutral ? '' : tx.amount > 0 ? '+' : ''}{currencySymbol}{Math.abs(tx.amount).toFixed(2)}
                        </p>
                        <Badge variant="secondary" className="mt-1 capitalize text-[10px] sm:text-xs">
                          {tx.type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  </SwipeableRow>
                );
              })
            )}
          </div>
        </div>
      </div>
      </div>
      {/* Cancel Payout Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) {
          setPayoutToCancel(null);
          setCancellationReason('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Payout Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this payout request of {currencySymbol}{payoutToCancel?.amount.toFixed(2)}? 
              The funds will be returned to your available balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="cancellation-reason" className="text-sm font-medium">
              Reason for cancellation (optional)
            </Label>
            <textarea
              id="cancellation-reason"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="e.g., Changed payment method, incorrect amount, etc."
              className="mt-2 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              maxLength={500}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {cancellationReason.length}/500 characters
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPayoutToCancel(null);
              setCancellationReason('');
            }}>
              Keep Request
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (payoutToCancel) {
                  cancelPayout({ 
                    payoutId: payoutToCancel.id, 
                    amount: payoutToCancel.amount,
                    reason: cancellationReason.trim() || undefined
                  });
                  setCancelDialogOpen(false);
                  setPayoutToCancel(null);
                  setCancellationReason('');
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancellingPayout ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Payout'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default UserPayments;
