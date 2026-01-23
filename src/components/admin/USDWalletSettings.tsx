import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Wallet, Save, Loader2, Check, Upload, X, Image as ImageIcon } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const QR_BUCKET = 'branding';

export const USDWalletSettings: React.FC = () => {
  const { settingsMap, updateSetting, isUpdating } = usePlatformSettings();
  const { toast } = useToast();
  
  const [currencyName, setCurrencyName] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  
  const [saved, setSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrencyName(settingsMap.usd_wallet_currency_name || 'USDT TRC20');
    setCurrencySymbol(settingsMap.usd_wallet_currency_symbol || '$');
    setWalletAddress(settingsMap.usd_wallet_id || '');
    setQrUrl(settingsMap.usd_wallet_qr_url || '');
    setEnabled(settingsMap.usd_wallet_enabled !== false);
  }, [settingsMap]);

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, SVG).',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
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
      const fileName = `usd-wallet-qr-${Date.now()}.${fileExt}`;
      const filePath = `qr-codes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(QR_BUCKET)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(QR_BUCKET)
        .getPublicUrl(filePath);

      setQrUrl(publicUrl);
      toast({
        title: 'QR Code Uploaded',
        description: 'The QR code image has been uploaded successfully.',
      });
    } catch (error) {
      console.error('QR upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload QR code image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveQR = () => {
    setQrUrl('');
  };

  const handleSave = async () => {
    try {
      // Save all settings in sequence
      await updateSetting({ 
        key: 'usd_wallet_currency_name', 
        value: currencyName,
        oldValue: settingsMap.usd_wallet_currency_name 
      });
      await updateSetting({ 
        key: 'usd_wallet_currency_symbol', 
        value: currencySymbol,
        oldValue: settingsMap.usd_wallet_currency_symbol 
      });
      await updateSetting({ 
        key: 'usd_wallet_id', 
        value: walletAddress,
        oldValue: settingsMap.usd_wallet_id 
      });
      await updateSetting({ 
        key: 'usd_wallet_qr_url', 
        value: qrUrl,
        oldValue: settingsMap.usd_wallet_qr_url 
      });
      await updateSetting({ 
        key: 'usd_wallet_enabled', 
        value: enabled ? 'true' : 'false',
        oldValue: settingsMap.usd_wallet_enabled ? 'true' : 'false' 
      });

      setSaved(true);
      toast({
        title: 'USDT Wallet Settings Saved',
        description: 'All wallet settings have been updated successfully.',
      });
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save wallet settings.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>USDT Wallet Payment Settings</CardTitle>
              <CardDescription>
                Configure the crypto/USDT wallet for user payments with QR code support.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="wallet-enabled" className="text-sm">Enabled</Label>
            <Switch
              id="wallet-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Currency Name & Symbol Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency-name">Currency Name</Label>
            <Input
              id="currency-name"
              value={currencyName}
              onChange={(e) => setCurrencyName(e.target.value)}
              placeholder="e.g., USDT TRC20, USD, BTC"
            />
            <p className="text-xs text-muted-foreground">
              Display name shown to users (e.g., "USDT TRC20 deposit address")
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency-symbol">Currency Symbol</Label>
            <Input
              id="currency-symbol"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              placeholder="e.g., $, ₮, ₿"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Symbol displayed next to amounts
            </p>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="space-y-2">
          <Label htmlFor="wallet-address">Wallet Address</Label>
          <Input
            id="wallet-address"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter wallet address (e.g., TTxPi6ni6T3N1CZrK3dtjyqRmMAYiFqn3K)"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            The wallet address users will send payments to. This will be copyable by users.
          </p>
        </div>

        {/* QR Code Upload */}
        <div className="space-y-3">
          <Label>QR Code Image</Label>
          <div className="flex items-start gap-4">
            {/* QR Preview */}
            <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="Wallet QR Code"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
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
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {isUploading ? 'Uploading...' : 'Upload QR Code'}
              </Button>
              {qrUrl && (
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
                Upload a PNG, JPG, or SVG (max 2MB). This QR code will be shown to users.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isUpdating || isUploading}
          className="w-full"
        >
          {isUpdating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saved ? 'Saved!' : 'Save Wallet Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};
