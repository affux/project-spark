import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  ArrowDownLeft,
  Loader2,
  History,
  Wallet,
  X,
  Coins,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { usePostpaid, PostpaidTransaction } from '@/hooks/usePostpaid';
import { useUserDashboard } from '@/hooks/useUserDashboard';
import { usePlatformSettings, CURRENCY_SYMBOLS, CryptoWallet } from '@/hooks/usePlatformSettings';
import { useCryptoPayments } from '@/hooks/useCryptoPayments';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { USDTIcon } from '@/components/icons/USDTIcon';

const transactionTypeLabels: Record<PostpaidTransaction['transaction_type'], string> = {
  credit_used: 'Credit Used',
  credit_repaid: 'Payment Made',
  adjustment: 'Admin Adjustment',
};

const transactionTypeColors: Record<PostpaidTransaction['transaction_type'], string> = {
  credit_used: 'text-red-500',
  credit_repaid: 'text-emerald-500',
  adjustment: 'text-blue-500',
};

interface PostpaidSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PostpaidSidePanel: React.FC<PostpaidSidePanelProps> = ({ open, onOpenChange }) => {
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [paymentTab, setPaymentTab] = useState<'wallet' | 'usdt'>('wallet');
  const [usdtAmount, setUsdtAmount] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<CryptoWallet | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { postpaidStatus, isLoading, transactions, isLoadingTransactions, repayPostpaid, isRepaying } = usePostpaid();
  const { profile } = useUserDashboard();
  const { settingsMap } = usePlatformSettings();
  const { createPayment, isCreating } = useCryptoPayments();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const currencySymbol = CURRENCY_SYMBOLS[settingsMap.default_currency] || '$';
  const walletBalance = Number(profile?.wallet_balance ?? 0);

  // Get enabled crypto wallets
  const enabledWallets = settingsMap.crypto_wallets?.filter(w => w.enabled) || [];
  const hasLegacyWallet = !enabledWallets.length && settingsMap.usd_wallet_id && String(settingsMap.usd_wallet_enabled) === 'true';
  const legacyWallet: CryptoWallet | null = hasLegacyWallet ? {
    id: 'legacy',
    name: settingsMap.usd_wallet_currency_name || 'USDT TRC20',
    symbol: settingsMap.usd_wallet_currency_symbol || '$',
    address: settingsMap.usd_wallet_id,
    iconUrl: settingsMap.usd_wallet_icon_url || '',
    qrUrl: settingsMap.usd_wallet_qr_url || '',
    enabled: true,
  } : null;
  const allCryptoWallets = legacyWallet ? [legacyWallet] : enabledWallets;
  const hasUsdtOption = allCryptoWallets.length > 0;

  // Auto-select first wallet when dialog opens
  React.useEffect(() => {
    if (isPayDialogOpen && allCryptoWallets.length > 0 && !selectedWallet) {
      setSelectedWallet(allCryptoWallets[0]);
    }
  }, [isPayDialogOpen, allCryptoWallets, selectedWallet]);

  const handlePayNow = () => {
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (amount > walletBalance) return;
    if (!postpaidStatus?.outstandingDues || amount > postpaidStatus.outstandingDues) return;

    repayPostpaid({ amount });
    setIsPayDialogOpen(false);
    setPayAmount('');
  };

  const handlePayFullDues = () => {
    if (!postpaidStatus?.outstandingDues) return;
    if (postpaidStatus.outstandingDues > walletBalance) {
      setPayAmount(walletBalance.toFixed(2));
    } else {
      setPayAmount(postpaidStatus.outstandingDues.toFixed(2));
    }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setPaymentProof(file);
    setPaymentProofPreview(URL.createObjectURL(file));
  };

