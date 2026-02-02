import React, { useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useUserPaymentSettings } from '@/hooks/useUserPaymentSettings';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard,
  Wallet,
  Building2,
  QrCode,
  Save,
  Loader2,
  Upload,
  X,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';

interface UserPaymentSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    user_id: string;
    name: string;
    email: string;
  } | null;
}

const paymentMethodsConfig = [
  { id: 'wallet', label: 'Wallet Balance', icon: Wallet, description: 'Pay using wallet balance' },
  { id: 'upi', label: 'UPI', icon: QrCode, description: 'UPI QR code payment' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2, description: 'Direct bank transfer' },
  { id: 'usd_wallet', label: 'USD Wallet (USDT)', icon: CreditCard, description: 'Crypto payment' },
];

export const UserPaymentSettingsPanel: React.FC<UserPaymentSettingsPanelProps> = ({
  open,
  onOpenChange,
  user,
}) => {
  const { toast } = useToast();
  const { settings, isLoading, saveSettings, isSaving } = useUserPaymentSettings(user?.user_id);
  const { settingsMap } = usePlatformSettings();
  
  const [enabledMethods, setEnabledMethods] = useState({
    upi: true,
    wallet: true,
    bank_transfer: true,
    usd_wallet: true,
  });
  const [customUpiId, setCustomUpiId] = useState('');
  const [customUpiQrUrl, setCustomUpiQrUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safe parser for enabled_methods to prevent crashes from malformed data
  const parseEnabledMethods = (data: unknown) => {
    const defaults = {
      upi: true,
      wallet: true,
      bank_transfer: true,
      usd_wallet: true,
    };
    if (!data || typeof data !== 'object') {
      return defaults;
    }
    const obj = data as Record<string, unknown>;
    return {
      upi: typeof obj.upi === 'boolean' ? obj.upi : true,
      wallet: typeof obj.wallet === 'boolean' ? obj.wallet : true,
      bank_transfer: typeof obj.bank_transfer === 'boolean' ? obj.bank_transfer : true,
      usd_wallet: typeof obj.usd_wallet === 'boolean' ? obj.usd_wallet : true,
    };
  };

  // Load settings when user changes
  useEffect(() => {
    if (settings) {
      setEnabledMethods(parseEnabledMethods(settings.enabled_methods));
      setCustomUpiId(settings.custom_upi_id || '');
      setCustomUpiQrUrl(settings.custom_upi_qr_url || '');
      setNotes(settings.notes || '');
    }
  }, [settings]);

  // Reset when panel closes
  useEffect(() => {
    if (!open) {
      setEnabledMethods({ upi: true, wallet: true, bank_transfer: true, usd_wallet: true });
      setCustomUpiId('');
      setCustomUpiQrUrl('');
      setNotes('');
    }
  }, [open]);

  const handleToggle = (methodId: string) => {
    setEnabledMethods(prev => ({
      ...prev,
      [methodId]: !prev[methodId as keyof typeof prev],
    }));
  };

  const handleSave = () => {
    if (!user) return;
    
    saveSettings({
      user_id: user.user_id,
      enabled_methods: enabledMethods,
      custom_upi_id: customUpiId || null,
      custom_upi_qr_url: customUpiQrUrl || null,
      notes: notes || null,
    });
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `user-upi-qr-${user?.user_id}-${Date.now()}.${fileExt}`;
      const filePath = `qr-codes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      setCustomUpiQrUrl(publicUrl);
      toast({
        title: 'QR Code Uploaded',
        description: 'Custom UPI QR code has been uploaded.',
      });
    } catch (error) {
      console.error('QR upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload QR code.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveQr = () => {
    setCustomUpiQrUrl('');
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check global settings
  const globalUpiEnabled = settingsMap.payment_method_upi_enabled !== false;
  const globalBankEnabled = settingsMap.payment_method_bank_enabled !== false;
  const globalWalletEnabled = settingsMap.payment_method_wallet_balance_enabled !== false;
  const globalUsdWalletEnabled = settingsMap.usd_wallet_enabled !== false;

  const isMethodGloballyDisabled = (methodId: string) => {
    switch (methodId) {
      case 'upi': return !globalUpiEnabled;
      case 'bank_transfer': return !globalBankEnabled;
      case 'wallet': return !globalWalletEnabled;
      case 'usd_wallet': return !globalUsdWalletEnabled;
      default: return false;
    }
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Settings
          </SheetTitle>
          <SheetDescription>
            Configure payment methods for <strong>{user.name}</strong>
            <br />
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Payment Methods Toggle */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Enabled Payment Methods</h3>
              <div className="space-y-3">
                {paymentMethodsConfig.map((method) => {
                  const isGloballyDisabled = isMethodGloballyDisabled(method.id);
                  const isEnabled = enabledMethods[method.id as keyof typeof enabledMethods];
                  
                  return (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <method.icon className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{method.label}</span>
                            {isGloballyDisabled && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                Globally Off
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{method.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={isGloballyDisabled ? false : isEnabled}
                        onCheckedChange={() => handleToggle(method.id)}
                        disabled={isGloballyDisabled}
                        className={isGloballyDisabled ? "opacity-50" : ""}
                      />
                    </div>
                  );
                })}
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Payment methods marked "Globally Off" are disabled in platform settings and cannot be enabled for individual users.
                </p>
              </div>
            </div>

            <Separator />

            {/* Custom UPI Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Custom UPI Settings (Optional)</h3>
              <p className="text-xs text-muted-foreground">
                Override global UPI settings for this user. Leave empty to use platform defaults.
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="custom-upi-id">Custom UPI ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-upi-id"
                      value={customUpiId}
                      onChange={(e) => setCustomUpiId(e.target.value)}
                      placeholder="e.g., example@upi"
                    />
                    {customUpiId && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(customUpiId)}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Custom UPI QR Code</Label>
                  {customUpiQrUrl ? (
                    <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                      <img
                        src={customUpiQrUrl}
                        alt="Custom UPI QR"
                        className="w-full h-full object-contain"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={handleRemoveQr}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleQrUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full"
                      >
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        Upload QR Code
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Admin Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes about this user's payment settings..."
                rows={3}
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Payment Settings
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
