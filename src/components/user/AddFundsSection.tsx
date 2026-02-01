import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, CreditCard, QrCode, Landmark, Copy, Check } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { usePostpaid } from '@/hooks/usePostpaid';
import { useMyPaymentSettings } from '@/hooks/useUserPaymentSettings';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { USDWalletPayment } from './USDWalletPayment';
import { USDTIcon } from '@/components/icons/USDTIcon';
import { triggerPaymentConfetti } from '@/lib/confetti';
import { playPaymentSuccessSound } from '@/lib/notificationSound';

type PaymentMethodId = 'upi' | 'card' | 'bank' | 'usd_wallet';

interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  icon: React.ElementType;
  customIcon?: React.ReactNode;
  iconColor: string;
  iconBgColor: string;
  enabledKey: string;
  messageKey: string;
}

const paymentMethods: PaymentMethod[] = [
  { 
    id: 'upi', 
    name: 'UPI', 
    icon: QrCode, 
    iconColor: 'text-orange-500',
    iconBgColor: 'bg-orange-500/20',
    enabledKey: 'payment_method_upi_enabled', 
    messageKey: 'payment_method_upi_message' 
  },
  { 
    id: 'card', 
    name: 'Card', 
    icon: CreditCard, 
    iconColor: 'text-blue-500',
    iconBgColor: 'bg-blue-500/20',
    enabledKey: 'payment_method_card_enabled', 
    messageKey: 'payment_method_card_message' 
  },
  { 
    id: 'bank', 
    name: 'Bank Transfer', 
    icon: Landmark, 
    iconColor: 'text-purple-500',
    iconBgColor: 'bg-purple-500/20',
    enabledKey: 'payment_method_bank_enabled', 
    messageKey: 'payment_method_bank_message' 
  },
  { 
    id: 'usd_wallet', 
    name: 'USDT Wallet', 
    icon: Wallet, 
    customIcon: <USDTIcon size={20} />, 
    iconColor: 'text-emerald-500',
    iconBgColor: 'bg-emerald-500/20',
    enabledKey: 'payment_method_usd_wallet_enabled', 
    messageKey: 'payment_method_usd_wallet_message' 
  },
];

