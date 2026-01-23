import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Smartphone, CreditCard, Building, Wallet, Save, Loader2, Check, Upload, X, Image as ImageIcon } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const QR_BUCKET = 'branding';

interface PaymentMethodConfig {
  id: string;
  name: string;
  icon: React.ElementType;
  enabledKey: string;
  messageKey: string;
}

const paymentMethods: PaymentMethodConfig[] = [
  { id: 'wallet_balance', name: 'Wallet Balance', icon: Wallet, enabledKey: 'payment_method_wallet_balance_enabled', messageKey: 'payment_method_wallet_balance_message' },
  { id: 'upi', name: 'UPI', icon: Smartphone, enabledKey: 'payment_method_upi_enabled', messageKey: 'payment_method_upi_message' },
  { id: 'card', name: 'Card', icon: CreditCard, enabledKey: 'payment_method_card_enabled', messageKey: 'payment_method_card_message' },
  { id: 'bank', name: 'Bank Transfer', icon: Building, enabledKey: 'payment_method_bank_enabled', messageKey: 'payment_method_bank_message' },
];

export const PaymentMethodSettings: React.FC = () => {
  const { settingsMap, updateSettingAsync, isUpdating, settings } = usePlatformSettings();
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // USD Wallet specific state
  const [usdWalletEnabled, setUsdWalletEnabled] = useState(true);
  const [usdCurrencyName, setUsdCurrencyName] = useState('USDT TRC20');
  const [usdCurrencySymbol, setUsdCurrencySymbol] = useState('$');
  const [usdWalletAddress, setUsdWalletAddress] = useState('');
  const [usdWalletMessage, setUsdWalletMessage] = useState('');
  const [usdQrUrl, setUsdQrUrl] = useState('');
  const [usdIconUrl, setUsdIconUrl] = useState('');
  const [isUploadingQR, setIsUploadingQR] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  
  // Minimum wallet balance for payment
  const [minWalletBalance, setMinWalletBalance] = useState<number>(0);

  // Helper to get raw setting value
  const getRawValue = (key: string): string => {
    const setting = settings.find(s => s.key === key);
    return setting?.value || '';
  };

  useEffect(() => {
    const newSettings: Record<string, string> = {};
    paymentMethods.forEach(method => {
      newSettings[method.enabledKey] = getRawValue(method.enabledKey) || 'false';
      newSettings[method.messageKey] = getRawValue(method.messageKey) || '';
    });
    setLocalSettings(newSettings);
    
    // USD Wallet settings
    setUsdWalletEnabled(settingsMap.usd_wallet_enabled !== false);
    setUsdCurrencyName(settingsMap.usd_wallet_currency_name || 'USDT TRC20');
    setUsdCurrencySymbol(settingsMap.usd_wallet_currency_symbol || '$');
    setUsdWalletAddress(settingsMap.usd_wallet_id || '');
    setUsdWalletMessage(getRawValue('payment_method_usd_wallet_message') || '');
    setUsdQrUrl(settingsMap.usd_wallet_qr_url || '');
    setUsdIconUrl(settingsMap.usd_wallet_icon_url || '');
    
    // Minimum wallet balance
    setMinWalletBalance(settingsMap.minimum_wallet_balance_for_payment || 0);
  }, [settings, settingsMap]);

  const handleToggle = (key: string) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: prev[key] === 'true' ? 'false' : 'true'
    }));
  };

  const handleInputChange = (key: string, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, SVG).',
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

    setIsUploadingQR(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `usd-wallet-qr-${Date.now()}.${fileExt}`;
      const filePath = `qr-codes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(QR_BUCKET)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(QR_BUCKET)
        .getPublicUrl(filePath);

      setUsdQrUrl(publicUrl);
      toast({
        title: 'QR Code Uploaded',
        description: 'The QR code image has been uploaded.',
      });
    } catch (error) {
      console.error('QR upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload QR code image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingQR(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveQR = () => {
    setUsdQrUrl('');
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, SVG).',
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

    setIsUploadingIcon(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `usd-wallet-icon-${Date.now()}.${fileExt}`;
      const filePath = `icons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(QR_BUCKET)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(QR_BUCKET)
        .getPublicUrl(filePath);

      setUsdIconUrl(publicUrl);
      toast({
        title: 'Icon Uploaded',
        description: 'The wallet icon has been uploaded.',
      });
    } catch (error) {
      console.error('Icon upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload wallet icon.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingIcon(false);
      if (iconInputRef.current) iconInputRef.current.value = '';
    }
  };

  const handleRemoveIcon = () => {
    setUsdIconUrl('');
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Save standard payment methods
      const updatePromises = Object.entries(localSettings).map(([key, value]) => 
        updateSettingAsync({ key, value, oldValue: getRawValue(key) })
      );
      
      // Save USD Wallet settings
      updatePromises.push(
        updateSettingAsync({ key: 'usd_wallet_enabled', value: usdWalletEnabled ? 'true' : 'false', oldValue: settingsMap.usd_wallet_enabled ? 'true' : 'false' }),
        updateSettingAsync({ key: 'usd_wallet_currency_name', value: usdCurrencyName, oldValue: settingsMap.usd_wallet_currency_name }),
        updateSettingAsync({ key: 'usd_wallet_currency_symbol', value: usdCurrencySymbol, oldValue: settingsMap.usd_wallet_currency_symbol }),
        updateSettingAsync({ key: 'usd_wallet_id', value: usdWalletAddress, oldValue: settingsMap.usd_wallet_id }),
        updateSettingAsync({ key: 'usd_wallet_qr_url', value: usdQrUrl, oldValue: settingsMap.usd_wallet_qr_url }),
        updateSettingAsync({ key: 'usd_wallet_icon_url', value: usdIconUrl, oldValue: settingsMap.usd_wallet_icon_url }),
        updateSettingAsync({ key: 'payment_method_usd_wallet_enabled', value: usdWalletEnabled ? 'true' : 'false', oldValue: getRawValue('payment_method_usd_wallet_enabled') }),
        updateSettingAsync({ key: 'payment_method_usd_wallet_message', value: usdWalletMessage, oldValue: getRawValue('payment_method_usd_wallet_message') }),
        // Minimum wallet balance for payment
        updateSettingAsync({ key: 'minimum_wallet_balance_for_payment', value: minWalletBalance.toString(), oldValue: settingsMap.minimum_wallet_balance_for_payment?.toString() || '0' })
      );
      
      await Promise.all(updatePromises);
      setSaved(true);
      toast({
        title: 'Settings Saved',
        description: 'All payment method settings have been updated.',
      });
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Payment Method Settings</CardTitle>
            <CardDescription>
              Configure payment methods and custom messages for users
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Standard Payment Methods */}
        {paymentMethods.map((method) => (
          <div key={method.id} className={`border rounded-lg p-4 space-y-4 ${method.id === 'wallet_balance' ? 'border-blue-500/30 bg-blue-500/5' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${method.id === 'wallet_balance' ? 'bg-blue-500/20' : 'bg-muted'}`}>
                  <method.icon className={`w-5 h-5 ${method.id === 'wallet_balance' ? 'text-blue-600' : ''}`} />
                </div>
                <div>
                  <h4 className="font-medium">{method.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {localSettings[method.enabledKey] === 'true' ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <Switch
                checked={localSettings[method.enabledKey] === 'true'}
                onCheckedChange={() => handleToggle(method.enabledKey)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${method.id}-message`}>Custom Message</Label>
              <Textarea
                id={`${method.id}-message`}
                value={localSettings[method.messageKey] || ''}
                onChange={(e) => handleInputChange(method.messageKey, e.target.value)}
                placeholder={`Message shown when ${method.name} is selected`}
                rows={2}
              />
            </div>
            
            {/* Minimum Wallet Balance - only show for wallet_balance method */}
            {method.id === 'wallet_balance' && (
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="min-wallet-balance">Minimum Wallet Balance Required</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    id="min-wallet-balance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={minWalletBalance}
                    onChange={(e) => setMinWalletBalance(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="max-w-32"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Users must have at least this amount in their wallet to use wallet payments. Set to 0 to disable this requirement.
                </p>
              </div>
            )}
          </div>
        ))}

        {/* USD Wallet - Full Configuration */}
        <div className="border-2 border-emerald-500/30 rounded-lg p-4 space-y-5 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-medium">USDT Wallet / Crypto Payment</h4>
                <p className="text-sm text-muted-foreground">
                  {usdWalletEnabled ? 'Enabled - Users can pay via crypto wallet' : 'Disabled'}
                </p>
              </div>
            </div>
            <Switch
              checked={usdWalletEnabled}
              onCheckedChange={setUsdWalletEnabled}
            />
          </div>

          {/* Currency Name & Symbol */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usd-currency-name">Currency Name</Label>
              <Input
                id="usd-currency-name"
                value={usdCurrencyName}
                onChange={(e) => setUsdCurrencyName(e.target.value)}
                placeholder="e.g., USDT TRC20, BTC, ETH"
              />
              <p className="text-xs text-muted-foreground">
                Displayed to users (e.g., "USDT TRC20 deposit address")
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="usd-currency-symbol">Currency Symbol</Label>
              <Input
                id="usd-currency-symbol"
                value={usdCurrencySymbol}
                onChange={(e) => setUsdCurrencySymbol(e.target.value)}
                placeholder="e.g., $, ₮, ₿"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Symbol shown next to amounts
              </p>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="space-y-2">
            <Label htmlFor="usd-wallet-address">Wallet Address</Label>
            <Input
              id="usd-wallet-address"
              value={usdWalletAddress}
              onChange={(e) => setUsdWalletAddress(e.target.value)}
              placeholder="Enter wallet address (e.g., TTxPi6ni6T3N1CZrK3dtjyqRmMAYiFqn3K)"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Users will copy this address to send payments
            </p>
          </div>

          {/* QR Code Upload */}
          <div className="space-y-3">
            <Label>QR Code Image</Label>
            <div className="flex items-start gap-4">
              {/* QR Preview */}
              <div className="w-28 h-28 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
                {usdQrUrl ? (
                  <img
                    src={usdQrUrl}
                    alt="Wallet QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <span className="text-xs">No QR</span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQRUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingQR}
                  className="w-full"
                  size="sm"
                >
                  {isUploadingQR ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isUploadingQR ? 'Uploading...' : 'Upload QR Code'}
                </Button>
                {usdQrUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveQR}
                    className="w-full text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove QR
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, or SVG (max 2MB)
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Icon Upload */}
          <div className="space-y-3">
            <Label>Wallet Icon</Label>
            <div className="flex items-start gap-4">
              {/* Icon Preview */}
              <div className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
                {usdIconUrl ? (
                  <img
                    src={usdIconUrl}
                    alt="Wallet Icon"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Wallet className="w-5 h-5 mx-auto opacity-50" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIconUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => iconInputRef.current?.click()}
                  disabled={isUploadingIcon}
                  className="w-full"
                  size="sm"
                >
                  {isUploadingIcon ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isUploadingIcon ? 'Uploading...' : 'Upload Icon'}
                </Button>
                {usdIconUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveIcon}
                    className="w-full text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove Icon
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Custom icon shown to users (PNG, JPG, max 2MB)
                </p>
              </div>
            </div>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="usd-wallet-message">Custom Message</Label>
            <Textarea
              id="usd-wallet-message"
              value={usdWalletMessage}
              onChange={(e) => setUsdWalletMessage(e.target.value)}
              placeholder="Message shown when USD Wallet is selected"
              rows={2}
            />
          </div>
        </div>

        <Button
          onClick={handleSaveAll}
          disabled={saving || isUpdating || isUploadingQR || isUploadingIcon}
          className="w-full"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saved ? 'Saved!' : 'Save All Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};