  const removePaymentProof = () => {
    setPaymentProof(null);
    if (paymentProofPreview) {
      URL.revokeObjectURL(paymentProofPreview);
      setPaymentProofPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadPaymentProof = async (): Promise<string | null> => {
    if (!paymentProof || !user) return null;

    const fileExt = paymentProof.name.split('.').pop();
    const fileName = `${user.id}/postpaid-proof-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(fileName, paymentProof);

    if (uploadError) {
      console.error('Proof upload error:', uploadError);
      throw new Error('Failed to upload payment proof');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('payment-proofs')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleUsdtPayment = async () => {
    if (!selectedWallet || !usdtAmount || parseFloat(usdtAmount) <= 0) return;

    // Require payment proof
    if (!paymentProof) {
      toast({
        title: "Payment proof required",
        description: "Please upload a screenshot of your payment",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingProof(true);
    try {
      // Upload proof first
      const proofUrl = await uploadPaymentProof();
      
      if (!proofUrl) {
        toast({
          title: "Upload failed",
          description: "Failed to upload payment proof. Please try again.",
          variant: "destructive",
        });
        return;
      }

      await createPayment({
        wallet_name: selectedWallet.name,
        wallet_address: selectedWallet.address,
        amount: parseFloat(usdtAmount),
        currency_symbol: selectedWallet.symbol,
        transaction_hash: transactionHash || undefined,
        payment_purpose: 'postpaid',
        payment_proof_url: proofUrl,
      });

      setIsPayDialogOpen(false);
      setUsdtAmount('');
      setTransactionHash('');
      removePaymentProof();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment failed",
        description: error.message || "Failed to submit payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleOpenPayDialog = () => {
    setPaymentTab('wallet');
    setPayAmount('');
    setUsdtAmount('');
    setTransactionHash('');
    removePaymentProof();
    setIsPayDialogOpen(true);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4 p-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }

    // Check if user has outstanding dues even when postpaid is disabled
    const hasOutstandingDues = (postpaidStatus as { hasOutstandingDues?: boolean })?.hasOutstandingDues || 
      (postpaidStatus?.outstandingDues && postpaidStatus.outstandingDues > 0);
    const isPostpaidDisabledWithDues = !postpaidStatus?.enabled && hasOutstandingDues;

    // Show disabled state only if no outstanding dues
    if (!postpaidStatus?.enabled && !hasOutstandingDues) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-muted-foreground">
          <CreditCard className="h-16 w-16 mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">Postpaid Not Activated</h3>
          <p className="text-sm">Contact admin to enable postpaid credit for your account.</p>
          <p className="text-xs mt-2 opacity-60">Once enabled, you can place orders on credit.</p>
        </div>
      );
    }

    const { creditLimit, usedCredit, availableCredit, outstandingDues, dueCycle } = postpaidStatus;
    const usagePercent = creditLimit > 0 ? (usedCredit / creditLimit) * 100 : 0;
    const hasDues = outstandingDues > 0;

    return (
      <div className="space-y-6 p-1">
        {/* Status Badges */}
        <div className="flex justify-center gap-2 flex-wrap">
          {isPostpaidDisabledWithDues && (
            <Badge 
              variant="outline" 
              className="px-4 py-2 border-red-500/50 text-red-600 bg-red-500/10"
            >
              Postpaid Disabled
            </Badge>
          )}
          <Badge 
            variant="outline" 
            className={cn(
              "px-4 py-2",
              hasDues 
                ? "border-amber-500/50 text-amber-600 bg-amber-500/10" 
                : "border-emerald-500/50 text-emerald-600 bg-emerald-500/10"
            )}
          >
            {hasDues ? (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Dues Pending
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                No Outstanding Dues
              </>
            )}
          </Badge>
        </div>

        {/* Credit Usage */}
        <div className="space-y-3 bg-muted/30 rounded-xl p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Credit Usage</span>
            <span className="font-medium">
              {currencySymbol}{usedCredit.toFixed(2)} / {currencySymbol}{creditLimit.toFixed(2)}
            </span>
          </div>
          <Progress 
            value={usagePercent} 
            className={cn(
              "h-4",
              usagePercent > 80 ? "[&>div]:bg-red-500" : 
              usagePercent > 50 ? "[&>div]:bg-amber-500" : 
              "[&>div]:bg-emerald-500"
            )}
          />
          <p className="text-xs text-muted-foreground text-center">
            {usagePercent.toFixed(0)}% of credit used
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className={cn(
            "rounded-xl p-4 text-center border",
            isPostpaidDisabledWithDues 
              ? "bg-muted/30 border-muted" 
              : "bg-emerald-500/10 border-emerald-500/30"
          )}>
            <DollarSign className={cn(
              "w-6 h-6 mx-auto mb-2",
              isPostpaidDisabledWithDues ? "text-muted-foreground" : "text-emerald-600"
            )} />
            <div className={cn(
              "text-2xl font-bold",
              isPostpaidDisabledWithDues ? "text-muted-foreground" : "text-emerald-600"
            )}>
              {currencySymbol}{availableCredit.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {isPostpaidDisabledWithDues ? "Credit Suspended" : "Available Credit"}
            </div>
          </div>
          
          <div className={cn(
            "rounded-xl p-4 text-center border",
            hasDues 
              ? isPostpaidDisabledWithDues 
                ? "bg-red-500/10 border-red-500/30"
                : "bg-amber-500/10 border-amber-500/30" 
              : "bg-muted/30 border-muted"
          )}>
            <AlertTriangle className={cn(
              "w-6 h-6 mx-auto mb-2",
              hasDues 
                ? isPostpaidDisabledWithDues ? "text-red-600" : "text-amber-600" 
                : "text-muted-foreground"
            )} />
            <div className={cn(
              "text-2xl font-bold",
              hasDues 
                ? isPostpaidDisabledWithDues ? "text-red-600" : "text-amber-600" 
                : "text-muted-foreground"
            )}>
              {currencySymbol}{outstandingDues.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Outstanding Dues</div>
          </div>
        </div>

        {/* Due Cycle Info */}
        {dueCycle && !isPostpaidDisabledWithDues && (
          <div className="flex items-center justify-between text-sm bg-muted/30 rounded-xl px-4 py-3">
            <span className="text-muted-foreground">Due Cycle</span>
            <span className="font-medium">{dueCycle} days</span>
          </div>
        )}

        {/* Warning if has dues */}
        {hasDues && (
          <div className={cn(
            "flex items-start gap-3 border rounded-xl p-4",
            isPostpaidDisabledWithDues 
              ? "bg-red-500/10 border-red-500/30" 
              : "bg-amber-500/10 border-amber-500/30"
          )}>
            <AlertTriangle className={cn(
              "w-5 h-5 shrink-0 mt-0.5",
              isPostpaidDisabledWithDues ? "text-red-600" : "text-amber-600"
            )} />
            <div>
              <p className={cn(
                "font-medium text-sm",
                isPostpaidDisabledWithDues ? "text-red-600" : "text-amber-600"
              )}>
                {isPostpaidDisabledWithDues 
                  ? "Postpaid Disabled - Clear Dues Required" 
                  : "Postpaid Dues Pending"
                }
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                {isPostpaidDisabledWithDues 
                  ? "Your postpaid feature has been disabled. Clear your outstanding dues to request payouts."
                  : "Clear your dues to complete pending orders."
                }
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* Wallet Balance */}
        <div className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Wallet Balance</span>
          </div>
          <span className="font-bold text-emerald-600">
            {currencySymbol}{walletBalance.toFixed(2)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleOpenPayDialog}
            disabled={!hasDues || (walletBalance <= 0 && !hasUsdtOption)}
            className="w-full"
            variant={hasDues ? "default" : "secondary"}
          >
            <ArrowDownLeft className="w-4 h-4 mr-2" />
            Pay Dues Now
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsHistoryDialogOpen(true)}
          >
            <History className="w-4 h-4 mr-2" />
            Transaction History
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Postpaid Credit
            </SheetTitle>
            <SheetDescription>
              Manage your postpaid credit and pay dues
            </SheetDescription>
          </SheetHeader>
          {renderContent()}
        </SheetContent>
      </Sheet>

      {/* Pay Dialog */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-1 sm:space-y-2">
            <DialogTitle className="text-base sm:text-lg">Pay Postpaid Dues</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Choose your payment method to pay off your postpaid dues.
            </DialogDescription>
          </DialogHeader>

          {/* Outstanding Dues Display */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 sm:p-3 text-center">
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Outstanding Dues</div>
            <div className="text-xl sm:text-2xl font-bold text-amber-600">
              {currencySymbol}{postpaidStatus?.outstandingDues?.toFixed(2) || '0.00'}
            </div>
          </div>

          <Tabs value={paymentTab} onValueChange={(v) => setPaymentTab(v as 'wallet' | 'usdt')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
              <TabsTrigger value="wallet" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="truncate">Wallet</span>
              </TabsTrigger>
              <TabsTrigger value="usdt" disabled={!hasUsdtOption} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <USDTIcon size={14} className="sm:hidden" />
                <USDTIcon size={16} className="hidden sm:block" />
                <span>USDT</span>
              </TabsTrigger>
            </TabsList>

            {/* Wallet Balance Tab */}
            <TabsContent value="wallet" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              <div className="bg-muted/50 rounded-lg p-2 sm:p-3">
                <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 flex items-center gap-1">
                  <Wallet className="w-3 h-3" />
                  Available Wallet Balance
                </div>
                <div className="text-base sm:text-lg font-bold text-emerald-600">
                  {currencySymbol}{walletBalance.toFixed(2)}
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="payAmountSide" className="text-xs sm:text-sm">Amount to Pay</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {currencySymbol}
                    </span>
                    <Input
                      id="payAmountSide"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={Math.min(postpaidStatus?.outstandingDues || 0, walletBalance)}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="pl-6 sm:pl-7 h-9 sm:h-10 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePayFullDues}
                    disabled={walletBalance <= 0}
                    className="h-9 sm:h-10 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
                  >
                    Pay Full
                  </Button>
                </div>
                {parseFloat(payAmount) > walletBalance && (
                  <p className="text-[10px] sm:text-xs text-destructive">Insufficient wallet balance</p>
                )}
                {postpaidStatus?.outstandingDues && parseFloat(payAmount) > postpaidStatus.outstandingDues && (
                  <p className="text-[10px] sm:text-xs text-destructive">Amount exceeds outstanding dues</p>
                )}
              </div>

              <Button
                onClick={handlePayNow}
                disabled={
                  isRepaying ||
                  !payAmount ||
                  parseFloat(payAmount) <= 0 ||
                  parseFloat(payAmount) > walletBalance ||
                  (postpaidStatus?.outstandingDues && parseFloat(payAmount) > postpaidStatus.outstandingDues)
                }
                className="w-full h-9 sm:h-10 text-sm"
              >
                {isRepaying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Pay {currencySymbol}{parseFloat(payAmount || '0').toFixed(2)}
              </Button>
            </TabsContent>

            {/* USDT Tab */}
            <TabsContent value="usdt" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              {allCryptoWallets.length > 1 && (
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Select Wallet</Label>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    {allCryptoWallets.map((wallet) => (
                      <Button
                        key={wallet.id}
                        variant={selectedWallet?.id === wallet.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedWallet(wallet)}
                        className="justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                      >
                        {wallet.iconUrl && <img src={wallet.iconUrl} alt="" className="w-3 h-3 sm:w-4 sm:h-4" />}
                        <span className="truncate">{wallet.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {selectedWallet && (
                <>
                  <div className="space-y-1 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Send to this address</Label>
                    <div className="font-mono text-[10px] sm:text-xs break-all bg-muted/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md border">
                      {selectedWallet.address}
                    </div>
                  </div>

                  {selectedWallet.qrUrl && (
                    <div className="flex justify-center">
                      <div className="bg-white p-1.5 sm:p-2 rounded-lg border">
                        <img src={selectedWallet.qrUrl} alt="QR Code" className="w-24 h-24 sm:w-32 sm:h-32" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="usdtAmountSide" className="text-xs sm:text-sm">Amount Sent ({selectedWallet.symbol})</Label>
                    <Input
                      id="usdtAmountSide"
                      type="number"
                      step="0.01"
                      value={usdtAmount}
                      onChange={(e) => setUsdtAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="txHashSide" className="text-xs sm:text-sm">Transaction Hash (optional)</Label>
                    <Input
                      id="txHashSide"
                      value={transactionHash}
                      onChange={(e) => setTransactionHash(e.target.value)}
                      placeholder="Enter transaction hash..."
                      className="font-mono text-[10px] sm:text-xs h-9 sm:h-10"
                    />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Provide your transaction hash for faster verification
                    </p>
                  </div>

                  {/* Payment Proof Upload */}
                  <div className="space-y-1 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Payment Proof <span className="text-destructive">*</span></Label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleProofUpload}
                      className="hidden"
                    />
                    {paymentProofPreview ? (
                      <div className="relative border rounded-lg p-1.5 sm:p-2 bg-muted/30">
                        <img
                          src={paymentProofPreview}
                          alt="Payment proof"
                          className="w-full max-h-24 sm:max-h-32 object-contain rounded"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 h-5 w-5 sm:h-6 sm:w-6"
                          onClick={removePaymentProof}
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full h-16 sm:h-20 border-dashed flex flex-col gap-0.5 sm:gap-1"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          Upload payment screenshot
                        </span>
                      </Button>
                    )}
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Required: Upload a screenshot of your completed payment
                    </p>
                  </div>

                  <Button
                    onClick={handleUsdtPayment}
                    disabled={isCreating || isUploadingProof || !usdtAmount || parseFloat(usdtAmount) <= 0 || !paymentProof}
                    className="w-full h-9 sm:h-10 text-sm bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
                  >
                    {(isCreating || isUploadingProof) ? (
                      <>
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                        <span className="text-xs sm:text-sm">{isUploadingProof ? 'Uploading...' : 'Submitting...'}</span>
                      </>
                    ) : (
                      <span className="text-xs sm:text-sm">I have sent {usdtAmount ? `${selectedWallet.symbol}${usdtAmount}` : ''}</span>
                    )}
                  </Button>

                  <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                    Your payment will be verified by admin and dues will be cleared after confirmation.
                  </p>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Postpaid Transaction History</DialogTitle>
            <DialogDescription>
              View all your postpaid credit transactions
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-auto">
            {isLoadingTransactions ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs">
                        {format(new Date(tx.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {transactionTypeLabels[tx.transaction_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {tx.description || '-'}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        transactionTypeColors[tx.transaction_type]
                      )}>
                        {tx.transaction_type === 'credit_repaid' ? '-' : '+'}
                        {currencySymbol}{tx.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