export const AddFundsSection: React.FC = () => {
  const { settings } = usePlatformSettings();
  const { postpaidStatus } = usePostpaid();
  const { settings: userPaymentSettings, hasCustomSettings } = useMyPaymentSettings();
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId | null>(null);
  const [copiedUpiId, setCopiedUpiId] = useState(false);

  // Helper to get raw setting value
  const getRawValue = (key: string): string => {
    const setting = settings.find(s => s.key === key);
    return setting?.value || '';
  };

  const upiQrUrl = getRawValue('upi_qr_url');
  const upiId = getRawValue('upi_id');

  const handleCopyUpiId = async () => {
    if (!upiId) return;
    try {
      await navigator.clipboard.writeText(upiId);
      setCopiedUpiId(true);
      toast({
        title: 'Copied!',
        description: 'UPI ID copied to clipboard.',
      });
      setTimeout(() => setCopiedUpiId(false), 2000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the UPI ID manually.',
        variant: 'destructive',
      });
    }
  };

  // Per-user payment method settings - only apply if admin has manually configured them
  const userMethodsEnabled = userPaymentSettings?.enabled_methods || {
    upi: true,
    wallet: true,
    bank_transfer: true,
    usd_wallet: true,
  };

  const methodsConfig = useMemo(() => {
    return paymentMethods.map(method => {
      // Check global setting first
      const globalEnabled = getRawValue(method.enabledKey) === 'true';
      
      // Map method id to user settings key
      const userSettingsKey = method.id === 'bank' ? 'bank_transfer' : method.id;
      // Only apply user restrictions if admin has manually set custom settings for this user
      const userEnabled = !hasCustomSettings || userMethodsEnabled[userSettingsKey as keyof typeof userMethodsEnabled] !== false;
      
      // For usd_wallet, also check postpaidStatus
      let enabled = globalEnabled && userEnabled;
      if (method.id === 'usd_wallet') {
        enabled = enabled && postpaidStatus?.walletPaymentEnabled !== false;
      }
      
      return {
        ...method,
        enabled,
        message: getRawValue(method.messageKey) || `${method.name} is not available.`,
      };
    });
  }, [settings, postpaidStatus?.walletPaymentEnabled, userMethodsEnabled, hasCustomSettings]);

  const selectedConfig = useMemo(() => {
    return methodsConfig.find(m => m.id === selectedMethod);
  }, [selectedMethod, methodsConfig]);

  const handleSelectMethod = (methodId: PaymentMethodId) => {
    setSelectedMethod(methodId);
  };

  const handlePaymentConfirmed = () => {
    triggerPaymentConfetti();
    playPaymentSuccessSound();
    toast({
      title: 'Payment Notification Sent',
      description: 'Admin has been notified. Your balance will be updated once payment is verified.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Add Funds</CardTitle>
            <CardDescription>
              Fund your wallet to process orders
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Methods Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {methodsConfig.map((method) => (
            <button
              key={method.id}
              onClick={() => handleSelectMethod(method.id)}
              className={cn(
                "group flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer",
                "hover:scale-[1.02] hover:shadow-lg",
                selectedMethod === method.id
                  ? "border-primary bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-md shadow-primary/10"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                "group-hover:scale-110 group-hover:animate-pulse",
                method.iconBgColor,
                selectedMethod === method.id && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
              )}>
                {method.customIcon ? method.customIcon : <method.icon className={cn("w-6 h-6 transition-transform", method.iconColor)} />}
              </div>
              <span className="text-sm font-medium">{method.name}</span>
              <Badge 
                variant={method.enabled ? "default" : "secondary"} 
                className={cn(
                  "text-[10px]",
                  method.enabled 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                    : ""
                )}
              >
                {method.enabled ? 'Available' : 'Not Available'}
              </Badge>
            </button>
          ))}
        </div>

        {/* USDT Wallet Payment with QR Code */}
        {selectedMethod === 'usd_wallet' && (
          <USDWalletPayment
            onPaid={handlePaymentConfirmed}
            showPayButton={true}
          />
        )}

        {/* Other Payment Methods - Show Message Panel */}
        {selectedConfig && selectedMethod !== 'usd_wallet' && (
          <div className={cn(
            "mt-4 p-4 rounded-lg border transition-all duration-200",
            selectedConfig.enabled
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                selectedConfig.enabled
                  ? "bg-emerald-100 dark:bg-emerald-900/50"
                  : "bg-amber-100 dark:bg-amber-900/50"
              )}>
                <selectedConfig.icon className={cn(
                  "w-4 h-4",
                  selectedConfig.enabled
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                )} />
              </div>
              <div className="flex-1">
                <h4 className={cn(
                  "font-medium",
                  selectedConfig.enabled
                    ? "text-emerald-800 dark:text-emerald-200"
                    : "text-amber-800 dark:text-amber-200"
                )}>
                  {selectedConfig.name}
                </h4>
                <p className={cn(
                  "text-sm mt-1 whitespace-pre-line",
                  selectedConfig.enabled
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-amber-700 dark:text-amber-300"
                )}>
                  {selectedConfig.message}
                </p>
                
                {/* UPI Section */}
                {selectedMethod === 'upi' && (
                  <>
                    {/* UPI Enabled - Show QR Code and ID */}
                    {selectedConfig.enabled && (upiQrUrl || upiId) && (
                      <div className="mt-4 space-y-4">
                        {/* QR Code */}
                        {upiQrUrl && (
                          <div className="flex flex-col items-center">
                            <div className="p-3 bg-white rounded-xl shadow-md border">
                              <img 
                                src={upiQrUrl} 
                                alt="UPI QR Code" 
                                className="w-40 h-40 object-contain"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                              Scan this QR code with any UPI app to pay
                            </p>
                          </div>
                        )}
                        
                        {/* UPI ID with Copy */}
                        {upiId && (
                          <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg border">
                            <span className="text-sm font-medium text-muted-foreground">UPI ID:</span>
                            <code className="font-mono text-sm bg-background px-2 py-1 rounded border">
                              {upiId}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCopyUpiId}
                              className="h-8 px-2"
                            >
                              {copiedUpiId ? (
                                <Check className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* UPI Enabled but no QR/ID configured */}
                    {selectedConfig.enabled && !upiQrUrl && !upiId && (
                      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                            <QrCode className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <h5 className="font-medium text-amber-800 dark:text-amber-200">
                              UPI Details Not Configured
                            </h5>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                              UPI payment is enabled but payment details are not yet configured. Please contact support.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Initial state - no method selected */}
        {!selectedMethod && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/20">
            <p className="text-sm text-muted-foreground text-center">
              Select a payment method above to see details
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
