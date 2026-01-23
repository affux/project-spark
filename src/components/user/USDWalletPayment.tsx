import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, QrCode, ChevronDown, Hash, Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import walletIconDefault from '@/assets/wallet-icon.png';
import { usePlatformSettings, CryptoWallet } from '@/hooks/usePlatformSettings';
import { useCryptoPayments } from '@/hooks/useCryptoPayments';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { z } from 'zod';

// Validation schema for payment amount
const amountSchema = z.string()
  .refine(val => val === '' || /^\d*\.?\d*$/.test(val), { message: 'Invalid number' })
  .refine(val => val === '' || parseFloat(val) >= 0, { message: 'Must be positive' })
  .refine(val => val === '' || parseFloat(val) <= 1000000, { message: 'Amount too large' });

// Validation for transaction hash
const txHashSchema = z.string()
  .refine(val => val === '' || /^[a-fA-F0-9]{10,}$/.test(val), { message: 'Invalid transaction hash format' });

interface USDWalletPaymentProps {
  onPaid?: (paymentInfo?: { wallet: string; amount: string; currency: string; transactionHash?: string }) => void;
  showPayButton?: boolean;
  className?: string;
  orderAmount?: number;
  orderId?: string;
}

export const USDWalletPayment: React.FC<USDWalletPaymentProps> = ({
  onPaid,
  showPayButton = true,
  className,
  orderAmount,
  orderId,
}) => {
  const { settingsMap } = usePlatformSettings();
  const { toast } = useToast();
  const { createPayment, isCreating } = useCryptoPayments();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<CryptoWallet | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [txHashError, setTxHashError] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get enabled wallets
  const enabledWallets = settingsMap.crypto_wallets?.filter(w => w.enabled) || [];
  
  // Fallback to legacy single wallet if no crypto_wallets configured
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

  const allWallets = legacyWallet ? [legacyWallet] : enabledWallets;

  // Auto-select first wallet and set initial amount
  useEffect(() => {
    if (allWallets.length > 0 && !selectedWallet) {
      setSelectedWallet(allWallets[0]);
    }
  }, [allWallets, selectedWallet]);

  useEffect(() => {
    if (orderAmount && orderAmount > 0) {
      setPaymentAmount(orderAmount.toFixed(2));
    }
  }, [orderAmount]);

  const handleCopyAddress = async () => {
    if (!selectedWallet?.address) return;
    
    try {
      await navigator.clipboard.writeText(selectedWallet.address);
      setCopied(true);
      toast({
        title: 'Address Copied!',
        description: 'Wallet address has been copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Copy Failed',
        description: 'Please manually copy the address.',
        variant: 'destructive',
      });
    }
  };

  const handleAmountChange = (value: string) => {
    // Allow empty or valid number format
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPaymentAmount(value);
      setAmountError('');
      
      // Validate
      const result = amountSchema.safeParse(value);
      if (!result.success && value !== '') {
        setAmountError(result.error.errors[0]?.message || 'Invalid amount');
      }
    }
  };

  const handleTxHashChange = (value: string) => {
    setTransactionHash(value);
    setTxHashError('');
    
    if (value) {
      const result = txHashSchema.safeParse(value);
      if (!result.success) {
        setTxHashError(result.error.errors[0]?.message || 'Invalid hash');
      }
    }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setPaymentProof(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setPaymentProofPreview(previewUrl);
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
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .upload(fileName, paymentProof, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload payment proof');
    }

    const { data: publicUrlData } = supabase.storage
      .from('payment-proofs')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  };

  const handlePaid = async () => {
    if (!selectedWallet) return;

    // Validate amount before proceeding
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount.',
        variant: 'destructive',
      });
      return;
    }

    // Require payment proof
    if (!paymentProof) {
      toast({
        title: 'Payment Proof Required',
        description: 'Please upload a screenshot of your payment as proof.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingProof(true);

    try {
      // Upload payment proof first
      let proofUrl: string | null = null;
      try {
        proofUrl = await uploadPaymentProof();
      } catch (uploadError) {
        toast({
          title: 'Upload Failed',
          description: 'Failed to upload payment proof. Please try again.',
          variant: 'destructive',
        });
        setIsUploadingProof(false);
        return;
      }

      // Create crypto payment record with proof
      await createPayment({
        wallet_name: selectedWallet.name,
        wallet_address: selectedWallet.address,
        amount: parseFloat(paymentAmount),
        currency_symbol: selectedWallet.symbol,
        transaction_hash: transactionHash || undefined,
        order_id: orderId,
        payment_proof_url: proofUrl || undefined,
      });

      if (onPaid) {
        onPaid({
          wallet: selectedWallet.name,
          amount: paymentAmount,
          currency: selectedWallet.symbol,
          transactionHash: transactionHash || undefined,
        });
      }
    } catch (error) {
      // Error already handled by hook
    } finally {
      setIsUploadingProof(false);
    }
  };

  const getDisplayIcon = (wallet: CryptoWallet | null) => {
    return wallet?.iconUrl || walletIconDefault;
  };

  // No wallets available
  if (allWallets.length === 0) {
    return (
      <Card className={cn("bg-muted/50", className)}>
        <CardContent className="py-8 text-center">
          <img src={walletIconDefault} alt="Wallet" className="w-12 h-12 mx-auto opacity-50 mb-3" />
          <p className="text-muted-foreground">
            Crypto payment is currently not available.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Shared wallet content component
  const WalletPaymentContent = ({ wallet }: { wallet: CryptoWallet }) => (
    <>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <div className="flex-1 font-mono text-sm break-all bg-muted/50 px-3 py-2 rounded-md border">
            {wallet.address}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyAddress}
              className="h-9 w-9"
              title="Copy address"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
            {wallet.qrUrl && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowQR(!showQR)}
                className={cn("h-9 w-9", showQR && "bg-primary/10 border-primary")}
                title={showQR ? "Hide QR" : "Show QR"}
              >
                <QrCode className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {wallet.qrUrl && showQR && (
        <div className="flex justify-center py-4">
          <div className="bg-white p-3 rounded-lg shadow-sm border">
            <img
              src={wallet.qrUrl}
              alt={`${wallet.name} QR Code`}
              className="w-48 h-48 object-contain"
            />
          </div>
        </div>
      )}

      {/* Payment Amount Input */}
      <div className="space-y-2">
        <Label htmlFor="payment-amount" className="text-sm font-medium">
          Amount You're Sending
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="payment-amount"
              type="text"
              inputMode="decimal"
              value={paymentAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className={cn(
                "font-mono pr-12",
                amountError && "border-destructive focus-visible:ring-destructive"
              )}
              maxLength={15}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
              {wallet.symbol}
            </span>
          </div>
        </div>
        {amountError && (
          <p className="text-xs text-destructive">{amountError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Enter the exact amount you're sending for verification
        </p>
      </div>

      {/* Transaction Hash Input */}
      <div className="space-y-2">
        <Label htmlFor="tx-hash" className="text-sm font-medium flex items-center gap-1">
          <Hash className="w-4 h-4" />
          Transaction Hash / ID
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="tx-hash"
          type="text"
          value={transactionHash}
          onChange={(e) => handleTxHashChange(e.target.value)}
          placeholder="Enter your blockchain transaction hash..."
          className={cn(
            "font-mono text-sm",
            txHashError && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {txHashError && (
          <p className="text-xs text-destructive">{txHashError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Providing your transaction hash helps speed up verification
        </p>
      </div>

      {/* Payment Proof Upload */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1">
          <ImageIcon className="w-4 h-4" />
          Payment Proof
          <span className="text-destructive">*</span>
        </Label>
        
        {paymentProofPreview ? (
          <div className="relative group">
            <div className="border rounded-lg overflow-hidden bg-muted/30">
              <img 
                src={paymentProofPreview} 
                alt="Payment proof" 
                className="w-full max-h-48 object-contain"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 opacity-80 hover:opacity-100"
              onClick={removePaymentProof}
            >
              <X className="w-4 h-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              {paymentProof?.name}
            </p>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors"
          >
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Click to upload payment screenshot
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG (max 5MB)
            </p>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleProofUpload}
          className="hidden"
        />
        <p className="text-xs text-muted-foreground">
          Upload a screenshot showing your successful payment transaction
        </p>
      </div>

      {showPayButton && onPaid && (
        <Button
          onClick={handlePaid}
          disabled={!paymentAmount || !!amountError || !!txHashError || !paymentProof || isCreating || isUploadingProof}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0 disabled:opacity-50"
        >
          {isCreating || isUploadingProof ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isUploadingProof ? 'Uploading proof...' : 'Submitting...'}
            </>
          ) : (
            <>I have sent {paymentAmount ? `${wallet.symbol}${paymentAmount}` : ''}</>
          )}
        </Button>
      )}
    </>
  );

  // Single wallet - simple view
  if (allWallets.length === 1 && selectedWallet) {
    return (
      <Card className={cn("bg-card border-border overflow-hidden", className)}>
        <CardHeader className="pb-3 bg-gradient-to-r from-muted/50 to-transparent">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <img src={getDisplayIcon(selectedWallet)} alt="Wallet" className="w-5 h-5" />
            {selectedWallet.name} deposit address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <WalletPaymentContent wallet={selectedWallet} />
        </CardContent>
      </Card>
    );
  }

  // Multiple wallets - show selector
  return (
    <Card className={cn("bg-card border-border overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-muted/50 to-transparent">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <img src={getDisplayIcon(selectedWallet)} alt="Wallet" className="w-5 h-5" />
            Crypto Payment
          </span>
          
          {/* Wallet Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {selectedWallet ? (
                  <>
                    {selectedWallet.iconUrl && (
                      <img src={selectedWallet.iconUrl} alt="" className="w-4 h-4" />
                    )}
                    {selectedWallet.name}
                  </>
                ) : (
                  'Select wallet'
                )}
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {allWallets.map((wallet) => (
                <DropdownMenuItem
                  key={wallet.id}
                  onClick={() => setSelectedWallet(wallet)}
                  className="gap-2 cursor-pointer"
                >
                  {wallet.iconUrl ? (
                    <img src={wallet.iconUrl} alt="" className="w-5 h-5" />
                  ) : (
                    <img src={walletIconDefault} alt="" className="w-5 h-5 opacity-50" />
                  )}
                  <span>{wallet.name}</span>
                  {selectedWallet?.id === wallet.id && (
                    <Check className="w-4 h-4 ml-auto text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {selectedWallet ? (
          <>
            <div className="text-sm text-muted-foreground">
              Send {selectedWallet.name} to the address below:
            </div>
            <WalletPaymentContent wallet={selectedWallet} />
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            Select a wallet above to see payment details
          </div>
        )}
      </CardContent>
    </Card>
  );
};
